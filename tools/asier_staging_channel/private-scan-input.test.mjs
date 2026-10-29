import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,readFile,chmod,link,symlink,rename,rm,lstat,readdir,realpath} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {openPrivateScanInputV1,isPrivateScanInputV1} from './private-scan-input.mjs'
import {scanPrivateHistoricalLiteralsV1,scanSavedOciLayersV1,historicalLiteralDescriptorsV1} from './scan-historical-literals.mjs'

const linux={skip:process.platform!=='linux'?'Linux descriptor/private-mode contract requires Linux':false}
const names=[...new Set(historicalLiteralDescriptorsV1.map(d=>d.blob))]
const synthetic=Buffer.from('SYNTHETIC_PRIVATE_TRANSFER_ONLY')
async function fixture(t){
 const parent=await realpath(await mkdtemp(join(tmpdir(),'crm-private-input-synthetic-')))
 t.after(()=>rm(parent,{force:true,recursive:true}))
 const history=join(parent,'transfer'),image=join(parent,'image')
 await mkdir(history,{mode:0o700});await mkdir(image,{mode:0o700})
 for(const name of names)await writeFile(join(history,name),synthetic,{mode:0o600})
 return{parent,history,image,open:()=>openPrivateScanInputV1(history,{historyNames:names})}
}

