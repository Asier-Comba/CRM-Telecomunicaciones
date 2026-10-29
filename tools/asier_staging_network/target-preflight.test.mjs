import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,readFileSync,rmSync,symlinkSync,linkSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {targetSnapshotPreflightV1,targetPreflightCliV1,targetProfileV1} from './target-preflight.mjs'
const now=Date.parse('2026-10-29T17:00:00.000Z')
const row=(id,name)=>({id,name,compose_project:null,crm_owner:null})
function fixture(){
 const expected={version:'crm.target.expected.v1',daemon_id:'10000000-0000-4000-8000-000000000001',swarm_node_id:'a'.repeat(25),shared_network_id:'b'.repeat(25)}
 const snapshot={version:'crm.target.snapshot.v1',captured_at:new Date(now).toISOString(),info:{ID:expected.daemon_id,ServerVersion:'28.0.4',OSType:'linux',Architecture:'x86_64',NCPU:4,MemTotal:8*1024**3,Containers:1,Swarm:{NodeID:expected.swarm_node_id,LocalNodeState:'active',ControlAvailable:true}},server:{Version:'28.0.4',ApiVersion:'1.48',Os:'linux',Arch:'amd64'},compose_version:'2.38.2',shared_network:{Id:expected.shared_network_id,Name:'easypanel',Driver:'overlay',Scope:'swarm',Attachable:true,Internal:false,Ingress:false},resources:{containers:[row('c'.repeat(64),'foreign-canary')],services:[],networks:[row(expected.shared_network_id,'easypanel')],volumes:[row('foreign-volume','foreign-volume')]},memory_available_bytes:4*1024**3}
 return {expected,snapshot}
}
const check=input=>targetSnapshotPreflightV1(input,now)
const denied=(input,code)=>{const report=check(input);assert.equal(report.status,'BLOCKED');assert.ok(report.errors.includes(code),JSON.stringify(report));return report}

