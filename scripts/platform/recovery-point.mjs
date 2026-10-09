import {healthSample} from './monitor-contract.mjs'
const baseComponents=['database','auth','storage_objects','storage_metadata','configuration','secret_references']
const automationComponents=['n8n_database','n8n_configuration']
const digest=/^[a-f0-9]{64}$/
export function recoveryPoint({scope,source_sha,now_ms,n8n_enabled,points=[]}) {
 if(scope!=='DISPOSABLE_SIMULATION'||!/^[a-f0-9]{40}$/.test(source_sha??'')||!Number.isSafeInteger(now_ms)||now_ms<0||typeof n8n_enabled!=='boolean'||!Array.isArray(points))throw new Error('RECOVERY_POINT_CONTRACT_INVALID')
 const required=[...baseComponents,...(n8n_enabled?automationComponents:[])],seen=new Map(),errors=[]
 for(const point of points){
  if(!point||!required.includes(point.component)||seen.has(point.component))throw new Error('RECOVERY_POINT_COMPONENT_INVALID')
  seen.set(point.component,point)
 }
 let earliest=now_ms,checkpoint
 for(const component of required){
  const point=seen.get(component),label=component.toUpperCase()
  if(!point){errors.push('MISSING_'+label);continue}
  if(point.source_sha!==source_sha)errors.push('SOURCE_DRIFT_'+label)
  if(!digest.test(point.restore_set_digest??''))errors.push('CHECKPOINT_INVALID_'+label)
  else if(checkpoint&&checkpoint!==point.restore_set_digest)errors.push('CHECKPOINT_DRIFT_'+label)
  else checkpoint=point.restore_set_digest
  if(!Number.isSafeInteger(point.recoverable_at_ms)||point.recoverable_at_ms<0||point.recoverable_at_ms>now_ms)errors.push('CLOCK_INVALID_'+label)
  else earliest=Math.min(earliest,point.recoverable_at_ms)
  for(const proof of ['authenticated_readback','empty_restore_verified','offsite_readback_verified','key_custody_verified'])if(point[proof]!==true)errors.push('UNVERIFIED_'+proof.toUpperCase()+'_'+label)
 }
 const age_seconds=Math.ceil((now_ms-earliest)/1000)
 const sample=healthSample('backup',{available:errors.length===0,age_seconds},{age_seconds:900})
 if(age_seconds>900)errors.push('RECOVERABLE_POINT_OVERDUE')
 return {status:errors.length?'BLOCKED':'SIMULATED_WITHIN_OBJECTIVE',objective_seconds:900,age_seconds,components_required:required,errors,sample,production_rpo_verified:false,provider_adapter_accepted:false,external_delivery_proven:false,external_effects:'NONE',values_included:false}
}
