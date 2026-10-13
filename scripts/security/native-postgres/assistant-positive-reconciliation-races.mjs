// Private partial completion evidence in the existing owned native fixture.
// Reservation and positive reconciliation use separate twenty-Node races.
// Other partial SQL races do not establish full23 or its four Node races.
import assert from 'node:assert/strict'
import {spawn,spawnSync} from 'node:child_process'
import {randomBytes,randomUUID,createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {isExpectedNativeImage} from './expected-image.mjs'
import {terminatedCatalogFunctionDefinition} from './catalog-function-definition.mjs'
import {runIndependentPositiveReconciliationRaceV1,runIndependentUnconfirmedReservationRaceV1} from './positive-reconciliation-race.mjs'
import {runPositiveReconciliationProcessCutV1} from './positive-reconciliation-process-cut.mjs'
import {createNativeDurableAuditInspectorV3} from './durable-audit-inspection-v3.mjs'
import {createNativeDurableOperationInspectorV3} from './durable-operation-inspection-v3.mjs'
import {verifyNativeDriverOperationSliceV3} from './verify-driver-operation-slice-v3.mjs'
import {createNativePositiveEffectInspectorV3} from './durable-positive-effect-inspection-v3.mjs'
import {CapabilityRegistry} from '../../../src/assistant/registry.ts'
import {argumentsDigest} from '../../../src/assistant/runtime.ts'
import {createDurableCommandMaterialProducerV1,createDurableMaterialReservationPortV1} from '../../../src/assistant/durable-command-material.ts'
import {createDurableResultMaterialProducerV1} from '../../../src/assistant/durable-result-material.ts'
import {createDurablePositiveReconciliationPortV1} from '../../../src/assistant/durable-positive-reconciliation-port.ts'
import {createDurableUnconfirmedReservationPortV1} from '../../../src/assistant/durable-unconfirmed-reservation-port.ts'
import {createDurableCompletionPortV1} from '../../../src/assistant/durable-completion-port.ts'
import {canonicalArgumentsV1} from '../../../src/assistant/runtime.ts'
import {createDurableBusinessOutboxPortV1} from '../../../src/assistant/durable-business-outbox-port.ts'
import {createDurableAuditDeliveryPortV1} from '../../../src/assistant/durable-audit-delivery-port.ts'
import {createDurableAuditDrainV1} from '../../../src/assistant/durable-audit-drain.ts'
const container=process.env.TELECOM_NATIVE_TEST_CONTAINER??''
assert.match(container,/^[0-9a-f]{12,64}$/)
const image=spawnSync('docker',['inspect','--format={{.Config.Image}}',container],{encoding:'utf8'})
assert.equal(image.status,0);assert.ok(isExpectedNativeImage(image.stdout.trim()))
const database='telecom_test',workspace='b2000000-0000-4000-8000-000000000001',actor='a1000000-0000-4000-8000-000000000001'
const nonce=randomBytes(12).toString('hex'),capability='fixture.complete.n'+nonce,workerRef='completion_native_worker_'+nonce
const auditActor=randomUUID()
const args=['exec','-i','-u','postgres',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',database]
const auth=`set request.jwt.claim.sub='${actor}';`,owned=new Set(),literal=v=>"'"+String(v).replaceAll("'","''")+"'",hash=v=>createHash('sha256').update(v).digest('hex')
function run(input){return new Promise((resolve,reject)=>{
 const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']});owned.add(child);let out='',err='',timedOut=false
 const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},30000)
 child.stdout.on('data',b=>{out+=b;if(out.length>32768)child.kill('SIGKILL')});child.stderr.on('data',b=>{err+=b;if(err.length>32768)child.kill('SIGKILL')})
 child.on('error',e=>{clearTimeout(timer);owned.delete(child);reject(e)})
 child.on('close',code=>{clearTimeout(timer);owned.delete(child);resolve({code,out,err,timedOut,pid:child.pid})})
 child.stdin.end("set log_min_error_statement='panic';set log_error_verbosity='terse';"+input)
})}
async function sql(input){const r=await run(input);assert.equal(r.code,0,'native effect SQL failed');assert.equal(r.timedOut,false);return r.out.trim()}
const input={customerRef:'d4000000-0000-4000-8000-000000000001',label:'fixture'},digest=argumentsDigest(input)
const binding={actorId:actor,workspaceId:workspace,capability,argumentsDigest:digest}
const authority={authentication:'user_session',actorId:actor,workspaceId:workspace,scopeEpoch:'synthetic_current_v1',permissions:new Set([capability,'fixture:write','assistant:operation:reconcile']),
 workerRef,capability,dispatcher:capability,schemaVersion:1,grantVersion:1},context={...authority,requestId:'effect_original_request_'+nonce}
