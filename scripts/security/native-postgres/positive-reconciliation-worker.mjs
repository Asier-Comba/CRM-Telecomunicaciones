// IPC-only owned synthetic worker: one persistent native PostgreSQL connection.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {openPersistentNativeFixtureSessionV1} from './persistent-fixture-session.mjs'
import {CapabilityRegistry} from '../../../src/assistant/registry.ts'
import {argumentsDigest,canonicalArgumentsV1} from '../../../src/assistant/runtime.ts'
import {createDurableCommandMaterialProducerV1,createDurableMaterialReservationPortV1} from '../../../src/assistant/durable-command-material.ts'
import {createDurableResultMaterialProducerV1} from '../../../src/assistant/durable-result-material.ts'
import {createDurablePositiveReconciliationPortV1} from '../../../src/assistant/durable-positive-reconciliation-port.ts'
import {createDurableUnconfirmedReservationPortV1} from '../../../src/assistant/durable-unconfirmed-reservation-port.ts'
import {createDurableCompletionPortV1} from '../../../src/assistant/durable-completion-port.ts'
import {createDurableBusinessOutboxPortV1} from '../../../src/assistant/durable-business-outbox-port.ts'

const literal=v=>"'"+String(v).replaceAll("'","''")+"'"
const send=m=>process.send?.(m)
const fields={
 assistant_durable_v1_reserve_material:['p_workspace','p_worker','p_authority_version','p_capability','p_digest','p_key','p_dispatcher','p_command','p_request','p_material'],
 assistant_durable_v1_load_operation:['p_workspace','p_operation'],
 assistant_durable_v1_load_result:['p_workspace','p_worker','p_authority_version','p_operation'],
 assistant_durable_v1_complete:['p_workspace','p_worker','p_authority_version','p_operation','p_version','p_receipt','p_output_schema_version','p_schema_digest','p_result','p_audit','p_event'],
 assistant_durable_v1_reconcile_completed:['p_workspace','p_worker','p_authority_version','p_operation','p_version','p_receipt','p_output_schema_version','p_schema_digest','p_result','p_audit','p_event'],
}

