import {open,lstat,realpath} from 'node:fs/promises'
import {constants} from 'node:fs'
import {posix} from 'node:path'
import {createHash} from 'node:crypto'
import {spawn,spawnSync} from 'node:child_process'
import {performance} from 'node:perf_hooks'
import {syntheticPrivateHistoryProducerV1} from './synthetic-history-producer.mjs'
import {openPrivateScanInputV1} from './private-scan-input.mjs'
import {pinnedHistoryObjectIdsV1} from './private-history-batch.mjs'

class PreflightFailure extends Error{}
const deny=code=>{throw new PreflightFailure(code)}
const env=Object.freeze({LC_ALL:'C',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_SYSTEM:'/dev/null',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0'})
const flags=Object.freeze(['--no-lazy-fetch','--no-replace-objects','--no-optional-locks','--no-pager'])
const linuxPath=value=>typeof value==='string'&&value.length<4096&&value!=='/'&&value.startsWith('/')&&!value.endsWith('/')&&!/[\x00-\x1f\x7f\\:]/.test(value)&&posix.normalize(value)===value
const same=(a,b)=>['dev','ino','size','mtimeNs','ctimeNs','uid','gid','mode','nlink'].every(key=>a[key]===b[key])
const versionOf=bytes=>{
 if(!Buffer.isBuffer(bytes)||bytes.length>65536)deny('GIT_METADATA_INVALID')
 const match=/^git version (2\.[0-9]+\.[0-9]+)\r?\n?$/.exec(bytes.toString('utf8'))
 if(!match)deny('GIT_METADATA_INVALID');return match[1]
}

// Shared private ownership core. The caller's finally owns any handle acquired
// even if hashing/validation fails. It issues neither enrollment nor authority.
async function verifiedExecutable(executable,expectedSha256,owned){
 if(process.platform!=='linux'||typeof process.geteuid!=='function'||!constants.O_NOFOLLOW)deny('GIT_PREFLIGHT_LINUX_REQUIRED')
 const named=await lstat(executable,{bigint:true})
 if(await realpath(executable)!==executable)deny('GIT_EXECUTABLE_INVALID')
 const handle=owned.handle=await open(executable,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK)
 const initial=await handle.stat({bigint:true})
 if(!same(named,initial)||!initial.isFile()||initial.nlink!==1n||initial.size<1n||initial.size>64n*1024n*1024n||(initial.uid!==0n&&initial.uid!==BigInt(process.geteuid()))||(initial.mode&0o022n)!==0n||(initial.mode&0o111n)===0n)deny('GIT_EXECUTABLE_INVALID')
 const digest=createHash('sha256');let position=0
 while(position<Number(initial.size)){
  const bytes=Buffer.alloc(Math.min(65536,Number(initial.size)-position))
  try{const read=await handle.read(bytes,0,bytes.length,position);if(!read.bytesRead)deny('GIT_EXECUTABLE_CHANGED');position+=read.bytesRead;digest.update(bytes.subarray(0,read.bytesRead))}finally{bytes.fill(0)}
 }
 const sha256=owned.sha256=digest.digest('hex')
 if(sha256!==expectedSha256)deny('GIT_EXECUTABLE_PIN_MISMATCH')
 if(!same(initial,await handle.stat({bigint:true})))deny('GIT_EXECUTABLE_CHANGED')
 return{handle,initial,sha256}
}

// Private structured command capability only. No execution and no repository
// identity/availability claim. JSON cannot serialize its path-bearing commands.
export function fixedGitProducerCommandV1(repository){
 if(!linuxPath(repository))deny('GIT_REPOSITORY_PATH_INVALID')
 const argv=[...flags,'-c','safe.directory='+repository,'-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','credential.helper=','-c','protocol.allow=never','-C',repository,'cat-file','--batch']
 return Object.freeze({argv:()=>[...argv],environment:()=>({...env})})
}

// Pure synthetic capture parser; not a proof of an executed binary or authority.
export function parseGitMetadataCapturesV1({version,flagVersion,help,expectedVersion}={}){
 if(typeof expectedVersion!=='string'||!/^2\.[0-9]+\.[0-9]+$/.test(expectedVersion))deny('GIT_METADATA_INVALID')
 const actual=versionOf(version)
 if(actual!==expectedVersion||versionOf(flagVersion)!==actual||!Buffer.isBuffer(help)||help.length>65536)deny('GIT_METADATA_INVALID')
 const text=help.toString('utf8')
 if(!/(?:^|[^\w-])--batch(?:[^\w-]|$)/.test(text)||!/(?:^|[^\w-])--batch-check(?:[^\w-]|$)/.test(text))deny('GIT_METADATA_INVALID')
 return{version:actual,global_flags_accepted:true,batch_help_advertised:true,batch_check_help_advertised:true}
}

// Only three metadata commands, never -C, a repository, stdin object IDs or Git
// history. Not called on import/ordinary mode and not connected to real producer.
// Tests execute private synthetic fixtures only. Actual use needs prior review
// of the independently enrolled executable pin; this result grants no authority.
export async function gitExecutableMetadataPreflightV1({mode,executable,expectedSha256,expectedVersion,probeMilliseconds=5000}={}){
 const result={result:'NOT_RUN',error:null,probes_attempted:0,executable_sha256:null,repository_verified:false,real_history_authorized:false,publishing_authorized:false,security_accepted:false}
 if(mode!=='EXECUTABLE_METADATA_ONLY')return result
 const owned={},captures=[]
 try{
  if(!linuxPath(executable)||typeof expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSha256)||typeof expectedVersion!=='string'||!/^2\.[0-9]+\.[0-9]+$/.test(expectedVersion)||!Number.isSafeInteger(probeMilliseconds)||probeMilliseconds<1||probeMilliseconds>5000)deny('GIT_PREFLIGHT_CONTRACT_INVALID')
  const {handle,initial,sha256}=await verifiedExecutable(executable,expectedSha256,owned)
  result.executable_sha256=sha256
  const fdExecutable='/proc/'+process.pid+'/fd/'+handle.fd
  for(const [index,argv] of [['--version'],[...flags,'--version'],['cat-file','-h']].entries()){
   if(!same(initial,await handle.stat({bigint:true})))deny('GIT_EXECUTABLE_CHANGED')
   const capture=spawnSync(fdExecutable,argv,{cwd:'/',env:{...env},shell:false,stdio:['ignore','pipe','pipe'],timeout:probeMilliseconds,killSignal:'SIGKILL',maxBuffer:65536,windowsHide:true})
   result.probes_attempted++
   const stdout=Buffer.isBuffer(capture.stdout)?capture.stdout:Buffer.alloc(0),stderr=Buffer.isBuffer(capture.stderr)?capture.stderr:Buffer.alloc(0)
   try{
    if(capture.error?.code==='ETIMEDOUT')deny('GIT_METADATA_TIMEOUT')
    if(capture.error?.code==='ENOBUFS')deny('GIT_METADATA_OUTPUT_LIMIT')
    if(stdout.length+stderr.length>65536)deny('GIT_METADATA_OUTPUT_LIMIT')
    if(capture.error||capture.signal||capture.status!==(index===2?129:0))deny('GIT_METADATA_PROCESS_FAILED')
    if(index!==2&&versionOf(stdout)!==expectedVersion)deny('GIT_METADATA_INVALID')
    captures.push(index===2?Buffer.concat([stdout,stderr]):Buffer.from(stdout))
   }finally{stdout.fill(0);stderr.fill(0)}
   if(!same(initial,await handle.stat({bigint:true})))deny('GIT_EXECUTABLE_CHANGED')
  }
  if(!same(initial,await lstat(executable,{bigint:true})))deny('GIT_EXECUTABLE_CHANGED')
  Object.assign(result,parseGitMetadataCapturesV1({version:captures[0],flagVersion:captures[1],help:captures[2],expectedVersion}),{result:'EXECUTABLE_METADATA_CHECKED'})
 }catch(error){result.result='BLOCKED';result.error=error instanceof PreflightFailure?error.message:'GIT_PREFLIGHT_BLOCKED'}
 finally{
  result.executable_sha256??=owned.sha256??null
  for(const bytes of captures)bytes.fill(0)
  if(owned.handle)try{await owned.handle.close()}catch{result.result='BLOCKED';result.error='GIT_EXECUTABLE_CLOSE_FAILED'}
 }
 return result
}

// PREPARATION ONLY. This registry cannot mint production capabilities. Its
// opaque fixtures are ALWAYS rejected by producePinnedHistoryTransferV1.
// Same-process hostile code/euid and provenance are not authenticated by JS.
const fixtureLeases=new WeakMap(),fixtureBinding='SYNTHETIC_LEASE_V1'
const fixtureReport=(error,result='BLOCKED')=>({result,error,domain:'SYNTHETIC_ONLY',lease_cleanup:'NOT_ACQUIRED',publishing_authorized:false,real_history_authorized:false,security_accepted:false})
const fixtureRecord=capability=>capability!==null&&(typeof capability==='object'||typeof capability==='function')?fixtureLeases.get(capability):undefined
function closeFixtureFd(record){
 record.closePromise??=(async()=>{try{await record.handle.close();return'PASS'}catch{return'FAIL'}})()
 return record.closePromise
}
export async function disposeSyntheticHistoryExecutableLeaseV1(capability){
 const record=fixtureRecord(capability)
 if(!record)return fixtureReport('SYNTHETIC_LEASE_INVALID')
 record.disposed=true
 if(record.state==='READY')record.state='DISPOSED'
 if(record.child)try{record.child.kill('SIGTERM')}catch{}
 if(record.operation)await record.operation
 const cleanup=await closeFixtureFd(record);record.state='DISPOSED'
 return{...fixtureReport(cleanup==='PASS'?null:'SYNTHETIC_LEASE_CLOSE_FAILED',cleanup==='PASS'?'DISPOSED':'BLOCKED'),lease_cleanup:cleanup}
}
async function rejectFixture(record,code){
 record.state='REJECTED'
 const cleanup=await closeFixtureFd(record)
 record.outcome={...fixtureReport(cleanup==='PASS'?code:'SYNTHETIC_LEASE_CLOSE_FAILED'),lease_cleanup:cleanup}
 return record.outcome
}
async function consumeFixture(record){
 let report=fixtureReport('SYNTHETIC_LEASE_BLOCKED')
 try{
  const valid=async()=>same(record.initial,await record.handle.stat({bigint:true}))&&same(record.initial,await lstat(record.executable,{bigint:true}))
  if(!await valid())deny('SYNTHETIC_LEASE_EXECUTABLE_CHANGED')
  if(record.disposed||performance.now()>=record.deadline)deny('SYNTHETIC_LEASE_EXPIRED_OR_DISPOSED')
  const remaining=Math.max(1,Math.floor(record.deadline-performance.now()))
  report={...await syntheticPrivateHistoryProducerV1({mode:'SYNTHETIC_ONLY',ids:record.ids,parent:record.parent,milliseconds:remaining,terminationMilliseconds:100,
   startSyntheticChild:()=>{
    if(record.disposed||performance.now()>=record.deadline)deny('SYNTHETIC_LEASE_EXPIRED_OR_DISPOSED')
    const child=spawn('/proc/'+process.pid+'/fd/'+record.handle.fd,record.command.argv(),{cwd:'/',env:record.command.environment(),shell:false,stdio:['pipe','pipe','pipe'],windowsHide:true})
    record.child=child;return child
   },
   consumeSyntheticTransfer:async directory=>{
    const session=await openPrivateScanInputV1(directory,{historyNames:record.ids})
    try{
     for(const id of record.ids){
      const bytes=await session.read(id,1024*1024)
      try{if(createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex')!==id)deny('SYNTHETIC_LEASE_TRANSFER_CHANGED')}finally{bytes.fill(0)}
     }
     return await session.verify()
    }finally{await session.close()}
   },
  }),domain:'SYNTHETIC_ONLY',real_history_authorized:false}
  if(!await valid())deny('SYNTHETIC_LEASE_EXECUTABLE_CHANGED')
  if(record.disposed||performance.now()>=record.deadline)deny('SYNTHETIC_LEASE_EXPIRED_OR_DISPOSED')
 }catch(error){report={...fixtureReport(error instanceof PreflightFailure?error.message:'SYNTHETIC_LEASE_BLOCKED'),transport_process_cleanup:report.transport_process_cleanup??report.process_cleanup??'NOT_STARTED',transfer_cleanup:report.cleanup??'NOT_STARTED'}}
 finally{
  const cleanup=await closeFixtureFd(record)
  report.lease_cleanup=cleanup
  if(cleanup!=='PASS')report={...fixtureReport('SYNTHETIC_LEASE_CLOSE_FAILED'),lease_cleanup:cleanup}
  record.child=null;record.state='CONSUMED';record.outcome=report
 }
 return report
}
// Lookup and the READY->CONSUMING transition are synchronous, before any await.
export function consumeSyntheticHistoryExecutableLeaseV1(capability,{binding=fixtureBinding}={}){
 const record=fixtureRecord(capability)
 if(!record)return Promise.resolve(fixtureReport('SYNTHETIC_LEASE_INVALID'))
 if(record.state!=='READY'||record.disposed)return Promise.resolve(fixtureReport('SYNTHETIC_LEASE_TERMINAL'))
 if(binding!==fixtureBinding)return rejectFixture(record,'SYNTHETIC_LEASE_BINDING_MISMATCH')
 if(performance.now()>=record.deadline)return rejectFixture(record,'SYNTHETIC_LEASE_EXPIRED_OR_DISPOSED')
 record.state='CONSUMING';record.operation=consumeFixture(record)
 return record.operation
}
// Only a synthetic fixture scope; expected hash/path/binding are NOT enrollment.
// The fixture script prefix is an accident guard, not hostile-code isolation.
// No metadata probes, actual Git, history IDs or real authority are invoked.
export async function withSyntheticHistoryExecutableLeaseV1({mode,executable,expectedSha256,repository,parent,ids,milliseconds=30000}={},useFixture){
 if(mode!=='SYNTHETIC_LEASE_ONLY')return fixtureReport(null,'NOT_RUN')
 const owned={};let capability,record,timer,report=fixtureReport('SYNTHETIC_LEASE_INVALID')
 const started=performance.now()
 try{
  if(!linuxPath(executable)||typeof expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSha256)||!linuxPath(parent)||typeof useFixture!=='function'||!Array.isArray(ids)||ids.length!==3||new Set(ids).size!==3||ids.some(id=>typeof id!=='string'||!/^[a-f0-9]{40}$/.test(id)||pinnedHistoryObjectIdsV1.includes(id))||!Number.isSafeInteger(milliseconds)||milliseconds<1||milliseconds>30000)deny('SYNTHETIC_LEASE_INVALID')
  const capturedIds=Object.freeze([...ids]),command=fixedGitProducerCommandV1(repository)
  const {handle,initial}=await verifiedExecutable(executable,expectedSha256,owned)
  const prefix=Buffer.from('#!'+process.execPath+'\n// W4_SYNTHETIC_HISTORY_LEASE_V1\n'),observed=Buffer.alloc(prefix.length)
  try{const read=await handle.read(observed,0,observed.length,0);if(read.bytesRead!==prefix.length||!observed.equals(prefix))deny('SYNTHETIC_LEASE_FIXTURE_REQUIRED')}finally{prefix.fill(0);observed.fill(0)}
  if(!same(initial,await handle.stat({bigint:true})))deny('SYNTHETIC_LEASE_EXECUTABLE_CHANGED')
  capability=Object.freeze(Object.create(null))
  record={handle,initial,executable,command,parent,ids:capturedIds,deadline:started+milliseconds,state:'READY',disposed:false,child:null,operation:null,closePromise:null,outcome:null}
  fixtureLeases.set(capability,record)
  if(performance.now()>=record.deadline)deny('SYNTHETIC_LEASE_EXPIRED_OR_DISPOSED')
  const expired=new Promise(resolve=>{timer=setTimeout(()=>{record.disposed=true;void disposeSyntheticHistoryExecutableLeaseV1(capability).catch(()=>{});resolve('EXPIRED')},Math.max(1,record.deadline-performance.now()))})
  // The trusted fixture callback receives no FD/path/command. Its return value
  // cannot fabricate a successful outcome; only the private operation can.
  const use=Promise.resolve().then(()=>useFixture(capability))
  if(await Promise.race([use,expired])==='EXPIRED')report=fixtureReport('SYNTHETIC_LEASE_EXPIRED_OR_DISPOSED')
  else report=record.outcome??fixtureReport('SYNTHETIC_LEASE_NOT_CONSUMED')
 }catch(error){report=fixtureReport(error instanceof PreflightFailure?error.message:'SYNTHETIC_LEASE_BLOCKED')}
 finally{
  clearTimeout(timer)
  if(record){
   const cleanup=await disposeSyntheticHistoryExecutableLeaseV1(capability)
   report.lease_cleanup=cleanup.lease_cleanup
   report.transport_process_cleanup??=record.outcome?.transport_process_cleanup??record.outcome?.process_cleanup??'NOT_STARTED'
   if(cleanup.lease_cleanup!=='PASS')report={...fixtureReport('SYNTHETIC_LEASE_CLOSE_FAILED'),lease_cleanup:cleanup.lease_cleanup}
  }else if(owned.handle)try{await owned.handle.close();report.lease_cleanup='PASS'}catch{report={...fixtureReport('SYNTHETIC_LEASE_CLOSE_FAILED'),lease_cleanup:'FAIL'}}
 }
 return report
}
