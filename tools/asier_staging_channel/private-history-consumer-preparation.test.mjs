import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,realpath,writeFile,readdir,readlink,readFile,rm,lstat,unlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,dirname,basename} from 'node:path'
import {createHash} from 'node:crypto'
import {withSyntheticHistoryExecutableLeaseV1,consumeSyntheticHistoryExecutableLeaseV1,disposeSyntheticHistoryExecutableLeaseV1} from './git-producer-preflight.mjs'
import {producePinnedHistoryTransferV1} from './synthetic-history-transport.mjs'
import {pinnedHistoryObjectIdsV1} from './private-history-batch.mjs'

const linux={skip:process.platform!=='linux'?'Retained executable/private transfer fixtures require Linux':false}
const values=['SYNTHETIC_LEASE_ONE','SYNTHETIC_LEASE_TWO','SYNTHETIC_LEASE_THREE'].map(v=>Buffer.from(v))
const ids=values.map(b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'))
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function countFd(path){
 let count=0
 for(const fd of await readdir('/proc/self/fd'))try{if(await readlink('/proc/self/fd/'+fd)===path)count++}catch{}
 return count
}
async function fixture(t,{behavior='normal'}={}){
 const parent=await realpath(tmpdir()),root=await realpath(await mkdtemp(join(parent,'crm-synthetic-lease-')))
 assert.equal(dirname(root),parent);assert.ok(basename(root).startsWith('crm-synthetic-lease-'))
 t.after(()=>rm(root,{recursive:true,force:true}))
 const path=join(root,'fixture.node'),marker=join(root,'started')
 const script='#!'+process.execPath+'\n// W4_SYNTHETIC_HISTORY_LEASE_V1\n'+`
 const fs=require('node:fs'),behavior=${JSON.stringify(behavior)},expected=${JSON.stringify(ids)},values=${JSON.stringify(values.map(b=>b.toString('base64')))};
 const allowed=['LC_ALL','GIT_CONFIG_NOSYSTEM','GIT_CONFIG_SYSTEM','GIT_CONFIG_GLOBAL','GIT_TERMINAL_PROMPT','GIT_NO_LAZY_FETCH','GIT_NO_REPLACE_OBJECTS','GIT_OPTIONAL_LOCKS'];
 const args=process.argv.slice(2),wanted=['--no-lazy-fetch','--no-replace-objects','--no-optional-locks','--no-pager','-c','safe.directory=${root}','-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','credential.helper=','-c','protocol.allow=never','-C','${root}','cat-file','--batch'];
 if(process.cwd()!=='/'||JSON.stringify(args)!==JSON.stringify(wanted)||Object.keys(process.env).some(k=>!allowed.includes(k)))process.exit(8);
 let request='';process.stdin.on('data',b=>request+=b.toString('ascii'));
 process.stdin.on('end',()=>{
  if(request!==expected.join('\\n')+'\\n')process.exit(9);
  fs.writeFileSync(${JSON.stringify(marker)},'SYNTHETIC_STARTED');
  if(behavior==='hang'){setTimeout(()=>process.exit(7),10000);return}
  if(behavior==='failure'){process.stderr.write('PRIVATE_SYNTHETIC_CHILD_ERROR');process.exitCode=7;return}
  const replies=values.map((v,i)=>{const b=Buffer.from(v,'base64');return Buffer.concat([Buffer.from(expected[i]+' blob '+b.length+'\\n'),b,Buffer.from('\\n')])});
  process.stdout.end(Buffer.concat(replies));
 });
 `
 await writeFile(path,script,{mode:0o700})
 const options={mode:'SYNTHETIC_LEASE_ONLY',executable:path,expectedSha256:createHash('sha256').update(Buffer.from(script)).digest('hex'),repository:root,parent:root,ids:[...ids],milliseconds:5000}
 return{root,path,marker,options,run:callback=>withSyntheticHistoryExecutableLeaseV1(options,callback)}
}

test('real entry has no issuer: ordinary NOT_RUN; JSON flags hashes callbacks and proxies BLOCKED without access',async()=>{
 assert.equal((await producePinnedHistoryTransferV1()).result,'NOT_RUN')
 let calls=0
 const trap=new Proxy({},{get(){calls++;throw Error('PRIVATE_SYNTHETIC_GETTER')}})
 for(const cap of [null,false,true,{},Object.freeze({approved:true}),{sha256:'a'.repeat(64)},JSON.parse('{"authorized":true}'),()=>{calls++},trap]){
  const r=await producePinnedHistoryTransferV1(cap);assert.equal(r.result,'BLOCKED');assert.equal(r.error,'REAL_HISTORY_ISSUER_NOT_CONFIGURED');assert.equal(r.real_history_authorized,false);assert.equal(r.publishing_authorized,false)
 }
 assert.equal(calls,0)
})
test('fixture consumer and dispose reject unregistered identities without any lease',async()=>{
 for(const cap of [undefined,null,{},Object.freeze(Object.create(null)),()=>{},'SYNTHETIC']){
  assert.equal((await consumeSyntheticHistoryExecutableLeaseV1(cap)).error,'SYNTHETIC_LEASE_INVALID')
  assert.equal((await disposeSyntheticHistoryExecutableLeaseV1(cap)).error,'SYNTHETIC_LEASE_INVALID')
 }
})
test('nonfixture modes cannot open paths or invoke fixture callback',async()=>{
 let calls=0
 for(const mode of [undefined,'PINNED_REAL','EXECUTABLE_METADATA_ONLY','SYNTHETIC_ONLY']){
  const r=await withSyntheticHistoryExecutableLeaseV1({mode,executable:'/not-opened'},()=>{calls++});assert.equal(r.result,'NOT_RUN')
 }
 assert.equal(calls,0)
})
test('actual pinned IDs cannot enroll a fixture even with otherwise shaped options',async()=>{
 const r=await withSyntheticHistoryExecutableLeaseV1({mode:'SYNTHETIC_LEASE_ONLY',executable:'/not-opened',expectedSha256:'a'.repeat(64),repository:'/not-opened',parent:'/not-opened',ids:pinnedHistoryObjectIdsV1},()=>assert.fail('fixture callback must not run'))
 assert.equal(r.result,'BLOCKED');assert.equal(r.error,'SYNTHETIC_LEASE_INVALID');assert.equal(r.lease_cleanup,'NOT_ACQUIRED')
})
test('Linux fixture lease is opaque, FD retained until real Node close, fixed private transfer cleaned',linux,async t=>{
 const f=await fixture(t);let cap
 assert.equal(await countFd(f.path),0)
 const r=await f.run(async value=>{
  cap=value;assert.equal(Object.isFrozen(value),true);assert.deepEqual(Reflect.ownKeys(value),[]);assert.equal(JSON.stringify(value),'{}');assert.equal(await countFd(f.path),1)
  assert.equal((await producePinnedHistoryTransferV1(value)).error,'REAL_HISTORY_ISSUER_NOT_CONFIGURED')
  const result=await consumeSyntheticHistoryExecutableLeaseV1(value)
  assert.equal(result.result,'SYNTHETIC_TRANSFER_PASS');assert.equal(result.transport_process_cleanup,'PASS');assert.equal(result.cleanup,'PASS');assert.equal(result.lease_cleanup,'PASS')
  assert.equal(await countFd(f.path),0)
 })
 assert.equal(r.result,'SYNTHETIC_TRANSFER_PASS');assert.equal(r.real_history_authorized,false);assert.equal((await consumeSyntheticHistoryExecutableLeaseV1(cap)).error,'SYNTHETIC_LEASE_TERMINAL')
 assert.deepEqual((await readdir(f.root)).sort(),['fixture.node','started']);assert.equal(JSON.stringify(r).includes(f.root),false)
})
test('Linux clones JSON and forged fixture identities cannot consume retained lease',linux,async t=>{
 const f=await fixture(t)
 const r=await f.run(async cap=>{
  for(const other of [{...cap},Object.assign(Object.create(null),cap),JSON.parse(JSON.stringify(cap))])assert.equal((await consumeSyntheticHistoryExecutableLeaseV1(other)).error,'SYNTHETIC_LEASE_INVALID')
  assert.equal(await countFd(f.path),1)
  await consumeSyntheticHistoryExecutableLeaseV1(cap)
 })
 assert.equal(r.result,'SYNTHETIC_TRANSFER_PASS');assert.equal(await countFd(f.path),0)
})
test('Linux one-shot transition precedes first await and prevents concurrent second child',linux,async t=>{
 const f=await fixture(t)
 const r=await f.run(async cap=>{
  const first=consumeSyntheticHistoryExecutableLeaseV1(cap),second=consumeSyntheticHistoryExecutableLeaseV1(cap)
  assert.equal((await second).error,'SYNTHETIC_LEASE_TERMINAL');assert.equal((await first).result,'SYNTHETIC_TRANSFER_PASS')
 })
 assert.equal(r.result,'SYNTHETIC_TRANSFER_PASS');assert.equal(await countFd(f.path),0)
})
test('Linux binding mismatch rejects before child and independently closes own FD',linux,async t=>{
 const f=await fixture(t)
 const r=await f.run(cap=>consumeSyntheticHistoryExecutableLeaseV1(cap,{binding:'WRONG_SOURCE'}))
 assert.equal(r.error,'SYNTHETIC_LEASE_BINDING_MISMATCH');assert.equal(r.lease_cleanup,'PASS');assert.equal(await countFd(f.path),0);await assert.rejects(lstat(f.marker),{code:'ENOENT'})
})
test('Linux explicit dispose makes lease terminal before any child',linux,async t=>{
 const f=await fixture(t)
 const r=await f.run(async cap=>{assert.equal((await disposeSyntheticHistoryExecutableLeaseV1(cap)).lease_cleanup,'PASS');assert.equal((await consumeSyntheticHistoryExecutableLeaseV1(cap)).error,'SYNTHETIC_LEASE_TERMINAL')})
 assert.equal(r.result,'BLOCKED');assert.equal(r.lease_cleanup,'PASS');assert.equal(await countFd(f.path),0);await assert.rejects(lstat(f.marker),{code:'ENOENT'})
})
test('Linux caller exception closes retained FD without exposing exception or path',linux,async t=>{
 const f=await fixture(t),r=await f.run(()=>{throw Error('PRIVATE_SYNTHETIC_CALLER')})
 assert.equal(r.result,'BLOCKED');assert.equal(r.lease_cleanup,'PASS');assert.equal(await countFd(f.path),0);assert.equal(JSON.stringify(r).includes('PRIVATE_SYNTHETIC'),false);assert.equal(JSON.stringify(r).includes(f.path),false)
})
test('Linux expiration closes idle lease and late consume cannot spawn',linux,async t=>{
 const f=await fixture(t);f.options.milliseconds=200;let cap,late
 const r=await f.run(async value=>{cap=value;await sleep(350);late=await consumeSyntheticHistoryExecutableLeaseV1(value)})
 assert.equal(r.result,'BLOCKED');assert.equal(r.lease_cleanup,'PASS');assert.equal(await countFd(f.path),0)
 await sleep(200);assert.equal(late.error,'SYNTHETIC_LEASE_TERMINAL');assert.equal((await producePinnedHistoryTransferV1(cap)).result,'BLOCKED');await assert.rejects(lstat(f.marker),{code:'ENOENT'})
})
test('Linux executable path replacement blocks use and preserves foreign replacement',linux,async t=>{
 const f=await fixture(t)
 const r=await f.run(async cap=>{await unlink(f.path);await writeFile(f.path,'FOREIGN_SYNTHETIC_REPLACEMENT',{mode:0o700});await consumeSyntheticHistoryExecutableLeaseV1(cap)})
 assert.equal(r.result,'BLOCKED');assert.equal(r.error,'SYNTHETIC_LEASE_EXECUTABLE_CHANGED');assert.equal(r.lease_cleanup,'PASS');assert.equal(await readFile(f.path,'utf8'),'FOREIGN_SYNTHETIC_REPLACEMENT');await assert.rejects(lstat(f.marker),{code:'ENOENT'})
})
test('Linux child failure remains blocked with process and FD cleanup independently reported',linux,async t=>{
 const f=await fixture(t,{behavior:'failure'}),r=await f.run(cap=>consumeSyntheticHistoryExecutableLeaseV1(cap))
 assert.equal(r.result,'BLOCKED');assert.equal(r.transport_process_cleanup,'PASS');assert.equal(r.lease_cleanup,'PASS');assert.equal(await countFd(f.path),0);assert.equal(JSON.stringify(r).includes('PRIVATE_SYNTHETIC'),false)
})
test('Linux dispose during child operation waits for lifecycle cleanup then closes FD',linux,async t=>{
 const f=await fixture(t,{behavior:'hang'})
 const r=await f.run(async cap=>{
  const running=consumeSyntheticHistoryExecutableLeaseV1(cap)
  let started=false
  for(let i=0;i<100;i++){try{await lstat(f.marker);started=true;break}catch{await sleep(10)}}
  assert.equal(started,true);assert.equal(await countFd(f.path),1)
  const disposal=await disposeSyntheticHistoryExecutableLeaseV1(cap),done=await running
  assert.equal(disposal.lease_cleanup,'PASS');assert.equal(done.result,'BLOCKED');assert.equal(done.transport_process_cleanup,'PASS')
 })
 assert.equal(r.result,'BLOCKED');assert.equal(r.lease_cleanup,'PASS');assert.equal(await countFd(f.path),0)
})
