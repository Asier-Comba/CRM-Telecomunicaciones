import {open,lstat,realpath} from 'node:fs/promises'
import {constants} from 'node:fs'
import {posix} from 'node:path'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'

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
 let handle;const captures=[]
 try{
  if(!linuxPath(executable)||typeof expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSha256)||typeof expectedVersion!=='string'||!/^2\.[0-9]+\.[0-9]+$/.test(expectedVersion)||!Number.isSafeInteger(probeMilliseconds)||probeMilliseconds<1||probeMilliseconds>5000)deny('GIT_PREFLIGHT_CONTRACT_INVALID')
  if(process.platform!=='linux'||typeof process.geteuid!=='function'||!constants.O_NOFOLLOW)deny('GIT_PREFLIGHT_LINUX_REQUIRED')
  const named=await lstat(executable,{bigint:true})
  if(await realpath(executable)!==executable)deny('GIT_EXECUTABLE_INVALID')
  handle=await open(executable,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK)
  const initial=await handle.stat({bigint:true})
  if(!same(named,initial)||!initial.isFile()||initial.nlink!==1n||initial.size<1n||initial.size>64n*1024n*1024n||(initial.uid!==0n&&initial.uid!==BigInt(process.geteuid()))||(initial.mode&0o022n)!==0n||(initial.mode&0o111n)===0n)deny('GIT_EXECUTABLE_INVALID')
  const digest=createHash('sha256');let position=0
  while(position<Number(initial.size)){
   const bytes=Buffer.alloc(Math.min(65536,Number(initial.size)-position))
   try{const read=await handle.read(bytes,0,bytes.length,position);if(!read.bytesRead)deny('GIT_EXECUTABLE_CHANGED');position+=read.bytesRead;digest.update(bytes.subarray(0,read.bytesRead))}finally{bytes.fill(0)}
  }
  result.executable_sha256=digest.digest('hex')
  if(result.executable_sha256!==expectedSha256)deny('GIT_EXECUTABLE_PIN_MISMATCH')
  if(!same(initial,await handle.stat({bigint:true})))deny('GIT_EXECUTABLE_CHANGED')
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
  for(const bytes of captures)bytes.fill(0)
  if(handle)try{await handle.close()}catch{result.result='BLOCKED';result.error='GIT_EXECUTABLE_CLOSE_FAILED'}
 }
 return result
}
