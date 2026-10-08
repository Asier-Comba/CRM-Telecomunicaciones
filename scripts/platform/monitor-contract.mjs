import {hash} from './lib.mjs'
const components=new Set(['app','database','auth','storage','backup','mail','n8n','worker','tls'])
export function healthSample(component,input,limits){
 if(!components.has(component)||!limits||!Object.values(limits).every(v=>Number.isSafeInteger(v)&&v>=0))throw new Error('MONITOR_CONTRACT_INVALID')
 const sample={component,status:'PASS',metrics:{}}
 for(const name of ['errors','queue_depth','duration_ms','age_seconds','expiry_seconds','retry_count'])if(Number.isSafeInteger(input?.[name])&&input[name]>=0)sample.metrics[name]=input[name]
 const reasons=[]
 for(const [k,v]of Object.entries(limits)){
  if(!Object.hasOwn(sample.metrics,k))reasons.push(`MISSING_${k.toUpperCase()}`)
  else if(k==='expiry_seconds'?sample.metrics[k]<=v:sample.metrics[k]>v)reasons.push(`THRESHOLD_${k.toUpperCase()}`)
 }
 if(input?.available!==true)reasons.push('PROVIDER_UNAVAILABLE')
 if(reasons.length)sample.status='DEGRADED'
 sample.reasons=reasons
 if(/^[a-f0-9]{40}$/.test(input?.deployment_sha??''))sample.deployment_sha=input.deployment_sha
 // Random internal correlation handles only; no user/tenant identifiers.
 if(/^[a-f0-9]{32}$/.test(input?.request_correlation??''))sample.request_correlation=input.request_correlation
 return sample
}
export function createAlertSink({scope,cooldown_ms=60000}){
 if(scope!=='DISPOSABLE_SIMULATION'||!Number.isSafeInteger(cooldown_ms)||cooldown_ms<1)throw new Error('LOCAL_ALERT_SINK_REQUIRED')
 const delivered=[],last=new Map()
 return {evaluate(sample,now=Date.now()){
  if(!components.has(sample?.component)||!['PASS','DEGRADED'].includes(sample.status)||!Array.isArray(sample.reasons)||sample.reasons.some(r=>!/^((MISSING|THRESHOLD)_(ERRORS|QUEUE_DEPTH|DURATION_MS|AGE_SECONDS|EXPIRY_SECONDS|RETRY_COUNT)|PROVIDER_UNAVAILABLE)$/.test(r)))throw new Error('ALERT_SAMPLE_INVALID')
  const key=hash(`${sample.component}:${sample.reasons.join(',')}`)
  if(sample.status==='PASS'){last.delete(sample.component);return {status:'HEALTHY',external_delivery_proven:false}}
  const prior=last.get(sample.component)
  if(prior?.key===key&&now-prior.at<cooldown_ms)return {status:'DEDUPLICATED',external_delivery_proven:false}
  last.set(sample.component,{key,at:now});delivered.push({component:sample.component,status:sample.status,reasons:[...sample.reasons],action:`Run ${sample.component} incident runbook`,at:now});return {status:'CAPTURED',external_delivery_proven:false}
 },capture:()=>structuredClone(delivered)}
}
export async function rotationContract({scope,adapter,reference}){
 if(scope!=='DISPOSABLE_SIMULATION'||!/^[A-Z][A-Z0-9_]{1,80}$/.test(reference??''))throw new Error('ROTATION_CONTRACT_INVALID')
 const before=await adapter.health(reference,'OLD')
 if(before!==true)throw new Error('ROTATION_OLD_HEALTH_REQUIRED')
 await adapter.stage(reference)
 if(await adapter.health(reference,'NEW')!==true){await adapter.rollback(reference);throw new Error('ROTATION_NEW_HEALTH_FAILED')}
 await adapter.switch(reference)
 await adapter.revoke(reference)
 if(await adapter.health(reference,'OLD')!==false||await adapter.health(reference,'NEW')!==true)throw new Error('ROTATION_REVOKE_NOT_PROVEN')
 return {status:'SIMULATED_PASS',reference,values_included:false,live_rotation_proven:false}
}
