import {constants,lstatSync,openSync,fstatSync,readSync,closeSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'

// Initial direct-runtime enrollment only. These versions are the existing
// physical lab's combination, not facts about the VPS or a claim of compatibility
// with an arbitrary newer Engine. This module never executes Docker.
export const targetProfileV1=Object.freeze({engine:'28.0.4',api:'1.48',compose:'2.38.2',project:'crm-telecom-direct',memory_bytes:1280*1024*1024,cpu:1.25,max_age_ms:300000})
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const keys=(x,names)=>record(x)&&Object.keys(x).sort().join(',')===[...names].sort().join(',')
const id=x=>typeof x==='string'&&/^[A-Za-z0-9:-]{16,128}$/.test(x)
const positive=x=>Number.isSafeInteger(x)&&x>0
const stamp=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x
const hash=x=>createHash('sha256').update(x).digest('hex')
const response=errors=>({version:'crm.target-preflight.v1',status:errors.length?'BLOCKED':'SNAPSHOT_CONSISTENT',errors:[...new Set(errors)],values_included:false,snapshot_authenticated:false,inventory_completeness_authenticated:false,capacity_accepted:false,capacity_scope:'MEMORY_AND_CPU_LOWER_BOUNDS_ONLY_NOT_RESERVATION',route_verified:false,hosted_preflight_accepted:false,deploying_authorized:false,STAGING_DEPLOYED:false})
const resourceKinds=['containers','services','networks','volumes']
const namespace=name=>name===targetProfileV1.project||name.startsWith(targetProfileV1.project+'-')||name.startsWith(targetProfileV1.project+'_')
const resourceIdentity=(kind,r)=>typeof r.id==='string'&&(kind==='volumes'?r.id===r.name:kind==='services'?/^[a-z0-9]{25}$/.test(r.id):kind==='containers'?/^[a-f0-9]{64}$/.test(r.id):/^(?:[a-f0-9]{64}|[a-z0-9]{25})$/.test(r.id))

/** Compare minimized operator snapshots with an independently reviewed target
 * binding. Neither JSON, hashes, timestamps nor supplied expected IDs establish
 * provenance, a complete inventory, capacity reservation or execution authority.
 */
export function targetSnapshotPreflightV1(input,now=Date.now()){
 const errors=[]
 try{
  if(!keys(input,['expected','snapshot'])||!Number.isSafeInteger(now)||now<0)return response(['TARGET_INPUT_INVALID'])
  const {expected:e,snapshot:s}=input
  if(!keys(e,['version','daemon_id','swarm_node_id','shared_network_id'])||e.version!=='crm.target.expected.v1'||![e.daemon_id,e.swarm_node_id,e.shared_network_id].every(id))return response(['TARGET_BINDING_INVALID'])
  if(!keys(s,['version','captured_at','info','server','compose_version','shared_network','resources','memory_available_bytes'])||s.version!=='crm.target.snapshot.v1')return response(['TARGET_SNAPSHOT_INVALID'])
  if(!stamp(s.captured_at)||Date.parse(s.captured_at)>now||now-Date.parse(s.captured_at)>targetProfileV1.max_age_ms)errors.push('TARGET_SNAPSHOT_STALE_OR_INVALID')
  const i=s.info,v=s.server,n=s.shared_network
  if(!record(i)||!record(v)||!record(i.Swarm)||!id(i.ID)||!id(i.Swarm.NodeID))errors.push('TARGET_DAEMON_INVALID')
  else{
   if(i.ID!==e.daemon_id||i.Swarm.NodeID!==e.swarm_node_id)errors.push('TARGET_IDENTITY_MISMATCH')
   if(i.OSType!=='linux'||!['x86_64','amd64'].includes(i.Architecture)||i.Swarm.LocalNodeState!=='active'||i.Swarm.ControlAvailable!==true||v.Os!=='linux'||v.Arch!=='amd64')errors.push('TARGET_PLATFORM_UNQUALIFIED')
   if(i.ServerVersion!==targetProfileV1.engine||v.Version!==targetProfileV1.engine||v.ApiVersion!==targetProfileV1.api||s.compose_version!==targetProfileV1.compose)errors.push('TARGET_VERSION_UNQUALIFIED')
   if(!positive(i.NCPU)||!positive(i.MemTotal)||!Number.isSafeInteger(i.Containers)||i.Containers<0)errors.push('TARGET_INFO_INVALID')
   if(!positive(s.memory_available_bytes)||!positive(i.MemTotal)||s.memory_available_bytes>i.MemTotal)errors.push('TARGET_MEMORY_MEASUREMENT_INVALID')
   else if(s.memory_available_bytes<targetProfileV1.memory_bytes)errors.push('TARGET_MEMORY_BELOW_RUNTIME_LIMITS')
   if(!positive(i.NCPU)||i.NCPU<targetProfileV1.cpu)errors.push('TARGET_CPU_BELOW_RUNTIME_LIMITS')
  }
  if(!record(n)||n.Id!==e.shared_network_id||n.Name!=='easypanel'||n.Driver!=='overlay'||n.Scope!=='swarm'||n.Attachable!==true||n.Internal!==false||n.Ingress!==false)errors.push('TARGET_SHARED_NETWORK_MISMATCH')
  if(!keys(s.resources,resourceKinds))errors.push('TARGET_INVENTORY_INVALID')
  else{
   for(const kind of resourceKinds){
    const rows=s.resources[kind]
    if(!Array.isArray(rows)||rows.length>10000){errors.push('TARGET_INVENTORY_INVALID');continue}
    const seenIds=new Set(),seenNames=new Set()
    for(const r of rows){
     if(!keys(r,['id','name','compose_project','crm_owner'])||!resourceIdentity(kind,r)||typeof r.name!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,254}$/.test(r.name)||![r.compose_project,r.crm_owner].every(x=>x===null||typeof x==='string'&&x.length<=255)){
      errors.push('TARGET_INVENTORY_INVALID');continue
     }
     if(seenIds.has(r.id)||seenNames.has(r.name))errors.push('TARGET_INVENTORY_DUPLICATE')
     seenIds.add(r.id);seenNames.add(r.name)
     if(namespace(r.name)||r.compose_project===targetProfileV1.project||r.crm_owner===targetProfileV1.project)errors.push('TARGET_NAMESPACE_OCCUPIED')
    }
   }
   if(Array.isArray(s.resources.containers)&&s.resources.containers.length!==i?.Containers)errors.push('TARGET_CONTAINER_INVENTORY_INCOMPLETE')
   if(!Array.isArray(s.resources.networks)||s.resources.networks.filter(r=>r?.id===e.shared_network_id&&r?.name==='easypanel').length!==1)errors.push('TARGET_SHARED_NETWORK_NOT_IN_INVENTORY')
  }
  return response(errors)
 }catch{return response(['TARGET_INPUT_INVALID'])}
}