test('consistent synthetic target is only a lower-bound snapshot, never authenticated or accepted hosting',()=>{
 const input=fixture(),before=JSON.stringify(input),report=check(input)
 assert.equal(report.status,'SNAPSHOT_CONSISTENT');assert.deepEqual(report.errors,[])
 for(const key of ['snapshot_authenticated','inventory_completeness_authenticated','capacity_accepted','route_verified','hosted_preflight_accepted','deploying_authorized','STAGING_DEPLOYED','values_included'])assert.equal(report[key],false)
 assert.equal(JSON.stringify(input),before)
 for(const value of [input.expected.daemon_id,input.expected.shared_network_id,'foreign-canary','foreign-volume'])assert.equal(JSON.stringify(report).includes(value),false)
})
for(const [field,value]of [['daemon_id','20000000-0000-4000-8000-000000000001'],['swarm_node_id','c'.repeat(25)],['shared_network_id','d'.repeat(25)]])test('independently enrolled target mismatch: '+field,()=>{
 const f=fixture();f.expected[field]=value;assert.equal(check(f).status,'BLOCKED')
})
for(const field of ['version','daemon_id','swarm_node_id','shared_network_id'])test('binding requires '+field,()=>{const f=fixture();delete f.expected[field];denied(f,'TARGET_BINDING_INVALID')})
for(const field of ['expected','snapshot'])test('unknown input fields cannot replace '+field,()=>{const f=fixture();f[field].unexpected='private-value';assert.equal(check(f).status,'BLOCKED')})
for(const [label,change]of [
 ['Engine',{info:{ServerVersion:'28.0.5'}}],['server Engine',{server:{Version:'28.0.5'}}],['API',{server:{ApiVersion:'1.49'}}],['Compose',{compose_version:'2.39.0'}],['OS',{server:{Os:'windows'}}],['architecture',{server:{Arch:'arm64'}}],['Swarm inactive',{info:{Swarm:{NodeID:'a'.repeat(25),LocalNodeState:'inactive',ControlAvailable:false}}}]
])test('unqualified '+label+' cannot inherit laboratory compatibility',()=>{
 const f=fixture();if(change.info)Object.assign(f.snapshot.info,change.info);else if(change.server)Object.assign(f.snapshot.server,change.server);else Object.assign(f.snapshot,change)
 assert.equal(check(f).status,'BLOCKED')
})
test('missing available memory never becomes sufficient just because total memory is high',()=>{
 const f=fixture();delete f.snapshot.memory_available_bytes;assert.equal(check(f).status,'BLOCKED')
 f.snapshot.memory_available_bytes=targetProfileV1.memory_bytes-1;denied(f,'TARGET_MEMORY_BELOW_RUNTIME_LIMITS')
 f.snapshot.memory_available_bytes=f.snapshot.info.MemTotal+1;denied(f,'TARGET_MEMORY_MEASUREMENT_INVALID')
 f.snapshot.memory_available_bytes=targetProfileV1.memory_bytes;assert.equal(check(f).status,'SNAPSHOT_CONSISTENT');assert.equal(check(f).capacity_accepted,false)
})
test('impossible CPU lower bound and malformed capacity fail, but a sufficient count is no reservation',()=>{
 const f=fixture();f.snapshot.info.NCPU=1;denied(f,'TARGET_CPU_BELOW_RUNTIME_LIMITS')
 for(const value of [0,NaN,Infinity,'4',4.5]){f.snapshot.info.NCPU=value;assert.equal(check(f).status,'BLOCKED')}
})
for(const [key,value]of Object.entries({Id:'x'.repeat(25),Name:'other-network',Driver:'bridge',Scope:'local',Attachable:false,Internal:true,Ingress:true}))test('shared network exact identity/contract: '+key,()=>{const f=fixture();f.snapshot.shared_network[key]=value;denied(f,'TARGET_SHARED_NETWORK_MISMATCH')})
test('snapshot age cannot be bypassed by future, invalid or noncanonical timestamps',()=>{
 const f=fixture()
 for(const value of ['invalid','2026-02-31T17:00:00.000Z',new Date(now+1).toISOString(),new Date(now-targetProfileV1.max_age_ms-1).toISOString(),'2026-10-29T18:00:00.000+01:00']){
  f.snapshot.captured_at=value;denied(f,'TARGET_SNAPSHOT_STALE_OR_INVALID')
 }
 f.snapshot.captured_at=new Date(now-targetProfileV1.max_age_ms).toISOString();assert.equal(check(f).status,'SNAPSHOT_CONSISTENT')
})
for(const kind of ['containers','services','networks','volumes'])for(const signal of ['name','compose_project','crm_owner'])test('initial namespace conflict '+kind+'/'+signal,()=>{
 const f=fixture(),r=row(kind==='containers'?'d'.repeat(64):kind==='volumes'?'not-the-project':'d'.repeat(25),'not-the-project')
 r[signal]=signal==='name'?'crm-telecom-direct-existing':'crm-telecom-direct';f.snapshot.resources[kind].push(r)
 if(kind==='volumes')r.id=r.name
 if(kind==='containers')f.snapshot.info.Containers++
 denied(f,'TARGET_NAMESPACE_OCCUPIED')
})
test('foreign prefix lookalike is not claimed as this project',()=>{
 const f=fixture();f.snapshot.resources.containers[0].name='crm-telecom-directly-different';assert.equal(check(f).status,'SNAPSHOT_CONSISTENT')
 f.snapshot.resources.containers[0].compose_project='';f.snapshot.resources.containers[0].crm_owner='';assert.equal(check(f).status,'SNAPSHOT_CONSISTENT')
})
test('causal: truncated or malformed resource IDs and a volume ID/name mismatch cannot be consistent',()=>{
 for(const bad of ['\n',' ','x','a'.repeat(12),'A'.repeat(64),'g'.repeat(64)]){
  const f=fixture();f.snapshot.resources.containers[0].id=bad;denied(f,'TARGET_INVENTORY_INVALID')
 }
 const service=fixture();service.snapshot.resources.services=[row('x','foreign-service')];denied(service,'TARGET_INVENTORY_INVALID')
 const network=fixture();network.snapshot.resources.networks.push(row('x','foreign-network'));denied(network,'TARGET_INVENTORY_INVALID')
 const volume=fixture();volume.snapshot.resources.volumes[0].id='different-volume';denied(volume,'TARGET_INVENTORY_INVALID')
})
test('duplicate, truncated, missing and malformed inventory fails closed',()=>{
 const f=fixture();f.snapshot.resources.containers=[];denied(f,'TARGET_CONTAINER_INVENTORY_INCOMPLETE')
 const d=fixture();d.snapshot.resources.networks.push({...d.snapshot.resources.networks[0]});denied(d,'TARGET_INVENTORY_DUPLICATE')
 const m=fixture();m.snapshot.resources.networks=[];denied(m,'TARGET_SHARED_NETWORK_NOT_IN_INVENTORY')
 for(const value of [null,{},'not-an-array',new Array(10001).fill(null)]){const v=fixture();v.snapshot.resources.services=value;denied(v,'TARGET_INVENTORY_INVALID')}
 const u=fixture();u.snapshot.resources.services.push({});denied(u,'TARGET_INVENTORY_INVALID')
})
test('nulls, thrown getters and malformed inputs cannot disclose their values',()=>{
 for(const value of [null,[],{},'private-marker',{expected:null,snapshot:null},{get expected(){throw Error('private-marker')},snapshot:{}}]){
  const report=check(value);assert.equal(report.status,'BLOCKED');assert.equal(JSON.stringify(report).includes('private-marker'),false)
 }
 assert.equal(targetSnapshotPreflightV1(fixture(),NaN).status,'BLOCKED')
})