test('private intake rejects caller flags and unconsented transfer without reading a port',async()=>{
 const result=await scanPrivateHistoricalLiteralsV1({layout:'/not-opened',historyDirectory:'/not-opened-either',verified:true,readHistoricalBlob:()=>assert.fail('port must not run')})
 assert.equal(result.result,'BLOCKED');assert.equal(result.cleanup,'NOT_STARTED');assert.equal(result.input_boundary,'NOT_VERIFIED')
 assert.equal(isPrivateScanInputV1({verified:true}),false)
 for(const [layout,historyDirectory] of [['/input','/input'],['/input','/input/transfer'],['/transfer/image','/transfer']]){
  const blocked=await scanPrivateHistoricalLiteralsV1({layout,historyDirectory,consumeHistoryDirectory:true})
  assert.equal(blocked.result,'BLOCKED');assert.equal(blocked.cleanup,'NOT_STARTED')
 }
})
test('unavailable private input or unsupported host fails closed without raw OS diagnostics',async()=>{
 await assert.rejects(openPrivateScanInputV1('/not-opened'),/^Error: PRIVATE_INPUT_BLOCKED$/)
})
test('Linux exact three-file transfer is pinned, read, consumed and closed',linux,async t=>{
 const f=await fixture(t),s=await f.open();assert.equal(isPrivateScanInputV1(s),true)
 try{const b=await s.read(names[0],1024);assert.deepEqual(b,synthetic);b.fill(0);assert.equal(await s.verify(),true);assert.equal(await s.consumeHistory(),true)}finally{await s.close()}
 await assert.rejects(lstat(f.history),{code:'ENOENT'});await assert.rejects(s.read(names[0],1024))
})
test('Linux directory and file permissions, symlinks and hardlinks cannot qualify',linux,async t=>{
 for(const kind of ['root-mode','file-mode','symlink','hardlink']){
  const f=await fixture(t),file=join(f.history,names[0])
  if(kind==='root-mode')await chmod(f.history,0o755)
  if(kind==='file-mode')await chmod(file,0o640)
  if(kind==='symlink'){await rm(file);await symlink(join(f.history,names[1]),file)}
  if(kind==='hardlink'){await rm(file);await link(join(f.history,names[1]),file)}
  await assert.rejects(f.open());assert.equal((await readdir(f.history)).length,3)
 }
})
test('Linux root and intermediate symlinks are rejected',linux,async t=>{
 const f=await fixture(t),alias=join(f.parent,'alias');await symlink(f.history,alias)
 await assert.rejects(openPrivateScanInputV1(alias,{historyNames:names}))
 const outer=join(f.parent,'outer');await symlink(f.parent,outer)
 await assert.rejects(openPrivateScanInputV1(join(outer,'transfer'),{historyNames:names}))
})
test('Linux renamed ancestor cannot redirect a retained descriptor read',linux,async t=>{
 const f=await fixture(t),s=await f.open(),moved=f.parent+'-moved'
 t.after(()=>rm(moved,{force:true,recursive:true}))
 try{
  await rename(f.parent,moved);await mkdir(f.parent,{mode:0o700});await mkdir(f.history,{mode:0o700})
  await writeFile(join(f.history,names[0]),Buffer.from('FOREIGN_REPLACEMENT'),{mode:0o600})
  const b=await s.read(names[0],1024);assert.deepEqual(b,synthetic);b.fill(0)
  await assert.rejects(s.consumeHistory());assert.equal((await readFile(join(f.history,names[0]))).toString(),'FOREIGN_REPLACEMENT')
 }finally{await s.close()}
})
test('Linux in-place byte mutation invalidates the pinned snapshot',linux,async t=>{
 const f=await fixture(t),s=await f.open()
 try{await writeFile(join(f.history,names[0]),Buffer.from('CHANGED_PRIVATE_TRANSFER'),{mode:0o600});await assert.rejects(s.read(names[0],1024));await assert.rejects(s.verify());await assert.rejects(s.consumeHistory())}finally{await s.close()}
})
test('Linux replacement leaf is not unlinked by cleanup',linux,async t=>{
 const f=await fixture(t),s=await f.open(),file=join(f.history,names[0])
 try{await rm(file);await writeFile(file,Buffer.from('FOREIGN_REPLACEMENT'),{mode:0o600});await assert.rejects(s.verify());await assert.rejects(s.consumeHistory());assert.equal((await readFile(file)).toString(),'FOREIGN_REPLACEMENT')}finally{await s.close()}
})
test('Linux unexpected files block acceptance and survive nonrecursive cleanup',linux,async t=>{
 const f=await fixture(t);await writeFile(join(f.history,'foreign'),Buffer.from('FOREIGN'),{mode:0o600});await assert.rejects(f.open())
 await rm(join(f.history,'foreign'));const s=await f.open()
 try{await writeFile(join(f.history,'foreign'),Buffer.from('FOREIGN'),{mode:0o600});await assert.rejects(s.verify());await assert.rejects(s.consumeHistory());assert.deepEqual(await readdir(f.history),['foreign'])}finally{await s.close()}
})
test('Linux path and byte bounds reject before arbitrary reads',linux,async t=>{
 const f=await fixture(t),s=await f.open()
 try{for(const name of ['../escape','x',names[0]+'/child'])await assert.rejects(s.read(name,1024));for(const max of [0,1,1024*1024+1,Infinity])await assert.rejects(s.read(names[0],max))}finally{await s.close()}
})
test('Linux yielded transport buffers are cleared on iterator cancellation',linux,async t=>{
 const f=await fixture(t),s=await f.open()
 try{const iterator=s.chunks(names[0],1024),first=await iterator.next();assert.deepEqual(first.value,synthetic);await iterator.return();assert.equal(first.value.every(v=>v===0),true)}finally{await s.close()}
})
test('Linux corrupt real-object substitutions block before extraction and clean owned transfer',linux,async t=>{
 const f=await fixture(t),result=await scanPrivateHistoricalLiteralsV1({layout:f.image,historyDirectory:f.history,consumeHistoryDirectory:true})
 assert.equal(result.result,'BLOCKED');assert.equal(result.resolved_findings,0);assert.equal(result.error,'HISTORY_BLOB_MISMATCH');assert.equal(result.cleanup,'PASS')
 assert.equal(result.input_boundary,'LINUX_FD_PINNED_PRIVATE_LOCAL_INPUT');assert.equal(JSON.stringify(result).includes(synthetic.toString()),false)
 await assert.rejects(lstat(f.history),{code:'ENOENT'});assert.equal((await lstat(f.image)).isDirectory(),true)
})
test('Linux descriptor reader integrates with the unchanged OCI digest and tar validators',linux,async t=>{
 const f=await fixture(t),json=x=>Buffer.from(JSON.stringify(x)),digest=b=>'sha256:'+createHash('sha256').update(b).digest('hex')
 await mkdir(join(f.image,'blobs'),{mode:0o700});await mkdir(join(f.image,'blobs','sha256'),{mode:0o700})
 const expected={source:'a'.repeat(40),tree:'b'.repeat(40),lockfile_sha256:'c'.repeat(64),dockerfile_sha256:'d'.repeat(64),public_build_sha256:'e'.repeat(64)}
 const keys={source:'org.opencontainers.image.revision',tree:'io.crm.source.tree',lockfile_sha256:'io.crm.lockfile.sha256',dockerfile_sha256:'io.crm.dockerfile.sha256',public_build_sha256:'io.crm.public-build.sha256'}
 const save=async(bytes,mediaType)=>{const d={digest:digest(bytes),size:bytes.length,mediaType};await writeFile(join(f.image,'blobs','sha256',d.digest.slice(7)),bytes,{mode:0o600});return d}
 const bytes=Buffer.alloc(1024),layer=await save(bytes,'application/vnd.oci.image.layer.v1.tar')
 const config=await save(json({architecture:'amd64',os:'linux',rootfs:{type:'layers',diff_ids:[digest(bytes)]},history:[],config:{User:'65532:65532',WorkingDir:'/app',Entrypoint:['/nodejs/bin/node'],Cmd:['scripts/platform/entrypoint.mjs'],ExposedPorts:{'3000/tcp':{}},Env:['NODE_ENV=production','NEXT_TELEMETRY_DISABLED=1','HOSTNAME=0.0.0.0','PORT=3000','TZ=UTC'],Labels:Object.fromEntries(Object.entries(keys).map(([k,v])=>[v,expected[k]]))}}),'application/vnd.oci.image.config.v1+json')
 const manifest=await save(json({schemaVersion:2,mediaType:'application/vnd.oci.image.manifest.v1+json',config,layers:[layer]}),'application/vnd.oci.image.manifest.v1+json')
 await writeFile(join(f.image,'oci-layout'),json({imageLayoutVersion:'1.0.0'}),{mode:0o600});await writeFile(join(f.image,'index.json'),json({schemaVersion:2,manifests:[manifest]}),{mode:0o600})
 expected.manifest_digest=manifest.digest;expected.image_config_digest=config.digest
 const session=await openPrivateScanInputV1(f.image)
 try{
  const result=await scanSavedOciLayersV1({layout:session,expected,needles:[{id:'synthetic-only',bytes:synthetic}]})
  assert.equal(result.verified_layer_count,1);assert.deepEqual(result.matched_ids,[]);assert.equal(await session.verify(),true)
 }finally{await session.close()}
 assert.equal((await lstat(f.image)).isDirectory(),true)
})