const registry=new CapabilityRegistry()
registry.register({contractVersion:3,name:capability,description:'Disposable scoped effect fixture',inputSchema:{type:'object',properties:{customerRef:{type:'string',maxLength:80},label:{type:'string',maxLength:48}},required:['customerRef','label'],additionalProperties:false},outputSchema:{type:'object',properties:{customerRef:{type:'string',maxLength:80},label:{type:'string',maxLength:48}},required:['customerRef','label'],additionalProperties:false},outputPolicy:{sourceProjection:'explicit_dto',sensitiveValueScan:'high_confidence'},permission:'fixture:write',accessClass:'SAFE_WRITE',confirmationPolicy:'none',idempotencyRequired:true,tenantScope:{source:'server_context',modelMayChooseWorkspace:false},
 authorize:async(ctx,values)=>await sql(`select count(*) from public.customers where id=${literal(values.customerRef)}::uuid and workspace_id=${literal(ctx.workspaceId)}::uuid;`)==='1'?{allowed:true}:{allowed:false,reason:'resource_not_accessible'},handler:async()=>{throw Error('business_handler_not_run')},projectOutput:()=>null})
const producer=createDurableCommandMaterialProducerV1({registry,registrations:[{dispatcher:capability,capability,schemaVersion:1}],authority:async()=>authority,
 loadDraft:async(_current,command)=>{const raw=await sql(`select jsonb_build_object('schemaVersion',schema_version,'arguments',arguments) from public.assistant_command_material where workspace_id='${workspace}' and command_ref=${literal(command.commandRef)};`)
  // Reservation drafts precede the immutable row; fixture input is server owned.
  return {binding,command,...(raw?JSON.parse(raw):{schemaVersion:1,arguments:input})}}})
const fields={assistant_durable_v1_reserve_material:['p_workspace','p_worker','p_authority_version','p_capability','p_digest','p_key','p_dispatcher','p_command','p_request','p_material'],assistant_durable_v1_load_operation:['p_workspace','p_operation'],assistant_durable_v1_complete:['p_workspace','p_worker','p_authority_version','p_operation','p_version','p_receipt','p_output_schema_version','p_schema_digest','p_result','p_audit','p_event'],assistant_durable_v1_load_result:['p_workspace','p_worker','p_authority_version','p_operation'],assistant_durable_v1_issue:['p_workspace','p_capability','p_digest'],assistant_durable_v1_confirm_reserve_material:['p_workspace','p_confirmation','p_capability','p_digest','p_key','p_dispatcher','p_command','p_request','p_material'],assistant_durable_v1_start_execution:['p_workspace','p_operation','p_capability','p_digest','p_version'],
 assistant_durable_v1_claim_effect:['p_workspace','p_worker','p_authority_version','p_outbox','p_version'],assistant_durable_v1_ack_effect:['p_workspace','p_worker','p_authority_version','p_outbox','p_version','p_fence','p_claim','p_receipt','p_request'],
 assistant_durable_v1_list_audit:['p_workspace','p_worker','p_authority_version','p_after_time','p_after_event'],assistant_durable_v1_claim_audit:['p_workspace','p_worker','p_authority_version','p_event','p_version'],assistant_durable_v1_ack_audit:['p_workspace','p_worker','p_authority_version','p_event','p_version','p_fence','p_claim','p_receipt']}
