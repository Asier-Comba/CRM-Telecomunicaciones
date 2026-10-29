import {constants,lstatSync,openSync,fstatSync,readSync,closeSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {composePreflightV1} from './compose-preflight.mjs'

const options=Object.freeze({
 '--compose':{name:'configuration',limit:256*1024},
 '--receipt':{name:'receipt',limit:16*1024},
 '--expected':{name:'expected',limit:16*1024},
 '--policy':{name:'policy',limit:16*1024},
 '--binding':{name:'binding',limit:16*1024}
})
const blocked=code=>({version:'staging.manual-preflight.v1',status:'BLOCKED',errors:[code],source_evidence:'NOT_AUTHENTICATED',effective_plan_status:'EFFECTIVE_PLAN_UNVERIFIED',values_included:false,mutation_performed:false,publishing_authorized:false,deploying_authorized:false,external_evidence_verified:false,hosted_acceptance:'NOT_RUN'})
function readSnapshot(path,limit){
 let fd
 try{
  const link=lstatSync(path,{bigint:true})
  if(!link.isFile()||link.isSymbolicLink()||link.nlink!==1n||link.size<1n||link.size>BigInt(limit))throw Error('MANUAL_INPUT_FILE_INVALID')
  fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0))
  const before=fstatSync(fd,{bigint:true})
  if(!before.isFile()||before.nlink!==1n||before.dev!==link.dev||before.ino!==link.ino||before.size!==link.size)throw Error('MANUAL_INPUT_IDENTITY_CHANGED')
  const bytes=Buffer.alloc(limit+1);let count=0
  while(count<bytes.length){const n=readSync(fd,bytes,count,bytes.length-count,count);if(n===0)break;count+=n}
  const after=fstatSync(fd,{bigint:true})
  if(count>limit||BigInt(count)!==before.size||after.size!==before.size||after.mtimeNs!==before.mtimeNs||after.ctimeNs!==before.ctimeNs)throw Error('MANUAL_INPUT_CHANGED')
  const input=bytes.subarray(0,count)
  let value;try{value=JSON.parse(input.toString('utf8'))}catch{throw Error('MANUAL_INPUT_JSON_INVALID')}
  return {value,sha256:createHash('sha256').update(input).digest('hex')}
 }catch(error){
  const allowed=['MANUAL_INPUT_FILE_INVALID','MANUAL_INPUT_IDENTITY_CHANGED','MANUAL_INPUT_CHANGED','MANUAL_INPUT_JSON_INVALID']
  throw Error(allowed.includes(error?.message)?error.message:'MANUAL_INPUT_UNAVAILABLE')
 }finally{if(fd!==undefined)closeSync(fd)}
}

/** Reads five bounded JSON snapshots only. No credential-file content, environment,
 * network, Docker, subprocess, configuration write or deployment capability.
 * Protected/stable parent directories and authenticated external evidence are
 * operator preconditions; this does not claim hostile-writer race resistance.
 */
export function manualPreflightV1(args){
 try{
  if(!Array.isArray(args)||args.length!==Object.keys(options).length*2)throw Error('MANUAL_ARGUMENTS_INVALID')
  const paths={}
  for(let n=0;n<args.length;n+=2){
   const flag=args[n],path=args[n+1]
   if(typeof flag!=='string'||!Object.hasOwn(options,flag)||Object.hasOwn(paths,flag)||typeof path!=='string'||!path||path.length>8192||path.startsWith('--')||path.includes('\0'))throw Error('MANUAL_ARGUMENTS_INVALID')
   paths[flag]=path
  }
  const inputs={},hashes={}
  for(const [flag,{name,limit}]of Object.entries(options)){
   const snapshot=readSnapshot(paths[flag],limit);inputs[name]=snapshot.value;hashes[name]=snapshot.sha256
  }
  const checked=composePreflightV1(inputs)
  return {...checked,version:'staging.manual-preflight.v1',input_sha256:hashes,execution:'READ_ONLY_JSON_SNAPSHOTS',source_evidence:'NOT_AUTHENTICATED',effective_plan_status:'EFFECTIVE_PLAN_UNVERIFIED',external_evidence_verified:false,publishing_authorized:false,deploying_authorized:false}
 }catch(error){
  const allowed=['MANUAL_ARGUMENTS_INVALID','MANUAL_INPUT_FILE_INVALID','MANUAL_INPUT_IDENTITY_CHANGED','MANUAL_INPUT_CHANGED','MANUAL_INPUT_JSON_INVALID','MANUAL_INPUT_UNAVAILABLE']
  return blocked(allowed.includes(error?.message)?error.message:'MANUAL_PREFLIGHT_FAILED')
 }
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=manualPreflightV1(process.argv.slice(2))
 process.stdout.write(JSON.stringify(report)+'\n')
 process.exitCode=report.status==='CONFIGURATION_CHECKED'?0:2
}
