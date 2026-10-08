import {createHmac,timingSafeEqual} from 'node:crypto'
import {hash,readJson} from './lib.mjs'
const id=/^[A-Za-z0-9_-]{1,80}$/
export function createWebhookContract({scope,key,authorize,maxQueue=10,timeoutMs=100}){
 if(scope!=='DISPOSABLE_SIMULATION'||!Buffer.isBuffer(key)||key.length<32||typeof authorize!=='function'||!Number.isSafeInteger(maxQueue)||maxQueue<1||!Number.isSafeInteger(timeoutMs)||timeoutMs<1)throw new Error('DISPOSABLE_WEBHOOK_CONTRACT_REQUIRED')
 const registered=new Set(readJson('infra/n8n/registry.json').workflows.map(w=>w.registered_id)),queue=new Map(),used=new Set(),secret=Buffer.from(key)
 let closed=false
 return {
  async ingest(body,signature,now=Date.now()){
   if(closed)throw new Error('WEBHOOK_CLOSED')
   if(typeof body!=='string'||Buffer.byteLength(body)>4096||!/^[a-f0-9]{64}$/.test(signature??''))throw new Error('WEBHOOK_SIZE_OR_SIGNATURE_INVALID')
   if(!timingSafeEqual(createHmac('sha256',secret).update(body).digest(),Buffer.from(signature,'hex')))throw new Error('WEBHOOK_SIGNATURE_INVALID')
   let p;try{p=JSON.parse(body)}catch{throw new Error('WEBHOOK_PAYLOAD_INVALID')}
   if(!p||Object.keys(p).some(k=>!['registered_id','tenant','actor','nonce','at','kind'].includes(k))||!registered.has(p.registered_id)||!['tenant','actor','nonce'].every(k=>id.test(p[k]??''))||p.kind!=='SYNTHETIC_HEALTH'||!Number.isSafeInteger(p.at)||Math.abs(now-p.at)>300000)throw new Error('WEBHOOK_PAYLOAD_INVALID')
   const digest=hash(`${p.tenant}:${p.nonce}`);if(used.has(digest))throw new Error('WEBHOOK_REPLAY_FORBIDDEN')
   let timer
   const controller=new AbortController()
   try{
    const proof=await Promise.race([authorize({tenant:p.tenant,actor:p.actor,signal:controller.signal}),new Promise((_r,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('WEBHOOK_AUTHORIZATION_TIMEOUT'))},timeoutMs)})])
    if(proof?.tenant!==p.tenant||proof?.actor!==p.actor||proof?.authorized!==true)throw new Error('WEBHOOK_AUTHORIZATION_REQUIRED')
   }finally{clearTimeout(timer)}
   // Recheck after await: concurrent authorizations cannot race nonce/capacity.
   if(used.has(digest))throw new Error('WEBHOOK_REPLAY_FORBIDDEN')
   if(queue.size>=maxQueue)throw new Error('WEBHOOK_QUEUE_LIMIT')
   used.add(digest);queue.set(digest,{registered_id:p.registered_id,status:'CAPTURED_INACTIVE',event_digest:digest})
   return {status:'CAPTURED_INACTIVE',event_digest:digest,effects_enabled:false,workflow_executed:false}
  },
  checkpoint(){return {version:1,scope:'DISPOSABLE_SIMULATION',used:[...used],queue:[...queue.values()],effects_enabled:false}},
  resume(state){
   if(closed)throw new Error('WEBHOOK_CLOSED')
   if(state?.version!==1||state.scope!==scope||state.effects_enabled!==false||Object.keys(state).some(k=>!['version','scope','used','queue','effects_enabled'].includes(k))||!Array.isArray(state.used)||!Array.isArray(state.queue)||state.used.length>maxQueue||state.queue.length>maxQueue||new Set(state.used).size!==state.used.length||state.used.some(d=>!/^[a-f0-9]{64}$/.test(d))||state.queue.some(p=>!p||Object.keys(p).some(k=>!['registered_id','status','event_digest'].includes(k))||!registered.has(p.registered_id)||p.status!=='CAPTURED_INACTIVE'||!state.used.includes(p.event_digest)))throw new Error('WEBHOOK_RESUME_INVALID')
   if(used.size||queue.size)throw new Error('WEBHOOK_RESUME_REQUIRES_EMPTY')
   for(const d of state.used)used.add(d);for(const p of state.queue)queue.set(p.event_digest,structuredClone(p))
   return {status:'SIMULATED_RESUME',effects_enabled:false}
  },
  shutdown(){closed=true;secret.fill(0);used.clear();queue.clear()}
 }
}
