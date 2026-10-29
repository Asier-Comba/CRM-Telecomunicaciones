import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink,realpath} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {gzipSync} from 'node:zlib'
import {historicalLiteralDescriptorsV1,historicalLiteralDescriptorSha256V1,extractPinnedHistoricalLiteralV1,literalByteMatcherV1,scanSavedOciLayersV1,scanHistoricalLiteralsV1} from './scan-historical-literals.mjs'

const digest=b=>createHash('sha256').update(b).digest('hex')
const json=v=>Buffer.from(JSON.stringify(v))
const needle=Buffer.from('SYNTHETIC_HISTORICAL_SENTINEL_ONLY')
const needles=[{id:'synthetic-finding',bytes:needle}]
function tar(entries,{trailer=true}={}){
 const chunks=[]
 for(const {name='app/file',data=Buffer.from('safe synthetic bytes'),type='0',link=''} of entries){
  const h=Buffer.alloc(512),put=(s,i,n)=>h.write(s,i,n,'ascii'),oct=(v,i,n)=>put(v.toString(8).padStart(n-1,'0')+'\0',i,n)
  put(name,0,100);oct(0o644,100,8);oct(0,108,8);oct(0,116,8);oct(data.length,124,12);oct(0,136,12);h.fill(32,148,156);put(type,156,1);put(link,157,100);put('ustar\0',257,6);put('00',263,2)
  const sum=h.reduce((a,b)=>a+b,0);put(sum.toString(8).padStart(6,'0')+'\0 ',148,8)
  chunks.push(h,data,Buffer.alloc((512-data.length%512)%512))
 }
 if(trailer)chunks.push(Buffer.alloc(1024))
 return Buffer.concat(chunks)
}
async function fixture(t,{layers=[tar([{}])],gzip=true,history=[],environment=[],configChange,manifestChange,indexChange}={}){
 const layout=await realpath(await mkdtemp(join(tmpdir(),'crm-historical-synthetic-')))
 t.after(()=>rm(layout,{recursive:true,force:true}))
 await mkdir(join(layout,'blobs','sha256'),{recursive:true})
 const save=async(bytes,mediaType)=>{const d={mediaType,digest:'sha256:'+digest(bytes),size:bytes.length};await writeFile(join(layout,'blobs','sha256',d.digest.slice(7)),bytes);return d}
 const expected={source:'a'.repeat(40),tree:'b'.repeat(40),lockfile_sha256:'c'.repeat(64),dockerfile_sha256:'d'.repeat(64),public_build_sha256:'e'.repeat(64)}
 const names={source:'org.opencontainers.image.revision',tree:'io.crm.source.tree',lockfile_sha256:'io.crm.lockfile.sha256',dockerfile_sha256:'io.crm.dockerfile.sha256',public_build_sha256:'io.crm.public-build.sha256'}
 const config={architecture:'amd64',os:'linux',rootfs:{type:'layers',diff_ids:layers.map(b=>'sha256:'+digest(b))},history,config:{User:'65532:65532',WorkingDir:'/app',Entrypoint:['/nodejs/bin/node'],Cmd:['scripts/platform/entrypoint.mjs'],ExposedPorts:{'3000/tcp':{}},Env:['NODE_ENV=production','NEXT_TELEMETRY_DISABLED=1','HOSTNAME=0.0.0.0','PORT=3000','TZ=UTC',...environment],Labels:Object.fromEntries(Object.entries(names).map(([k,v])=>[v,expected[k]]))}}
 configChange?.(config)
 const cd=await save(json(config),'application/vnd.oci.image.config.v1+json')
 const ld=[];for(const bytes of layers)ld.push(await save(gzip?gzipSync(bytes):bytes,gzip?'application/vnd.oci.image.layer.v1.tar+gzip':'application/vnd.oci.image.layer.v1.tar'))
 const manifest={schemaVersion:2,mediaType:'application/vnd.oci.image.manifest.v1+json',config:cd,layers:ld};manifestChange?.(manifest)
 const md=await save(json(manifest),manifest.mediaType),index={schemaVersion:2,manifests:[md]};indexChange?.(index)
 await writeFile(join(layout,'oci-layout'),json({imageLayoutVersion:'1.0.0'}));await writeFile(join(layout,'index.json'),json(index))
 expected.manifest_digest=md.digest;expected.image_config_digest=cd.digest
 return{layout,expected,needles,layers:ld,manifest,config,save,scan:extra=>scanSavedOciLayersV1({layout,expected,needles,...extra})}
}
test('pinned metadata has exactly ten frozen identities and no literal byte fields',()=>{
 assert.equal(historicalLiteralDescriptorsV1.length,10);assert.equal(new Set(historicalLiteralDescriptorsV1.map(x=>x.id)).size,10)
 assert.match(historicalLiteralDescriptorSha256V1,/^[a-f0-9]{64}$/)
 for(const d of historicalLiteralDescriptorsV1){assert.equal(Object.isFrozen(d),true);assert.deepEqual(Object.keys(d),['id','blob','line','line_sha256','start','end'])}
 const tenth=historicalLiteralDescriptorsV1.find(d=>d.blob==='dc40e3aa6b0ce07169bd25fa34bbef3f2dc1523f')
 assert.equal(tenth.end-tenth.start,22)
})
test('static exact-offset extraction requires BOTH Git object and line identity',()=>{
 const line="const FIXTURE = '"+needle.toString()+"'",blob=Buffer.from(line+'\n')
 const d={blob:createHash('sha1').update(Buffer.from('blob '+blob.length+'\0')).update(blob).digest('hex'),line:1,line_sha256:digest(Buffer.from(line)),start:17,end:17+needle.length}
 assert.deepEqual(extractPinnedHistoricalLiteralV1(blob,d),needle)
 for(const patch of [{blob:'f'.repeat(40)},{line_sha256:'f'.repeat(64)},{start:16},{end:d.end+1},{line:2}])assert.throws(()=>extractPinnedHistoricalLiteralV1(blob,{...d,...patch}))
 const evil=Buffer.from("const FIXTURE = 'escaped\\x21'")
 const e={...d,blob:createHash('sha1').update(Buffer.from('blob '+evil.length+'\0')).update(evil).digest('hex'),line_sha256:digest(evil),start:17,end:evil.length-1}
 assert.throws(()=>extractPinnedHistoricalLiteralV1(evil,e),/AMBIGUOUS/)
})
test('byte matcher crosses arbitrary chunks and finds binary-embedded original bytes',()=>{
 const m=literalByteMatcherV1(needles),bytes=Buffer.concat([Buffer.from([0,255]),needle,Buffer.from([0])])
 for(const b of bytes)m.feed(Buffer.from([b]))
 assert.deepEqual(m.finish().matched_ids,['synthetic-finding'])
})
test('all raw and gzip layers are physically read, hashed and scanned',async t=>{
 for(const gzip of [false,true]){
  const f=await fixture(t,{gzip,layers:[tar([{}]),tar([{name:'app/other'}])]})
  const r=await f.scan();assert.equal(r.verified_layer_count,2);assert.equal(r.scanned_layer_count,2);assert.deepEqual(r.matched_ids,[])
  assert.ok(r.expanded_bytes>0);assert.ok(r.compressed_bytes>0);assert.equal(r.source_authenticity,'NOT_VERIFIED')
 }
})
test('causal sentinel in deleted/overwritten first layer is retained despite clean later layer',async t=>{
 const dirty=tar([{name:'app/old',data:needle}]),clean=tar([{name:'app/.wh.old',data:Buffer.alloc(0)},{name:'app/old',data:Buffer.from('clean replacement')}])
 const before=await fixture(t,{layers:[clean]}),after=await fixture(t,{layers:[dirty,clean]})
 assert.deepEqual((await before.scan()).matched_ids,[]);assert.deepEqual((await after.scan()).matched_ids,['synthetic-finding'])
 assert.equal((await after.scan()).verified_layer_count,2)
})
test('config history is scanned in full, not only Env or final filesystem',async t=>{
 const f=await fixture(t,{history:[{created_by:needle.toString()}]})
 assert.deepEqual((await f.scan()).matched_ids,['synthetic-finding'])
})
test('metadata cannot substitute for forbidden config environment checks',async t=>{
 const f=await fixture(t,{environment:['SYNTHETIC_PRIVATE_SETTING='+needle.toString()]})
 await assert.rejects(f.scan(),/RUNTIME_BINDINGS_FORBIDDEN/)
})
test('needle across actual 64KiB input boundary in binary tar file is found',async t=>{
 const content=Buffer.concat([Buffer.alloc(65536-512-9,255),needle,Buffer.alloc(32)])
 const f=await fixture(t,{gzip:false,layers:[tar([{data:content}])]})
 assert.deepEqual((await f.scan()).matched_ids,['synthetic-finding'])
})
test('wrong expected manifest/config, absent layers and corrupt compressed bytes block',async t=>{
 for(const kind of ['manifest','config','missing','compressed']){
  const f=await fixture(t)
  if(kind==='manifest')f.expected.manifest_digest='sha256:'+'f'.repeat(64)
  if(kind==='config')f.expected.image_config_digest='sha256:'+'f'.repeat(64)
  const file=join(f.layout,'blobs','sha256',f.layers[0].digest.slice(7))
  if(kind==='missing')await rm(file)
  if(kind==='compressed'){const b=await readFile(file);b[15]^=255;await writeFile(file,b)}
  await assert.rejects(f.scan())
 }
})
test('same config with a changed manifest remains a different candidate identity',async t=>{
 const f=await fixture(t),m2=await f.save(json({...f.manifest,annotations:{synthetic:'changed'}}),'application/vnd.oci.image.manifest.v1+json')
 await writeFile(join(f.layout,'index.json'),json({schemaVersion:2,manifests:[m2]}))
 await assert.rejects(f.scan(),/EXPECTED_MANIFEST_MISMATCH/)
})
test('valid compressed digest does not conceal a wrong uncompressed diff_id',async t=>{
 const f=await fixture(t,{configChange:c=>{c.rootfs.diff_ids[0]='sha256:'+'f'.repeat(64)}})
 await assert.rejects(f.scan(),/DIFF_ID_MISMATCH/)
})
test('truncated tar, bad checksum, no trailer and data after trailer are rejected',async t=>{
 const valid=tar([{}]),bad=Buffer.from(valid);bad[5]^=1
 for(const layer of [valid.subarray(0,600),bad,tar([{}],{trailer:false}),Buffer.concat([valid,Buffer.from('unparsed payload')])]){
  const f=await fixture(t,{layers:[layer]});await assert.rejects(f.scan())
 }
})
test('traversal, unknown tar records and GNU sparse data are not silently skipped',async t=>{
 for(const record of [{name:'../escape'},{name:'/absolute'},{name:'C:/drive'},{name:'app\\escape'},{type:'S'},{type:'g'}]){
  const f=await fixture(t,{layers:[tar([record])]});await assert.rejects(f.scan())
 }
})
test('symlink metadata is scanned without opening its target; hardlink traversal is rejected',async t=>{
 const f=await fixture(t,{layers:[tar([{name:'app/link',type:'2',link:'/nonexistent/'+needle.toString(),data:Buffer.alloc(0)}])]})
 assert.deepEqual((await f.scan()).matched_ids,['synthetic-finding'])
 const h=await fixture(t,{layers:[tar([{type:'1',link:'../escape',data:Buffer.alloc(0)}])]})
 await assert.rejects(h.scan(),/TAR_ENTRY_INVALID/)
})
test('expanded bytes, compressed bytes, entry count and entry size enforce bounds',async t=>{
 for(const limits of [{expanded:100},{totalExpanded:100},{compressed:10},{totalCompressed:10},{entries:1},{entry:1}]){
  const f=await fixture(t,{layers:[tar([{},{}])]});await assert.rejects(f.scan({limits}))
 }
 const f=await fixture(t);await assert.rejects(f.scan({limits:{expanded:99*1024**3}}),/LIMITS_INVALID/)
})
test('unsupported index, external URLs and unexpected layout version fail closed',async t=>{
 for(const kind of ['index','url','layout']){
  const f=await fixture(t,{indexChange:kind==='index'?i=>i.manifests.push(i.manifests[0]):undefined,manifestChange:kind==='url'?m=>{m.layers[0].urls=['https://unapproved.invalid']} :undefined})
  if(kind==='layout')await writeFile(join(f.layout,'oci-layout'),json({imageLayoutVersion:'9'}))
  await assert.rejects(f.scan())
 }
})
test('root or blob symlinks cannot redirect local reads',async t=>{
 const f=await fixture(t),target=join(f.layout,'target')
 await writeFile(target,Buffer.from('safe'))
 const blob=join(f.layout,'blobs','sha256',f.layers[0].digest.slice(7))
 await rm(blob)
 try{await symlink(target,blob,'file')}catch(e){if(e.code==='EPERM'){t.skip('Windows symlink privilege absent; Linux negative remains required');return}throw e}
 await assert.rejects(f.scan(),/OCI_FILE_INVALID/)
})
test('public wrapper cannot accept a verifier flag or caller test needles instead of pinned extraction',async()=>{
 const r=await scanHistoricalLiteralsV1({complete:true,needles,verify:()=>true})
 assert.equal(r.result,'BLOCKED');assert.equal(r.resolved_findings,0);assert.equal(r.cleanup,'NOT_STARTED')
 assert.equal(r.publishing_authorized,false);assert.equal(r.security_accepted,false)
})
test('private reader errors are redacted and cleanup is required even after partial extraction',async()=>{
 for(const cleanupFail of [false,true]){
  let cleaned=0
  const r=await scanHistoricalLiteralsV1({readHistoricalBlob:async()=>{throw Error(needle.toString())},cleanupHistory:async()=>{cleaned++;return !cleanupFail}})
  assert.equal(r.result,'BLOCKED');assert.equal(cleaned,1);assert.equal(r.cleanup,cleanupFail?'FAIL':'PASS');assert.equal(JSON.stringify(r).includes(needle.toString()),false)
 }
})
test('wrong historical blob blocks before image scan and cleanup exceptions remain redacted',async()=>{
 const r=await scanHistoricalLiteralsV1({readHistoricalBlob:async()=>Buffer.from('not the pinned object'),cleanupHistory:async()=>{throw Error(needle.toString())}})
 assert.equal(r.result,'BLOCKED');assert.equal(r.error,'HISTORY_CLEANUP_FAILED');assert.equal(r.resolved_findings,0);assert.equal(JSON.stringify(r).includes(needle.toString()),false)
})

