import {snapshotDurableBindingScopeV3} from '../../../src/assistant/durable-audit-observation-v3.ts'
import {argumentsDigest} from '../../../src/assistant/runtime.ts'
import {validateDatabaseRestartEvidence} from '../../../src/assistant/durable-process-spec-v3.ts'
const unavailable=()=>Error('NATIVE_DATABASE_RESTART_INSPECTION_UNAVAILABLE')
const literal=value=>"'"+value.replaceAll("'","''")+"'"
/** Independent private measurements on the existing owned resource. System
 * identifiers/times remain private; caller publishes only validator outcome. */
export function createNativeDatabaseRestartInspectorV3(query,rawScope){
 const scope=snapshotDurableBindingScopeV3(rawScope)
 if(typeof query!=='function'||!scope)throw unavailable()
 const statement=`select jsonb_build_object('system',system_identifier::text,
 'started',floor(extract(epoch from pg_postmaster_start_time())*1000)::bigint,
 'database',current_database(),'rows',(select coalesce(jsonb_agg(jsonb_build_object(
 'workspaceId',workspace_id,'actorId',actor_id,'capability',capability,'argumentsDigest',arguments_digest,
 'operationRef',operation_ref,'state',state)),'[]'::jsonb) from public.assistant_operations
 where workspace_id=${literal(scope.workspaceId)}::uuid and operation_ref=${literal(scope.operationRef)})) from pg_control_system();`
 let phase='idle',before
 async function read(){
  const value=JSON.parse(await query(statement))
  if(!value||Object.keys(value).sort().join(',')!=='database,rows,started,system'||value.database!=='telecom_test'
   ||typeof value.system!=='string'||!/^[1-9][0-9]{0,19}$/.test(value.system)||!Number.isSafeInteger(value.started)||value.started<1
   ||!Array.isArray(value.rows)||value.rows.length!==1)throw unavailable()
  const row=value.rows[0]
  if(!row||Object.keys(row).sort().join(',')!=='actorId,argumentsDigest,capability,operationRef,state,workspaceId'
   ||row.state!=='completed'||Object.keys(scope).some(key=>row[key]!==scope[key]))throw unavailable()
  return {system:value.system,started:value.started,digest:argumentsDigest(Object.fromEntries(Object.keys(scope).map(key=>[key,row[key]])))}
 }
 return Object.freeze({
  async capture(){if(phase!=='idle')throw unavailable();phase='capturing';try{before=await read();phase='captured'}catch{phase='failed';throw unavailable()}},
  async inspect(){
   if(phase!=='captured')throw unavailable();phase='inspecting'
   try{const after=await read(),evidence=Object.freeze({beforeSystemIdentifier:before.system,afterSystemIdentifier:after.system,
    beforePostmasterStartMs:before.started,afterPostmasterStartMs:after.started,originalBindingDigest:before.digest,persistedBindingDigest:after.digest})
    if(!validateDatabaseRestartEvidence(evidence))throw unavailable();phase='complete';return evidence
   }catch{phase='failed';throw unavailable()}
  },
 })
}