function files(){
 const directory=mkdtempSync(join(tmpdir(),'crm-target-synthetic-')),input=fixture(),e=join(directory,'expected.json'),s=join(directory,'snapshot.json')
 input.snapshot.captured_at=new Date().toISOString()
 writeFileSync(e,JSON.stringify(input.expected),{mode:0o600});writeFileSync(s,JSON.stringify(input.snapshot),{mode:0o600})
 return {directory,e,s,args:['--expected',e,'--snapshot',s],cleanup:()=>rmSync(directory,{recursive:true,force:true})}
}
test('real CLI reads bounded files and prints only safe result and byte hashes',()=>{
 const f=files()
 try{
  const before=[readFileSync(f.e),readFileSync(f.s)]
  const r=spawnSync(process.execPath,[fileURLToPath(new URL('./target-preflight.mjs',import.meta.url)),...f.args],{encoding:'utf8',timeout:10000,shell:false})
  assert.equal(r.status,0,r.stdout);const report=JSON.parse(r.stdout);assert.equal(report.status,'SNAPSHOT_CONSISTENT')
  assert.match(report.input_sha256.snapshot,/^[a-f0-9]{64}$/);assert.equal(report.deploying_authorized,false)
  assert.deepEqual([readFileSync(f.e),readFileSync(f.s)],before)
  assert.equal(r.stdout.includes(f.directory),false);assert.equal(r.stdout.includes('foreign-canary'),false)
 }finally{f.cleanup()}
})
test('CLI denies missing/extra/reordered flags, unavailable files and malformed JSON without leaking paths/content',()=>{
 const f=files()
 try{
  for(const args of [[],[...f.args,'--deploy'],['--snapshot',f.s,'--expected',f.e],['--expected',f.e,'--snapshot',join(f.directory,'private-missing')]]){
   const r=targetPreflightCliV1(args);assert.equal(r.status,'BLOCKED');assert.equal(JSON.stringify(r).includes(f.directory),false)
  }
  writeFileSync(f.s,'private-raw-invalid-json');const r=targetPreflightCliV1(f.args);assert.equal(r.status,'BLOCKED');assert.equal(JSON.stringify(r).includes('private-raw'),false)
 }finally{f.cleanup()}
})
test('CLI rejects oversized and hardlinked input',()=>{
 const f=files()
 try{
  writeFileSync(f.s,' '.repeat(4*1024*1024+1));assert.equal(targetPreflightCliV1(f.args).status,'BLOCKED')
  writeFileSync(f.s,'{}');linkSync(f.s,join(f.directory,'hardlink'));assert.equal(targetPreflightCliV1(f.args).status,'BLOCKED')
 }finally{f.cleanup()}
})
test('CLI rejects a symlink rather than following it',t=>{
 const f=files()
 try{
  const link=join(f.directory,'link.json')
  try{symlinkSync(f.s,link)}catch(error){if(process.platform==='win32'&&['EPERM','EACCES'].includes(error.code)){t.skip('Windows symlink privilege unavailable; Linux CI must exercise this negative');return}throw error}
  assert.equal(targetPreflightCliV1(['--expected',f.e,'--snapshot',link]).status,'BLOCKED')
 }finally{f.cleanup()}
})
