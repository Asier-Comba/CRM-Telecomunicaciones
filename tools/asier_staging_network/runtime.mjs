import {constants,openSync,fstatSync,readSync,closeSync,readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {evaluateRuntime} from '../../scripts/platform/runtime-admission.mjs'
import {stagingEasyPanelOriginV1} from '../../src/lib/server/product-staging-admission-v1.ts'
import {createIngressGateway,createEgressGateway} from './gateway.mjs'

export function gatewayRuntimeSettingsV1(role,env,policy,binding){
 if(!['ingress','egress'].includes(role))throw Error('GATEWAY_ROLE_INVALID')
 if(env.PLATFORM_TARGET!=='STAGING'||env.APP_ENV!=='staging'||env.PRODUCT_V1_ORIGIN!==stagingEasyPanelOriginV1||env.PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED!=='true'||!evaluateRuntime(env,'STAGING',policy,binding).accepted)throw Error('GATEWAY_RUNTIME_ADMISSION_DENIED')
 return Object.freeze({role,origin:stagingEasyPanelOriginV1,port:8080,host:'0.0.0.0'})
}

export function readIngressCredentialV1(){
 let fd
 try{
  if(process.platform!=='linux'||typeof constants.O_NOFOLLOW!=='number')throw Error()
  fd=openSync('/run/secrets/crm-staging-ingress',constants.O_RDONLY|constants.O_NOFOLLOW)
  const stat=fstatSync(fd)
  if(!stat.isFile()||stat.uid!==65532||(stat.mode&0o777)!==0o400||stat.size<1||stat.size>4096)throw Error()
  const bytes=Buffer.alloc(4097),count=readSync(fd,bytes,0,bytes.length,0)
  if(count>4096)throw Error()
  const value=JSON.parse(bytes.subarray(0,count).toString('utf8'))
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='password,username'||typeof value.username!=='string'||typeof value.password!=='string')throw Error()
  return value
 }catch{throw Error('GATEWAY_CREDENTIAL_INVALID')}finally{if(fd!==undefined)closeSync(fd)}
}

function imageJson(path){try{return JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'))}catch{throw Error('GATEWAY_RUNTIME_FILES_INVALID')}}
export function closeGatewayRuntimeV1(server,{deadlineMs=30000}={}){
 if(!Number.isInteger(deadlineMs)||deadlineMs<10||deadlineMs>30000)throw Error('GATEWAY_SHUTDOWN_BUDGET_INVALID')
 return new Promise(resolve=>{
  let forced=false
  const timer=setTimeout(()=>{forced=true;server.closeAllConnections()},deadlineMs);timer.unref()
  server.close(error=>{clearTimeout(timer);resolve({closed:!error,forced})})
 })
}
async function main(){
 if(process.platform!=='linux'||process.getuid?.()!==65532)throw Error('GATEWAY_RUNTIME_USER_REQUIRED')
 if(process.argv.length!==3)throw Error('GATEWAY_ROLE_INVALID')
 const settings=gatewayRuntimeSettingsV1(process.argv[2],process.env,imageJson('../../infra/platform/product-staging-runtime-policy.json'),imageJson('../../infra/platform/public-build-binding.json'))
 // No credential access or listener before actual image policy/config/build admission.
 const server=settings.role==='ingress'?createIngressGateway({origin:settings.origin,...readIngressCredentialV1()}):createEgressGateway()
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(settings.port,settings.host,resolve)})
 let stopping
 const stop=()=>{stopping??=closeGatewayRuntimeV1(server).then(result=>{if(!result.closed||result.forced)process.exitCode=1})}
 process.once('SIGTERM',stop);process.once('SIGINT',stop)
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(error=>{
 const allowed=new Set(['GATEWAY_ROLE_INVALID','GATEWAY_RUNTIME_ADMISSION_DENIED','GATEWAY_CREDENTIAL_INVALID','GATEWAY_RUNTIME_USER_REQUIRED','GATEWAY_RUNTIME_FILES_INVALID'])
 console.error(allowed.has(error?.message)?error.message:'GATEWAY_START_FAILED');process.exitCode=1
})