let session,stage='CONNECT'
try{
 const job=await new Promise(resolve=>process.once('message',resolve))
 const {workspace,actor,capability,workerRef,input,outcomes,command,commit}=job
 const mode=job.mode??'reconcile',grantVersion=job.grantVersion??1
 assert.ok(['reconcile','reserve','complete','complete_kill_after_commit','complete_recover_only','kill_after_commit','recover_only'].includes(mode))
 const normalCompletion=['complete','complete_kill_after_commit','complete_recover_only'].includes(mode)
 assert.ok(Number.isSafeInteger(grantVersion)&&grantVersion>0&&grantVersion<Number.MAX_SAFE_INTEGER)
 assert.match(outcomes,normalCompletion?/^completion_native_outcomes_[0-9a-f]{24}$/:/^unconfirmed_native_outcomes_[0-9a-f]{24}$/)
 assert.equal(commit.binding.workspaceId,workspace);assert.equal(commit.binding.actorId,actor);assert.equal(commit.binding.capability,capability)
 session=await openPersistentNativeFixtureSessionV1()
 await session.query(`set request.jwt.claim.sub=${literal(actor)};`)
 send({phase:'connected',pid:process.pid,backend:session.backend,application:session.application})
 await new Promise(resolve=>process.once('message',m=>{assert.deepEqual(m,{phase:'start'});resolve()}))
 stage='PREPARE'
 const authority={authentication:'user_session',actorId:actor,workspaceId:workspace,scopeEpoch:'synthetic_current_v1',permissions:new Set([capability,'fixture:write','assistant:operation:reconcile']),workerRef,capability,dispatcher:capability,schemaVersion:1,grantVersion}
 const binding={actorId:actor,workspaceId:workspace,capability,argumentsDigest:argumentsDigest(input)}
 assert.deepEqual(binding,commit.binding)
 const registry=new CapabilityRegistry()
 registry.register({contractVersion:3,name:capability,description:'Independent owned reconciliation fixture',inputSchema:{type:'object',properties:{customerRef:{type:'string',maxLength:80},label:{type:'string',maxLength:48}},required:['customerRef','label'],additionalProperties:false},outputSchema:{type:'object',properties:{customerRef:{type:'string',maxLength:80},label:{type:'string',maxLength:48}},required:['customerRef','label'],additionalProperties:false},outputPolicy:{sourceProjection:'explicit_dto',sensitiveValueScan:'high_confidence'},permission:'fixture:write',accessClass:'SAFE_WRITE',confirmationPolicy:'none',idempotencyRequired:true,tenantScope:{source:'server_context',modelMayChooseWorkspace:false},
  authorize:async(ctx,values)=>await session.query(`select count(*) from public.customers where id=${literal(values.customerRef)}::uuid and workspace_id=${literal(ctx.workspaceId)}::uuid;`)==='1'?{allowed:true}:{allowed:false,reason:'resource_not_accessible'},handler:async()=>{throw Error('business_handler_not_run')},projectOutput:()=>null})
 async function invoke(name,params,signal){
  const names=fields[name];assert.ok(names);assert.deepEqual(Object.keys(params).sort(),[...names].sort())
  if(name==='assistant_durable_v1_reconcile_completed'||name==='assistant_durable_v1_reserve_material'||name==='assistant_durable_v1_complete'){
   assert.equal(name==='assistant_durable_v1_reserve_material',mode==='reserve')
   assert.equal(name==='assistant_durable_v1_complete',normalCompletion)
   stage='COMMIT_BARRIER'
   const backend=Number(await session.query('select pg_backend_pid();',signal));assert.equal(backend,session.backend)
   send({phase:'prepared',pid:process.pid,backend})
   await new Promise(resolve=>process.once('message',m=>{assert.deepEqual(m,{phase:'release'});resolve()}))
   stage='COMMIT'
  }
  const row=JSON.parse(await session.query(`select jsonb_build_object('backend',pg_backend_pid(),'data',public.${name}(${names.map(n=>literal(params[n])+(n==='p_material'?'::jsonb':'')).join(',')}));`,signal))
  assert.equal(row.backend,session.backend)
  if((name==='assistant_durable_v1_reconcile_completed'&&mode==='kill_after_commit')||(name==='assistant_durable_v1_complete'&&mode==='complete_kill_after_commit')){
   assert.equal(row.data.status,'applied');stage='POSTCOMMIT'
   send({phase:'committed',pid:process.pid,backend:session.backend})
   // The parent independently inspects persisted rows, then observes real SIGKILL.
   await new Promise(()=>{})
  }
  if(name==='assistant_durable_v1_reconcile_completed'||name==='assistant_durable_v1_complete')stage='READBACK'
  return {data:row.data,error:null}
 }
 const material=createDurableCommandMaterialProducerV1({registry,registrations:[{dispatcher:capability,capability,schemaVersion:1}],authority:async()=>authority,
  loadDraft:async()=>({binding,command,schemaVersion:1,arguments:input})})
 const reservation=createDurableMaterialReservationPortV1({authority:async()=>authority,producer:material,invoke})
 const business=createDurableBusinessOutboxPortV1({reservation,currentWorker:async()=>authority,producer:material,invoke,
  loadOutbox:async()=>{throw Error('worker_outbox_not_requested')},verifyReceipt:async()=>{throw Error('worker_ack_not_requested')}})
 const producer=createDurableResultMaterialProducerV1({registry,allowVerifiedReconciliation:!normalCompletion,registrations:[{dispatcher:capability,capability,schemaVersion:1,
  authorizeResult:async(ctx,_record,result)=>await session.query(`select count(*) from public.customers where workspace_id=${literal(ctx.workspaceId)}::uuid and id=${literal(result.data.customerRef)}::uuid;`)==='1'}],authority:async()=>authority,
  loadOutcome:async(_current,record,cmd)=>{const raw=await session.query(`select outcome from public.${outcomes} where workspace_id=${literal(workspace)}::uuid and operation_ref=${literal(record.operationRef)} and command_ref=${literal(cmd.commandRef)} and receipt_ref=${literal(record.effectReceiptRef)};`);return raw?JSON.parse(raw):null}})
 const loadCommand=async(_worker,operation)=>{const raw=await session.query(`select jsonb_build_object('dispatcher',dispatcher_key,'commandRef',command_ref) from public.assistant_registered_commands where workspace_id=${literal(workspace)}::uuid and operation_ref=${literal(operation)} and actor_id=${literal(actor)}::uuid;`);return raw?JSON.parse(raw):null}
 const completion=createDurableCompletionPortV1({business,currentWorker:async()=>authority,producer,loadCommand,invoke,
  loadConfirmationOrigin:async(_worker,operation)=>await session.query(`select case when confirmation_ref is null then 'not_applicable' else 'accepted' end from public.assistant_operations where workspace_id=${literal(workspace)}::uuid and operation_ref=${literal(operation)} and actor_id=${literal(actor)}::uuid;`)})
 const ten=createDurableUnconfirmedReservationPortV1({completion,currentWorker:async()=>authority,producer:material,invoke,loadCommand:async()=>command})
 const positive=createDurablePositiveReconciliationPortV1({reservation:ten,currentWorker:async()=>authority,producer,loadCommand,invoke})
 commit.actor.permissions=new Set(commit.actor.permissions);commit.now=new Date(commit.now)
 if(mode==='reserve'){
  const decision=await ten.reserveOperation(commit.actor,commit.binding,commit.idempotencyKey)
  stage='RESULT';assert.ok(['reserved','existing'].includes(decision.status))
  assert.equal(decision.record.state,'reserved');assert.equal(decision.record.version,1);assert.equal(decision.record.attempt,1)
  assert.deepEqual(decision.record.binding,commit.binding);assert.equal(decision.record.idempotencyKey,commit.idempotencyKey)
  assert.equal(Number(await session.query('select pg_backend_pid();')),session.backend)
  send({phase:'result',pid:process.pid,backend:session.backend,status:decision.status,operationRef:decision.record.operationRef,recordDigest:createHash('sha256').update(canonicalArgumentsV1(decision.record)).digest('hex')})
 }else if(mode==='complete'||mode==='complete_kill_after_commit'){
  const {actor:principal,now,...completionInput}=commit;void now
  const result=await completion.completeOperationWithAuditIntent(principal,completionInput)
  stage='RESULT';assert.ok(['applied','version_conflict'].includes(result.status))
  if(result.status==='applied'){assert.equal(result.record.version,commit.expectedVersion+1);assert.equal(result.record.state,'completed');assert.deepEqual(result.record.result,commit.result)}
  assert.equal(Number(await session.query('select pg_backend_pid();')),session.backend)
  send({phase:'result',pid:process.pid,backend:session.backend,status:result.status})
 }else if(mode==='recover_only'||mode==='complete_recover_only'){
  stage='RECOVER'
  const recovered=await (normalCompletion?completion:positive).loadAuthorizedOperation(commit.actor,commit.operationRef,new Date())
  assert.equal(recovered.state,'completed');assert.equal(recovered.version,commit.expectedVersion+1)
  assert.deepEqual(recovered.binding,commit.binding);assert.equal(recovered.idempotencyKey,normalCompletion?job.expectedIdempotencyKey:commit.idempotencyKey)
  assert.equal(recovered.effectReceiptRef,job.expectedReceipt)
  assert.equal(canonicalArgumentsV1(recovered.result),canonicalArgumentsV1(normalCompletion?commit.result:commit.resolution.result))
  assert.equal(Number(await session.query('select pg_backend_pid();')),session.backend)
  send({phase:'recovered',pid:process.pid,backend:session.backend,receiptDigest:createHash('sha256').update(recovered.effectReceiptRef).digest('hex'),resultDigest:createHash('sha256').update(canonicalArgumentsV1(recovered.result)).digest('hex'),...(normalCompletion?{recordDigest:createHash('sha256').update(canonicalArgumentsV1(recovered)).digest('hex')}:{})})
 }else{
 const result=await positive.commitVerifiedReconciliation(commit)
 stage='RESULT'
 assert.ok(['applied','version_conflict'].includes(result.status))
 if(result.status==='applied'){assert.equal(result.record.version,5);assert.equal(result.record.state,'completed');assert.deepEqual(result.record.result,commit.resolution.result)}
 assert.equal(Number(await session.query('select pg_backend_pid();')),session.backend)
 send({phase:'result',pid:process.pid,backend:session.backend,status:result.status})
 }
}catch{send({phase:'failed',code:'INDEPENDENT_RECONCILIATION_WORKER_FAILED',stage})}
finally{if(session)await session.close();if(process.connected)process.disconnect()}
