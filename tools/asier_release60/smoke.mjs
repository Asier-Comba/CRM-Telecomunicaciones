import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import { randomBytes, createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'
import { regularFiles } from './package.mjs'

const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
export function isolatedEnvironment(){
  const result={NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',PLATFORM_TARGET:'LOCAL',APP_ENV:'test',PRODUCT_V1_ENABLED:'false',AI_ENABLED:'false',N8N_ENABLED:'false',AUTH_EMAIL_ENABLED:'false'}
  for(const name of ['PATH','SystemRoot','TEMP','TMP','ComSpec'])if(process.env[name])result[name]=process.env[name]
  return result
}
async function freePort(){
  const server=createServer();await new Promise((accept,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',accept)})
  const port=server.address().port;await new Promise(accept=>server.close(accept));return port
}
export async function smokeRuntime(directory,{entry='scripts/platform/entrypoint.mjs',staticSource=directory,publicSource=directory}={}){
  const root=resolve(directory),port=await freePort(),origin='http://127.0.0.1:'+port
  const canaries=Object.fromEntries(['SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY','N8N_API_KEY'].map(name=>[name,'w60_runtime_'+randomBytes(24).toString('hex')]))
  let logs='',spawnError=false,logOverflow=false
  const child=spawn(process.execPath,[entry],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...isolatedEnvironment(),...canaries,PORT:String(port),HOSTNAME:'127.0.0.1'}})
  child.once('error',()=>{spawnError=true})
  for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{logs+=chunk.toString();if(logs.length>2*1024*1024){logOverflow=true;logs=logs.slice(-2*1024*1024)}})
  const checks={liveness:false,security_headers:false,missing_backend_closed:false,product_disabled:false,static_bytes:false,public_bytes:false,runtime_logs_private_values_absent:false}
  try{
    let live
    for(let i=0;i<80;i++){
      if(spawnError||child.exitCode!==null)throw Error('ARTIFACT_SERVER_START_FAILED')
      try{live=await fetch(origin+'/api/health/live',{signal:AbortSignal.timeout(1000)});if(live.ok)break}catch{}
      await new Promise(accept=>setTimeout(accept,250))
    }
    if(!live?.ok)throw Error('ARTIFACT_LIVENESS_FAILED')
    checks.liveness=(await live.json()).status==='alive'
    checks.security_headers=[['x-content-type-options','nosniff'],['x-frame-options','DENY'],['cache-control','no-store']].every(([name,value])=>live.headers.get(name)===value)
    const ready=await fetch(origin+'/api/health/ready',{signal:AbortSignal.timeout(3000)})
    checks.missing_backend_closed=ready.status===503&&(await ready.json()).status==='not_ready'
    const product=await fetch(origin+'/api/product/v1/commands',{method:'POST',signal:AbortSignal.timeout(3000)})
    checks.product_disabled=product.status===503
    for(const [kind,source,prefix]of [['static',staticSource,'.next/static'],['public',publicSource,'public']]){
      const base=resolve(source,prefix),file=regularFiles(base).find(path=>kind==='public'||/\.(?:css|js)$/.test(path))
      if(!file)throw Error('SMOKE_ASSET_REQUIRED')
      const pathname=(kind==='static'?'/_next/static/':'/')+relative(base,file).split(sep).map(encodeURIComponent).join('/')
      const response=await fetch(origin+pathname,{signal:AbortSignal.timeout(5000)})
      checks[kind+'_bytes']=response.status===200&&digest(Buffer.from(await response.arrayBuffer()))===digest(readFileSync(file))
    }
    checks.runtime_logs_private_values_absent=!logOverflow&&Object.values(canaries).every(value=>!logs.includes(value)&&!logs.includes(Buffer.from(value).toString('base64')))
    return {status:Object.values(checks).every(Boolean)?'PASS':'FAIL',scope:'RELOCATED_LOCAL_UNCONFIGURED_BYTES_NOT_AUTH_OR_HOSTED_ACCEPTANCE',checks,provider_credentials_inherited:false,external_provider_configured:false,business_commands:0}
  }finally{
    if(child.pid&&child.exitCode===null){
      if(process.platform==='win32')try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'})}catch{if(child.exitCode===null)child.kill()}
      else child.kill('SIGTERM')
      await new Promise(accept=>{if(child.exitCode!==null)return accept();child.once('exit',accept);setTimeout(()=>{child.kill('SIGKILL');accept()},5000).unref()})
    }
  }
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){
  try{
    const [directory,output,mode,assets]=process.argv.slice(2)
    const result=await smokeRuntime(directory,mode==='raw'?{entry:'server.js',staticSource:assets,publicSource:assets}:{})
    writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
    if(result.status!=='PASS')process.exitCode=1
  }catch(error){console.error(JSON.stringify({status:'FAIL',error:/^[A-Z_]+$/.test(error.message)?error.message:'ARTIFACT_SMOKE_FAILED'}));process.exitCode=1}
}
