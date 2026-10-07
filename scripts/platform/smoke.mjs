import {spawn} from 'node:child_process'
import {root,safeError} from './lib.mjs'
const app='http://127.0.0.1:3199'
let child
try{
 // Isolated build smoke: no inherited provider/DB/mail/AI credentials or URLs.
 child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3199'],{cwd:root,stdio:'ignore',env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,NODE_ENV:'production',PLATFORM_TARGET:'LOCAL',NEXT_TELEMETRY_DISABLED:'1'}})
 let live
 for(let i=0;i<60;i++){try{live=await fetch(app+'/api/health/live',{signal:AbortSignal.timeout(1000)});if(live.ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
 if(!live?.ok||(await live.json()).status!=='alive')throw new Error('LIVENESS_SMOKE_FAILED')
 for(const [name,value]of [['x-content-type-options','nosniff'],['x-frame-options','DENY'],['cache-control','no-store']])if(live.headers.get(name)!==value)throw new Error('SECURITY_HEADER_SMOKE_FAILED')
 const ready=await fetch(app+'/api/health/ready',{signal:AbortSignal.timeout(3000)})
 if(ready.status!==503||(await ready.json()).status!=='not_ready')throw new Error('MISSING_BACKEND_FAIL_CLOSED_SMOKE_FAILED')
 const product=await fetch(app+'/api/product/v1/commands',{method:'POST',signal:AbortSignal.timeout(3000)})
 if(product.status!==503)throw new Error('UNCONFIGURED_PRODUCT_SMOKE_FAILED')
 console.log(JSON.stringify({status:'PASS',build_server:'PASS',liveness:'PASS',headers:'PASS',unconfigured_readiness:'FAIL_CLOSED',unconfigured_product:'FAIL_CLOSED',provider_calls:false}))
}catch(e){console.error(JSON.stringify({status:'FAIL',error:safeError(e)}));process.exitCode=1}
finally{if(child){child.kill('SIGTERM');await new Promise(r=>{if(child.exitCode!==null)return r();child.once('exit',r);setTimeout(()=>{child.kill('SIGKILL');r()},5000).unref()})}}