fields.assistant_durable_v1_reconcile_completed=fields.assistant_durable_v1_complete;fields.assistant_durable_v1_require_reconciliation=['p_workspace','p_operation','p_capability','p_digest','p_version','p_reason','p_request'];
let positiveExpiry=false,positiveLoss=false;
let loseReply=false
const sink='completion_native_receipts_'+nonce,auditSink='completion_native_audit_sink_'+nonce
async function invoke(operation,params,signal){
 if(signal?.aborted)throw Error('native_completion_cancelled')
 const names=fields[operation];assert.ok(names);assert.deepEqual(Object.keys(params).sort(),[...names].sort())
 if(signal?.aborted)throw Error('native_completion_cancelled')
 if(positiveExpiry&&operation==='assistant_durable_v1_reconcile_completed')await sql(`update public.assistant_registered_effect_workers set authority_version=2,expires_at=clock_timestamp()+interval '1 second' where workspace_id='${workspace}' and worker_ref='${workerRef}';`)
 const appName=positiveExpiry&&operation==='assistant_durable_v1_reconcile_completed'?`set application_name='positive_expiry_wait_${nonce}';`:''
 const currentAuth=['assistant_durable_v1_list_audit','assistant_durable_v1_claim_audit','assistant_durable_v1_ack_audit'].includes(operation)?`set request.jwt.claim.sub=${literal(auditActor)};`:auth
 const result=await run(currentAuth+appName+`select jsonb_build_object('backend',pg_backend_pid(),'data',public.${operation}(${names.map(f=>literal(params[f])+(f==='p_material'?'::jsonb':'')).join(',')}));`)
 assert.equal(result.code,0,'native effect RPC failed');assert.equal(result.timedOut,false);const value=JSON.parse(result.out.trim())
 if(positiveLoss&&operation==='assistant_durable_v1_reconcile_completed'){positiveLoss=false;throw Error('synthetic_positive_postcommit_reply_lost')}
 if(loseReply&&operation==='assistant_durable_v1_reserve_material'){loseReply=false;throw Error('synthetic_postcommit_ack_reply_lost')}
 return {data:value.data,error:null}
}
const reservation=createDurableMaterialReservationPortV1({authority:async()=>authority,producer,invoke})
const port=createDurableBusinessOutboxPortV1({reservation,currentWorker:async()=>authority,producer,invoke,
 loadOutbox:async(_worker,ref)=>{const raw=await sql(`select jsonb_build_object('outboxRef',outbox_ref,'operationRef',operation_ref,'binding',jsonb_build_object('actorId',actor_id,'workspaceId',workspace_id,'capability',capability,'argumentsDigest',arguments_digest),'command',jsonb_build_object('dispatcher',dispatcher_key,'commandRef',command_ref),'version',version) from public.assistant_effect_outbox where workspace_id='${workspace}' and outbox_ref=${literal(ref)};`)
  return raw?JSON.parse(raw):null},
 verifyReceipt:async(_worker,metadata,claimFence,receiptRef)=>{const raw=await sql(`select admission from public.${sink} where workspace_id='${workspace}' and outbox_ref=${literal(metadata.outboxRef)} and receipt_ref=${literal(receiptRef)} and admission->>'claimFence'=${literal(claimFence)};`);return raw?JSON.parse(raw):null}})

const outcomes='unconfirmed_native_outcomes_'+nonce
const resultProducer=createDurableResultMaterialProducerV1({registry,allowVerifiedReconciliation:true,registrations:[{dispatcher:capability,capability,schemaVersion:1,
 authorizeResult:async(ctx,_record,result)=>await sql(`select count(*) from public.customers where workspace_id=${literal(ctx.workspaceId)}::uuid and id=${literal(result.data.customerRef)}::uuid;`)==='1'}],authority:async()=>authority,
 loadOutcome:async(_current,record,command)=>{const raw=await sql(`select outcome from public.${outcomes} where workspace_id='${workspace}' and operation_ref=${literal(record.operationRef)} and command_ref=${literal(command.commandRef)} and receipt_ref=${literal(record.effectReceiptRef)};`);return raw?JSON.parse(raw):null}})
const completion=createDurableCompletionPortV1({business:port,currentWorker:async()=>authority,producer:resultProducer,
 loadConfirmationOrigin:async(_worker,operation)=>await sql(`select case when confirmation_ref is null then 'not_applicable' else 'accepted' end from public.assistant_operations where workspace_id='${workspace}' and operation_ref=${literal(operation)} and actor_id='${actor}';`),
 loadCommand:async(_current,operation)=>{const raw=await sql(`select jsonb_build_object('dispatcher',dispatcher_key,'commandRef',command_ref) from public.assistant_registered_commands where workspace_id='${workspace}' and operation_ref=${literal(operation)} and actor_id='${actor}';`);return raw?JSON.parse(raw):null},invoke})

const commands=new Map(),ten=createDurableUnconfirmedReservationPortV1({completion,currentWorker:async()=>authority,producer,invoke,
 loadCommand:async(_worker,current,key)=>{assert.deepEqual(current,binding);return commands.get(key)??null}})
