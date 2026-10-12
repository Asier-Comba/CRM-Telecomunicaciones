import {snapshotDurableBindingScopeV3} from '../../../src/assistant/durable-audit-observation-v3.ts'
import {IDEMPOTENCY_STATES} from '../../../src/assistant/durable-contracts.ts'
const unavailable=()=>Error('NATIVE_OPERATION_INSPECTION_UNAVAILABLE')
const literal=value=>"'"+value.replaceAll("'","''")+"'"
/** Independent read of the existing owned fixture. Only operation count/state;
 * no authorization/effect/fencing/absence counter can be inferred here. */
export function createNativeDurableOperationInspectorV3(query,rawScope){
 let scope
 try{scope=snapshotDurableBindingScopeV3(rawScope)}catch{throw unavailable()}
 if(typeof query!=='function'||!scope)throw unavailable()
 const statement=`select coalesce(jsonb_agg(jsonb_build_object('workspaceId',workspace_id,'actorId',actor_id,'capability',capability,
 'argumentsDigest',arguments_digest,'operationRef',operation_ref,'state',state) order by operation_ref),'[]'::jsonb)
 from public.assistant_operations where workspace_id=${literal(scope.workspaceId)}::uuid and operation_ref=${literal(scope.operationRef)};`
 return Object.freeze({async inspect(){
  try{
   const rows=JSON.parse(await query(statement))
   // Inspect all rows at that workspace/ref and reject mismatched binding. Do
   // not filter away a wrong actor/capability/digest and pretend an empty result.
   if(!Array.isArray(rows)||rows.length!==1)throw unavailable()
   const row=rows[0]
   if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).sort().join(',')!=='actorId,argumentsDigest,capability,operationRef,state,workspaceId'
    ||Object.keys(scope).some(key=>row[key]!==scope[key])||!IDEMPOTENCY_STATES.includes(row.state))throw unavailable()
   return Object.freeze({operationCount:rows.length,state:row.state})
  }catch{throw unavailable()}
 }})
}
