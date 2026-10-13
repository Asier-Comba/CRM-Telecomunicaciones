import {snapshotDurableBindingScopeV3} from '../../../src/assistant/durable-audit-observation-v3.ts'
const unavailable=()=>Error('NATIVE_POSITIVE_EFFECT_INSPECTION_UNAVAILABLE')
const literal=value=>"'"+value.replaceAll("'","''")+"'"
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)
/** Positive-only count from the existing owned synthetic receipt sink. Missing
 * data is unavailable, NEVER zero effects or verified absence/quiescence. */
export function createNativePositiveEffectInspectorV3(query,sink,rawScope){
 let scope
 try{scope=snapshotDurableBindingScopeV3(rawScope)}catch{throw unavailable()}
 const nonce=typeof sink==='string'?/^completion_native_receipts_([a-f0-9]{24})$/.exec(sink)?.[1]:null
 if(typeof query!=='function'||!scope||!nonce||scope.capability!=='fixture.complete.n'+nonce)throw unavailable()
 const statement=`select coalesce(jsonb_agg(jsonb_build_object('workspaceId',workspace_id,'outboxRef',outbox_ref,'receiptRef',receipt_ref,'admission',admission) order by outbox_ref),'[]'::jsonb)
 from public.${sink} where workspace_id=${literal(scope.workspaceId)}::uuid and admission->>'operationRef'=${literal(scope.operationRef)};`
 return Object.freeze({async inspect(){
  try{
   const rows=JSON.parse(await query(statement))
   if(!Array.isArray(rows)||rows.length!==1)throw unavailable()
   const row=rows[0],admission=row?.admission
   if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).sort().join(',')!=='admission,outboxRef,receiptRef,workspaceId'
    ||row.workspaceId!==scope.workspaceId||!hex(row.outboxRef)||!hex(row.receiptRef)
    ||!admission||typeof admission!=='object'||Array.isArray(admission)
    ||Object.keys(admission).sort().join(',')!=='actorId,argumentsDigest,capability,claimFence,commandRef,dispatcher,operationRef,outboxRef,receiptAuthority,receiptRef,workspaceId'
    ||Object.keys(scope).some(key=>admission[key]!==scope[key])||admission.outboxRef!==row.outboxRef||admission.receiptRef!==row.receiptRef
    ||admission.dispatcher!==scope.capability||admission.receiptAuthority!=='registered_effect_source.v1'
    ||typeof admission.commandRef!=='string'||!/^[A-Za-z0-9_-]{24,200}$/.test(admission.commandRef)
    ||typeof admission.claimFence!=='string'||!/^v1:[1-9][0-9]{0,15}:[a-f0-9]{64}$/.test(admission.claimFence)
    ||!Number.isSafeInteger(Number(admission.claimFence.split(':')[1])))throw unavailable()
   return Object.freeze({effectCount:rows.length})
  }catch{throw unavailable()}
 }})
}