const allLedger=()=>sql(`select encode(extensions.digest(convert_to(jsonb_build_object('operations',(select jsonb_agg(to_jsonb(x) order by operation_ref) from public.assistant_operations x where capability='${capability}'),'commands',(select jsonb_agg(to_jsonb(x) order by command_ref) from public.assistant_registered_commands x where capability='${capability}'),'materials',(select jsonb_agg(to_jsonb(m) order by m.command_ref) from public.assistant_command_material m join public.assistant_registered_commands c using(workspace_id,command_ref) where c.capability='${capability}'),'outboxes',(select jsonb_agg(to_jsonb(x) order by outbox_ref) from public.assistant_effect_outbox x where capability='${capability}'),'audits',(select jsonb_agg(to_jsonb(x) order by event_ref) from public.assistant_original_audit_intents x where capability='${capability}'),'deliveries',(select jsonb_agg(to_jsonb(d) order by d.event_ref) from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.capability='${capability}'),'results',(select jsonb_agg(to_jsonb(x) order by operation_ref) from public.assistant_safe_results x where capability='${capability}'),'confirmations',(select jsonb_agg(to_jsonb(x) order by confirmation_ref) from public.assistant_confirmations x where capability='${capability}'))::text,'UTF8'),'sha256'),'hex');
`)
async function terminateOwnedSessions(sessions){
 const ownedSessions=`datname='${database}' and (${sessions.map(x=>`(pid=${x.backend} and application_name=${literal(x.application)})`).join(' or ')}) and pid<>pg_backend_pid()`
 await sql(`select pg_terminate_backend(pid) from pg_stat_activity where ${ownedSessions};`)
 for(let n=0;n<10;n++)if(await sql(`select count(*) from pg_stat_activity where ${ownedSessions};`)==='0')return
 throw Error('INDEPENDENT_RECONCILIATION_OWNED_BACKEND_CLEANUP_FAILED')
}
const principal=requestId=>({authentication:'user_session',actorId:actor,workspaceId:workspace,permissions:authority.permissions,requestId})
try{
 assert.equal(await sql('select current_database();'),database)
 const schema=registry.get(capability).outputSchema
 await sql(`insert into public.assistant_registered_dispatchers values('${capability}','${capability}',1);
 insert into public.assistant_reconciliation_policies values('${capability}','${capability}',1,'completed');
 insert into public.assistant_unconfirmed_policies values('${capability}','${capability}',1,'SAFE_WRITE','none');
 insert into public.assistant_registered_effect_workers(workspace_id,worker_ref,actor_id,capability,dispatcher_key,schema_version,expires_at) values('${workspace}','${workerRef}','${actor}','${capability}','${capability}',1,clock_timestamp()+interval '1 hour');
 insert into public.assistant_registered_result_schemas values('${capability}','${capability}',1,1,'SAFE_WRITE',${literal(canonicalArgumentsV1(schema))},${literal(argumentsDigest(schema))},'{"customerRef":"customer","label":"scalar"}');
 create table public.${sink}(workspace_id uuid,outbox_ref text,receipt_ref text,admission jsonb,primary key(workspace_id,outbox_ref));
 create table public.${outcomes}(workspace_id uuid,operation_ref text,command_ref text,receipt_ref text,outcome jsonb,primary key(workspace_id,operation_ref));
 revoke all on public.${sink},public.${outcomes} from public,anon,authenticated,service_role;`)
 assert.equal(Object.keys(ten).length,10)
 const key='unconfirmed_race_key_'+nonce,command={dispatcher:capability,commandRef:'unconfirmed_race_command_'+nonce};commands.set(key,command)
 const requests=Array.from({length:20},(_,i)=>principal('unconfirmed_original_'+i+'_'+nonce))
 const reservationRace=await runIndependentUnconfirmedReservationRaceV1(requests.map(actor=>({actor,binding,idempotencyKey:key,now:new Date()})),{workspace,actor,capability,workerRef,input,outcomes,command},terminateOwnedSessions)
 assert.equal(reservationRace.nodeProcesses,20);assert.equal(reservationRace.nativeBackends,20);assert.equal(reservationRace.sameConnection,true)
 const decisions=reservationRace.settled
 assert.equal(decisions.filter(d=>d.status==='reserved').length,1);assert.equal(decisions.filter(d=>d.status==='existing').length,19)
 const winner=decisions.findIndex(d=>d.status==='reserved'),record=await ten.loadAuthorizedOperation(requests[winner],decisions[winner].operationRef,new Date())
 assert.equal(record.state,'reserved');assert.equal(record.version,1);assert.equal(record.attempt,1)
 assert.deepEqual(record.binding,binding);assert.equal(record.idempotencyKey,key)
 assert.ok(decisions.every(d=>d.operationRef===record.operationRef&&d.recordDigest===hash(canonicalArgumentsV1(record))))
 assert.equal(await sql(`select request_ref from public.assistant_original_audit_intents where operation_ref=${literal(record.operationRef)};`),requests[winner].requestId)
 assert.equal(await sql(`select count(*) from public.assistant_confirmations where capability='${capability}';`),'0')
 console.log('UNCONFIRMED NODE RESERVATION PASS:20 distinct independent Node processes/native backends same persistent connection;one original reservation19 exact full-record replays;original winning request audit;zero invented confirmations;NOT full23/four Node races')
 const stored=hash(await allLedger());assert.equal((await ten.reserveOperation({...context,requestId:'unconfirmed_changed_retry_'+nonce},binding,key)).status,'existing');assert.equal(hash(await allLedger()),stored)
 const lossKey='unconfirmed_replyloss_key_'+nonce;commands.set(lossKey,{dispatcher:capability,commandRef:'unconfirmed_replyloss_command_'+nonce});loseReply=true
 await assert.rejects(ten.reserveOperation(context,binding,lossKey));const afterLoss=hash(await allLedger());assert.equal((await ten.reserveOperation(context,binding,lossKey)).status,'existing');assert.equal(hash(await allLedger()),afterLoss)

 const positive=createDurablePositiveReconciliationPortV1({reservation:ten,currentWorker:async()=>authority,producer:resultProducer,
  loadCommand:async(_current,operation)=>{const raw=await sql(`select jsonb_build_object('dispatcher',dispatcher_key,'commandRef',command_ref) from public.assistant_registered_commands where workspace_id='${workspace}' and operation_ref=${literal(operation)} and actor_id='${actor}';`);return raw?JSON.parse(raw):null},invoke})
 const result={status:'SUCCESS',capability,data:input},expectedAudits=new Map()
 async function quarantine(operation,cmd){
  assert.equal((await ten.startExecution(context,operation,binding,1)).status,'applied')
  const outbox=await sql(`select outbox_ref from public.assistant_effect_outbox where operation_ref=${literal(operation)};`),claim=await ten.claimOutbox(context,outbox,1)
  assert.equal(claim.status,'applied');const receipt=hash('positive_original_receipt:'+outbox)
  const admission={workspaceId:workspace,actorId:actor,outboxRef:outbox,operationRef:operation,capability,argumentsDigest:digest,dispatcher:capability,commandRef:cmd.commandRef,claimFence:claim.claimFence,receiptRef:receipt,receiptAuthority:'registered_effect_source.v1'}
  await sql(`insert into public.${sink} values('${workspace}',${literal(outbox)},${literal(receipt)},${literal(JSON.stringify(admission))}::jsonb);
   insert into public.${outcomes} values('${workspace}',${literal(operation)},${literal(cmd.commandRef)},${literal(receipt)},${literal(JSON.stringify({binding,operationRef:operation,command:cmd,receiptRef:receipt,result,sourceAuthority:'registered_result_source.v1'}))}::jsonb);`)
  assert.equal((await ten.ackOutbox(context,outbox,2,claim.claimFence,receipt)).status,'applied')
  await sql(`update public.assistant_operations set lease_expires_at=clock_timestamp()-interval '1 millisecond' where operation_ref=${literal(operation)};`)
  assert.equal((await ten.transitionToReconciliation(context,operation,binding,3,'internal_safe')).status,'applied')
  return receipt
 }
 function commitInput(operation,key,requestId){
  const audit={event:'assistant.operation.reconciliation',requestId,actorId:actor,workspaceId:workspace,operationRef:operation,requestedOutcome:'completed',decision:'completed',reasonCode:'reconciliation_applied'}
  return {actor:principal(requestId),operationRef:operation,expectedVersion:4,binding,idempotencyKey:key,resolution:{outcome:'completed',result},eventRef:hash(JSON.stringify([workspace,operation,4])),auditIntent:audit,now:new Date()}
 }
 const receipt=await quarantine(record.operationRef,command)
 const auditInspector=createNativeDurableAuditInspectorV3(sql,{...binding,operationRef:record.operationRef})
 await auditInspector.captureBaseline()
 const competing=Array.from({length:20},(_,i)=>commitInput(record.operationRef,key,'positive_original_'+i+'_'+nonce))
 const independent=await runIndependentPositiveReconciliationRaceV1(competing,{workspace,actor,capability,workerRef,input,outcomes,command},terminateOwnedSessions)
 const settled=independent.settled;assert.equal(independent.nodeProcesses,20);assert.equal(independent.nativeBackends,20);assert.equal(independent.sameConnection,true)
 assert.equal(settled.filter(x=>x.status==='applied').length,1);assert.equal(settled.filter(x=>x.status==='version_conflict').length,19)
 const committedIndex=settled.findIndex(x=>x.status==='applied'),originalAudit=competing[committedIndex].auditIntent,eventRef=competing[committedIndex].eventRef
 expectedAudits.set(eventRef,originalAudit)
 const raceAudit=await auditInspector.inspect()
 assert.equal(raceAudit.originalAuditIntents,4);assert.equal(raceAudit.baselineOriginalAuditIntents,3)
 assert.equal(raceAudit.reservationAuditIntents,1);assert.equal(raceAudit.otherAuditIntents,2);assert.equal(raceAudit.outcomeAuditIntents,1)
 assert.equal(raceAudit.pendingOriginalEvents,4);assert.equal(raceAudit.outcomePendingEvents,1);assert.equal(raceAudit.outcomeDeliveredEvents,0)
 assert.deepEqual(JSON.parse(await sql(`select reconciliation_event from public.assistant_original_audit_intents where event_ref=${literal(eventRef)};`)),originalAudit)
 let complete=hash(await allLedger());const replay=await positive.loadAuthorizedOperation(principal('positive_changed_retry_'+nonce),record.operationRef,new Date())
 assert.equal(replay.state,'completed');assert.equal(replay.version,5);assert.equal(replay.effectReceiptRef,receipt);assert.deepEqual(replay.result,result);assert.equal(hash(await allLedger()),complete)
 const lossRecord=(await ten.reserveOperation(context,binding,lossKey)).record,lossCommand=commands.get(lossKey)
 const lossReceipt=await quarantine(lossRecord.operationRef,lossCommand),lossInput=commitInput(lossRecord.operationRef,lossKey,'positive_loss_original_'+nonce)
 complete=hash(await allLedger())
 const holderName='positive_customer_holder_'+nonce
 const holder=run(`begin;set application_name='${holderName}';select id from public.customers where workspace_id='${workspace}' and id=${literal(input.customerRef)}::uuid for update;select pg_sleep(4);rollback;`)
 let sleeping=false;for(let n=0;n<20;n++)if(await sql(`select exists(select 1 from pg_stat_activity where application_name='${holderName}' and wait_event='PgSleep');`)==='t'){sleeping=true;break}assert.ok(sleeping)
 authority.grantVersion=2;positiveExpiry=true
 const denied=assert.rejects(positive.commitVerifiedReconciliation(lossInput));let waiting=false
 for(let n=0;n<30;n++){const observed=JSON.parse(await sql(`select jsonb_build_object('waiting',exists(select 1 from pg_stat_activity where application_name='positive_expiry_wait_${nonce}' and wait_event_type='Lock'),'live',clock_timestamp()<(select expires_at from public.assistant_registered_effect_workers where worker_ref='${workerRef}'));`));if(observed.waiting){assert.ok(observed.live);waiting=true;break}}
 assert.ok(waiting);assert.equal((await holder).code,0);await denied;positiveExpiry=false;assert.equal(hash(await allLedger()),complete)
 authority.grantVersion=3;await sql(`update public.assistant_registered_effect_workers set authority_version=3,expires_at=clock_timestamp()+interval '1 hour' where worker_ref='${workerRef}';`)
 positiveLoss=true;await assert.rejects(positive.commitVerifiedReconciliation(lossInput));complete=hash(await allLedger())
 const lossReplay=await positive.loadAuthorizedOperation(principal('positive_loss_retry_'+nonce),lossRecord.operationRef,new Date())
 assert.equal(lossReplay.version,5);assert.equal(lossReplay.effectReceiptRef,lossReceipt);assert.deepEqual(lossReplay.result,result);assert.equal(hash(await allLedger()),complete)
 expectedAudits.set(lossInput.eventRef,lossInput.auditIntent)

 const crashKey='positive_sigkill_key_'+nonce,crashCommand={dispatcher:capability,commandRef:'positive_sigkill_command_'+nonce};commands.set(crashKey,crashCommand)
 const crashRecord=(await ten.reserveOperation(context,binding,crashKey)).record,crashReceipt=await quarantine(crashRecord.operationRef,crashCommand)
 const crashInput=commitInput(crashRecord.operationRef,crashKey,'positive_sigkill_original_'+nonce);let committedLedger
 const cut=await runPositiveReconciliationProcessCutV1(crashInput,{workspace,actor,capability,workerRef,input,outcomes,command:crashCommand,grantVersion:authority.grantVersion,expectedReceipt:crashReceipt,recoveryRequestId:'positive_new_process_recovery_'+nonce},async()=>{
  const observed=JSON.parse(await sql(`select jsonb_build_object('state',o.state,'version',o.version,'receipt',o.receipt_ref,'result',r.canonical_result::jsonb,'audit',i.reconciliation_event,'delivery',d.state)
   from public.assistant_operations o join public.assistant_safe_results r using(workspace_id,operation_ref)
   join public.assistant_original_audit_intents i on i.workspace_id=o.workspace_id and i.operation_ref=o.operation_ref and i.operation_version=o.version
   join public.assistant_audit_delivery_outbox d on d.workspace_id=i.workspace_id and d.event_ref=i.event_ref
   where o.workspace_id='${workspace}' and o.operation_ref=${literal(crashRecord.operationRef)} and i.event_ref=${literal(crashInput.eventRef)};`))
  assert.equal(observed.state,'completed');assert.equal(observed.version,5);assert.equal(observed.receipt,crashReceipt)
  assert.deepEqual(observed.result,result);assert.deepEqual(observed.audit,crashInput.auditIntent);assert.equal(observed.delivery,'pending')
  committedLedger=hash(await allLedger())
 },terminateOwnedSessions)
 assert.equal(cut.signal,'SIGKILL');assert.equal(cut.independentRecovery,true)
 assert.equal(cut.receiptDigest,hash(crashReceipt));assert.equal(cut.resultDigest,hash(canonicalArgumentsV1(result)))
 assert.equal(hash(await allLedger()),committedLedger);expectedAudits.set(crashInput.eventRef,crashInput.auditIntent)
 console.log('POSITIVE RECONCILIATION PROCESS CUT PASS:original commit/audit/delivery independently inspected;actual owned Node SIGKILL observed;different Node and native backend authorized full original result recovery;entire original ledger unchanged;no restart/full23/business handler claim')
 for(const [fn,remove,oracle] of [
  ['assistant_durable_v1_reconcile_completed'," if not found then raise exception using errcode='42501',message='assistant_reconciliation_forbidden';end if;",'reconciliation_unregistered_policy_accepted'],
  ['assistant_durable_v1_reconcile_completed',' or t>=g.expires_at','reconciliation_expired_grant_accepted'],
  ['assistant_durable_v1_reconcile_completed',` or p_event is distinct from encode(extensions.digest(convert_to(format('["%s","%s",%s]',p_workspace::text,p_operation,p_version),'UTF8'),'sha256'),'hex')`,'reconciliation_wrong_event_identity_accepted'],
  ['assistant_durable_v1_reconcile_completed',' insert into public.assistant_audit_delivery_outbox(workspace_id,event_ref,next_eligible_at,created_at) values(p_workspace,p_event,t,t);','reconciliation_atomic_rollback_incomplete'],
  ['assistant_result_data_valid_v1','   if not found then return false;end if;','reconciliation_invalid_result_accepted'],
 ]){
  const definition=await sql(`select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=${literal(fn)};`)
  assert.ok(definition.includes(remove));const rejected=await run('begin;'+terminatedCatalogFunctionDefinition(definition.replace(remove,''))+readFileSync('supabase/tests/assistant-verified-completed-reconciliation.sql','utf8'))
  assert.notEqual(rejected.code,0);assert.ok(rejected.err.includes(oracle));await sql(terminatedCatalogFunctionDefinition(definition))
  assert.equal(await sql(`select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=${literal(fn)};`),definition)
 }
 const auditWorker={...authority,actorId:auditActor,grantVersion:1,workerRef:'positive_audit_worker_'+nonce,permissions:new Set([...authority.permissions,'assistant:audit:deliver'])}
 await sql(`insert into auth.users(id,email) values('${auditActor}','audit-${nonce}@example.invalid');
 insert into public.workspace_members(workspace_id,user_id,role,status) values('${workspace}','${auditActor}','member','active');
 insert into public.assistant_registered_audit_workers(workspace_id,worker_ref,actor_id,capability,expires_at) values('${workspace}','${auditWorker.workerRef}','${auditActor}','${capability}',clock_timestamp()+interval '1 hour');create table public.${auditSink}(event_ref text primary key,packet jsonb);revoke all on public.${auditSink} from public,anon,authenticated,service_role;`)
 const originals=await sql(`select jsonb_agg(to_jsonb(i) order by event_ref) from public.assistant_original_audit_intents i where capability='${capability}';`)
 const drain=createDurableAuditDrainV1({port:createDurableAuditDeliveryPortV1({currentWorker:async()=>auditWorker,invoke}),deliver:async packet=>{
  assert.equal(packet.event.actorId,actor);assert.notEqual(packet.event.actorId,auditActor)
  if(expectedAudits.has(packet.event.eventRef)){assert.deepEqual(packet.event.reconciliationEvent,expectedAudits.get(packet.event.eventRef));assert.equal(Object.keys(packet.event.reconciliationEvent).length,8)}
  await sql(`insert into public.${auditSink} values(${literal(packet.event.eventRef)},${literal(JSON.stringify(packet))}::jsonb) on conflict do nothing;`)
  const retained=JSON.parse(await sql(`select packet from public.${auditSink} where event_ref=${literal(packet.event.eventRef)};`));assert.deepEqual(retained,packet)
  return {status:'accepted',workspaceId:workspace,eventRef:packet.event.eventRef,digestAlgorithm:packet.digestAlgorithm,contentDigest:packet.contentDigest,receiptRef:hash('positive_audit:'+packet.event.eventRef)}
 }})
 const page=await drain.processPage();assert.equal(page.status,'page_processed');assert.equal(page.delivered,12);assert.equal((await drain.processPage()).status,'empty_page')
 assert.equal(await sql(`select count(*) from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.capability='${capability}' and d.state='pending';`),'0')
 assert.equal(await sql(`select jsonb_agg(to_jsonb(i) order by event_ref) from public.assistant_original_audit_intents i where capability='${capability}';`),originals)
 const finalAudit=await auditInspector.inspect()
 const positiveEffect=await createNativePositiveEffectInspectorV3(sql,sink,{...binding,operationRef:record.operationRef}).inspect()
 assert.deepEqual(positiveEffect,{effectCount:1})
 console.log(JSON.stringify({kind:'durable_v3_native_positive_effect_observation',scenario:'reconciliation_primitive',effect:positiveEffect,source:'owned_synthetic_receipt_ledger',verified_absence:'NOT_RUN',full23:'NOT_RUN'}))
 const operationSlice=await createNativeDurableOperationInspectorV3(sql,{...binding,operationRef:record.operationRef}).inspect()
 assert.deepEqual(operationSlice,{operationCount:1,state:'completed'})
 console.log(JSON.stringify({kind:'durable_v3_native_operation_observation',scenario:'reconciliation_primitive',operation:operationSlice,full23:'NOT_RUN'}))
 const driverOperation=await verifyNativeDriverOperationSliceV3(sql,{...binding,operationRef:candidate.operationRef})
 console.log(JSON.stringify({kind:'durable_v3_native_driver_operation_observation',scenario:'reconciliation_primitive',...driverOperation}))
 assert.equal(finalAudit.originalAuditIntents,4);assert.equal(finalAudit.deliveredOriginalEvents,4);assert.equal(finalAudit.pendingOriginalEvents,0)
 assert.equal(finalAudit.outcomeDeliveredEvents,1);assert.equal(finalAudit.outcomePendingEvents,0);assert.equal(finalAudit.baselinePendingOriginalEvents,3)
 assert.equal(finalAudit.baselineAuditContentDigest,finalAudit.persistedBaselineAuditContentDigest)
 console.log(JSON.stringify({kind:'durable_v3_native_audit_observation',scenario:'reconciliation_primitive',ledger:finalAudit,full23:'NOT_RUN'}))
 console.log('POSITIVE RECONCILIATION NATIVE PASS:20 distinct independent Node processes/native backends same persistent connection one completion19 conflicts;original expired lease/full receipt/full result;ten complete methods plus positive reconciliation;targeted postcommit reply loss/authorized replay;actual postcommit Node SIGKILL/different process backend recovery;current grant expiry after observed customer row lock;five SQL mutants exact-restored;twelve immutable original audits drained by a distinct current actor including three complete eight-field reconciliation events;NOT full11/verified absence/full23/four independent Node races/business handler/before-effect SIGKILL/restart')
}finally{
 for(const child of owned)child.kill('SIGKILL')
 await run(`drop table if exists public.${sink},public.${outcomes},public.${auditSink};`)
}