function snapshotFile(path){
 let fd
 try{
  if(typeof path!=='string'||!path.length||path.length>8192||path.startsWith('--')||path.includes('\0'))throw Error()
  const beforePath=lstatSync(path,{bigint:true}),limit=4*1024*1024
  if(!beforePath.isFile()||beforePath.isSymbolicLink()||beforePath.nlink!==1n||beforePath.size<1n||beforePath.size>BigInt(limit))throw Error()
  fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0))
  const before=fstatSync(fd,{bigint:true})
  if(!before.isFile()||before.nlink!==1n||before.ino!==beforePath.ino||before.dev!==beforePath.dev||before.size!==beforePath.size)throw Error()
  const bytes=Buffer.alloc(limit+1);let count=0
  while(count<bytes.length){const n=readSync(fd,bytes,count,bytes.length-count,count);if(!n)break;count+=n}
  const after=fstatSync(fd,{bigint:true})
  if(count>limit||BigInt(count)!==before.size||after.size!==before.size||after.mtimeNs!==before.mtimeNs||after.ctimeNs!==before.ctimeNs)throw Error()
  return {value:JSON.parse(bytes.subarray(0,count).toString('utf8')),sha256:hash(bytes.subarray(0,count))}
 }finally{if(fd!==undefined)closeSync(fd)}
}

// Read-only CLI: protected/stable parents and authenticated collection are
// operator prerequisites. No environment lookup, subprocess, network or writes.
export function targetPreflightCliV1(args,now=Date.now()){
 try{
  if(!Array.isArray(args)||args.length!==4||args[0]!=='--expected'||args[2]!=='--snapshot')return response(['TARGET_ARGUMENTS_INVALID'])
  const e=snapshotFile(args[1]),s=snapshotFile(args[3])
  return {...targetSnapshotPreflightV1({expected:e.value,snapshot:s.value},now),input_sha256:{expected:e.sha256,snapshot:s.sha256}}
 }catch{return response(['TARGET_FILE_UNAVAILABLE_OR_INVALID'])}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=targetPreflightCliV1(process.argv.slice(2))
 process.stdout.write(JSON.stringify(report)+'\n');process.exitCode=report.status==='SNAPSHOT_CONSISTENT'?0:2
}
