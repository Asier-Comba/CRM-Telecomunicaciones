import {captureDurableAuditBaselineV3,inspectDurableAuditLedgerV3,snapshotDurableBindingScopeV3} from '../../../src/assistant/durable-audit-observation-v3.ts'

const literal=v=>"'"+String(v).replaceAll("'","''")+"'"
/** Consumer of the existing owned native fixture's private readonly SQL port.
 * One statement measures the entire operation ledger and every delivery; no
 * resource creation/restart, no raw ledger publication, no business counters. */
export function createNativeDurableAuditInspectorV3(query,scope){
  let binding
  try{binding=snapshotDurableBindingScopeV3(scope)}catch{throw Error('NATIVE_AUDIT_INSPECTION_UNAVAILABLE')}
  if(typeof query!=='function'||!binding)throw Error('NATIVE_AUDIT_INSPECTION_UNAVAILABLE')
  const statement=`select coalesce(jsonb_agg(jsonb_build_object(
    'workspaceId',i.workspace_id,'actorId',i.actor_id,'operationRef',i.operation_ref,
    'capability',i.capability,'argumentsDigest',i.arguments_digest,'eventRef',i.event_ref,'event',i.event,
    'contentDigest',encode(extensions.digest(convert_to(to_jsonb(i)::text,'UTF8'),'sha256'),'hex'),
    'deliveryState',d.state) order by i.event_ref),'[]'::jsonb)
    from public.assistant_original_audit_intents i left join public.assistant_audit_delivery_outbox d using(workspace_id,event_ref)
    where i.workspace_id=${literal(binding.workspaceId)}::uuid and i.operation_ref=${literal(binding.operationRef)};`
  let handle,baselineStarted=false
  async function read(){
    try{return JSON.parse(await query(statement))}catch{throw Error('NATIVE_AUDIT_INSPECTION_UNAVAILABLE')}
  }
  return Object.freeze({
    async captureBaseline(){
      if(baselineStarted)throw Error('NATIVE_AUDIT_BASELINE_ALREADY_CAPTURED')
      baselineStarted=true
      handle=captureDurableAuditBaselineV3(binding,await read())
      if(!handle)throw Error('NATIVE_AUDIT_BASELINE_INVALID')
    },
    async inspect(){
      if(!handle)throw Error('NATIVE_AUDIT_BASELINE_REQUIRED')
      const observation=inspectDurableAuditLedgerV3(handle,await read())
      if(!observation)throw Error('NATIVE_AUDIT_LEDGER_INVALID')
      return observation
    },
  })
}
