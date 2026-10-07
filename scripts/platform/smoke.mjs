import {spawn} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {root,safeError,readJson} from './lib.mjs'
const app='http://127.0.0.1:3199'
let child,browser,logs=''
const bindings=Object.fromEntries(readJson('infra/platform/environment-manifest.json').entries.filter(e=>e.secret).map(e=>[e.name,`w5_runtime_${randomBytes(24).toString('hex')}`]))
const canaries=Object.values(bindings)
try{
 // Isolated build smoke: no inherited provider/DB/mail/AI credentials or URLs.
 child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3199'],{cwd:root,stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,NODE_ENV:'production',PLATFORM_TARGET:'LOCAL',NEXT_TELEMETRY_DISABLED:'1',...bindings}})
 for(const stream of [child.stdout,child.stderr])stream.on('data',bytes=>{logs+=bytes.toString();if(logs.length>2*1024*1024)logs=logs.slice(-2*1024*1024)})
 let live
 for(let i=0;i<60;i++){try{live=await fetch(app+'/api/health/live',{signal:AbortSignal.timeout(1000)});if(live.ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
 if(!live?.ok||(await live.json()).status!=='alive')throw new Error('LIVENESS_SMOKE_FAILED')
 for(const [name,value]of [['x-content-type-options','nosniff'],['x-frame-options','DENY'],['cache-control','no-store']])if(live.headers.get(name)!==value)throw new Error('SECURITY_HEADER_SMOKE_FAILED')
 const ready=await fetch(app+'/api/health/ready',{signal:AbortSignal.timeout(3000)})
 if(ready.status!==503||(await ready.json()).status!=='not_ready')throw new Error('MISSING_BACKEND_FAIL_CLOSED_SMOKE_FAILED')
 const product=await fetch(app+'/api/product/v1/commands',{method:'POST',signal:AbortSignal.timeout(3000)})
 if(product.status!==503)throw new Error('UNCONFIGURED_PRODUCT_SMOKE_FAILED')
 let screenshots='NOT_RUN'
 if(process.env.W5_BROWSER_BOUNDARY==='true'){
  const {chromium}=await import('@playwright/test')
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}})
  await page.goto(app+'/login',{waitUntil:'networkidle'})
  const markup=await page.content()
  if(canaries.some(v=>markup.includes(v)))throw new Error('PRIVATE_VALUE_IN_SCREENSHOT_DOM')
  const directory=join(process.env.RUNNER_TEMP??join(root,'.next'),'w5-synthetic-browser')
  mkdirSync(directory,{recursive:true})
  const pixels=await page.screenshot({fullPage:true})
  if(canaries.some(v=>pixels.includes(v)))throw new Error('PRIVATE_VALUE_IN_SCREENSHOT_ARTIFACT')
  writeFileSync(join(directory,'unconfigured-login.png'),pixels)
  screenshots='PASS_SYNTHETIC_DOM_AND_ARTIFACT_BOUNDARY'
 }
 if(canaries.some(v=>logs.includes(v)))throw new Error('PRIVATE_VALUE_IN_RUNTIME_LOG')
 console.log(JSON.stringify({status:'PASS',build_server:'PASS',liveness:'PASS',headers:'PASS',unconfigured_readiness:'FAIL_CLOSED',unconfigured_product:'FAIL_CLOSED',runtime_secret_classes:canaries.length,runtime_logs:'PASS',screenshots,provider_calls:false}))
}catch(e){console.error(JSON.stringify({status:'FAIL',error:safeError(e)}));process.exitCode=1}
finally{if(browser)await browser.close();if(child){child.kill('SIGTERM');await new Promise(r=>{if(child.exitCode!==null)return r();child.once('exit',r);setTimeout(()=>{child.kill('SIGKILL');r()},5000).unref()})}}
