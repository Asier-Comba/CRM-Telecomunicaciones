// Private partial completion evidence in the existing owned native fixture.
// Twenty SQL processes/backends, not full23 or twenty independent Node workers.
import assert from 'node:assert/strict'
import {spawn,spawnSync} from 'node:child_process'
import {randomBytes,createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {isExpectedNativeImage} from './expected-image.mjs'
import {terminatedCatalogFunctionDefinition} from './catalog-function-definition.mjs'
import {CapabilityRegistry} from '../../../src/assistant/registry.ts'
import {argumentsDigest} from '../../../src/assistant/runtime.ts'
import {createDurableCommandMaterialProducerV1,createDurableMaterialReservationPortV1} from '../../../src/assistant/durable-command-material.ts'
import {createDurableResultMaterialProducerV1} from '../../../src/assistant/durable-result-material.ts'
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
const authority={authentication:'user_session',actorId:actor,workspaceId:workspace,scopeEpoch:'synthetic_current_v1',permissions:new Set([capability,'fixture:write']),
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
let race=false,ready=0,release,loseReply=false,expiryBarrier=false;const barrier=new Promise(resolve=>{release=resolve}),processes=[],backends=[]
const sink='completion_native_receipts_'+nonce,auditSink='completion_native_audit_sink_'+nonce
async function invoke(operation,params,signal){
 if(signal?.aborted)throw Error('native_completion_cancelled')
 const names=fields[operation];assert.ok(names);assert.deepEqual(Object.keys(params).sort(),[...names].sort())
 if(race&&operation==='assistant_durable_v1_reserve_material'){if(++ready===20)release();await barrier}
 if(signal?.aborted)throw Error('native_completion_cancelled')
 if(expiryBarrier&&operation==='assistant_durable_v1_reserve_material')await sql(`update public.assistant_registered_effect_workers set authority_version=2,expires_at=clock_timestamp()+interval '1 second' where workspace_id='${workspace}' and worker_ref='${workerRef}';`)
 const appName=expiryBarrier&&operation==='assistant_durable_v1_reserve_material'?`set application_name='completion_expiry_wait_${nonce}';`:''
 const result=await run(auth+appName+`select jsonb_build_object('backend',pg_backend_pid(),'data',public.${operation}(${names.map(f=>literal(params[f])+(f==='p_material'?'::jsonb':'')).join(',')}));`)
 assert.equal(result.code,0,'native effect RPC failed');assert.equal(result.timedOut,false);const value=JSON.parse(result.out.trim())
 if(race&&operation==='assistant_durable_v1_reserve_material'){processes.push(result.pid);backends.push(value.backend)}
 if(loseReply&&operation==='assistant_durable_v1_reserve_material'){loseReply=false;throw Error('synthetic_postcommit_ack_reply_lost')}
 return {data:value.data,error:null}
}
const reservation=createDurableMaterialReservationPortV1({authority:async()=>authority,producer,invoke})
const port=createDurableBusinessOutboxPortV1({reservation,currentWorker:async()=>authority,producer,invoke,
 loadOutbox:async(_worker,ref)=>{const raw=await sql(`select jsonb_build_object('outboxRef',outbox_ref,'operationRef',operation_ref,'binding',jsonb_build_object('actorId',actor_id,'workspaceId',workspace_id,'capability',capability,'argumentsDigest',arguments_digest),'command',jsonb_build_object('dispatcher',dispatcher_key,'commandRef',command_ref),'version',version) from public.assistant_effect_outbox where workspace_id='${workspace}' and outbox_ref=${literal(ref)};`)
  return raw?JSON.parse(raw):null},
 verifyReceipt:async(_worker,metadata,claimFence,receiptRef)=>{const raw=await sql(`select admission from public.${sink} where workspace_id='${workspace}' and outbox_ref=${literal(metadata.outboxRef)} and receipt_ref=${literal(receiptRef)} and admission->>'claimFence'=${literal(claimFence)};`);return raw?JSON.parse(raw):null}})

const outcomes='unconfirmed_native_outcomes_'+nonce
const resultProducer=createDurableResultMaterialProducerV1({registry,registrations:[{dispatcher:capability,capability,schemaVersion:1,
 authorizeResult:async(ctx,_record,result)=>await sql(`select count(*) from public.customers where workspace_id=${literal(ctx.workspaceId)}::uuid and id=${literal(result.data.customerRef)}::uuid;`)==='1'}],authority:async()=>authority,
 loadOutcome:async(_current,record,command)=>{const raw=await sql(`select outcome from public.${outcomes} where workspace_id='${workspace}' and operation_ref=${literal(record.operationRef)} and command_ref=${literal(command.commandRef)} and receipt_ref=${literal(record.effectReceiptRef)};`);return raw?JSON.parse(raw):null}})
const completion=createDurableCompletionPortV1({business:port,currentWorker:async()=>authority,producer:resultProducer,
 loadConfirmationOrigin:async(_worker,operation)=>await sql(`select case when confirmation_ref is null then 'not_applicable' else 'accepted' end from public.assistant_operations where workspace_id='${workspace}' and operation_ref=${literal(operation)} and actor_id='${actor}';`),
 loadCommand:async(_current,operation)=>{const raw=await sql(`select jsonb_build_object('dispatcher',dispatcher_key,'commandRef',command_ref) from public.assistant_registered_commands where workspace_id='${workspace}' and operation_ref=${literal(operation)} and actor_id='${actor}';`);return raw?JSON.parse(raw):null},invoke})

const commands=new Map(),ten=createDurableUnconfirmedReservationPortV1({completion,currentWorker:async()=>authority,producer,invoke,
 loadCommand:async(_worker,current,key)=>{assert.deepEqual(current,binding);return commands.get(key)??null}})
const allLedger=()=>sql(`select jsonb_build_object('operations',(select jsonb_agg(to_jsonb(x) order by operation_ref) from public.assistant_operations x where capability='${capability}'),'commands',(select jsonb_agg(to_jsonb(x) order by command_ref) from public.assistant_registered_commands x where capability='${capability}'),'materials',(select jsonb_agg(to_jsonb(m) order by m.command_ref) from public.assistant_command_material m join public.assistant_registered_commands c using(workspace_id,command_ref) where c.capability='${capability}'),'outboxes',(select jsonb_agg(to_jsonb(x) order by outbox_ref) from public.assistant_effect_outbox x where capability='${capability}'),'audits',(select jsonb_agg(to_jsonb(x) order by event_ref) from public.assistant_original_audit_intents x where capability='${capability}'),'deliveries',(select jsonb_agg(to_jsonb(d) order by d.event_ref) from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.capability='${capability}'),'confirmations',(select count(*) from public.assistant_confirmations where capability='${capability}'));
`)
try{
 assert.equal(await sql('select current_database();'),database)
 const schema=registry.get(capability).outputSchema
 await sql(`insert into public.assistant_registered_dispatchers values('${capability}','${capability}',1);
 insert into public.assistant_unconfirmed_policies values('${capability}','${capability}',1,'SAFE_WRITE','none');
 insert into public.assistant_registered_effect_workers(workspace_id,worker_ref,actor_id,capability,dispatcher_key,schema_version,expires_at) values('${workspace}','${workerRef}','${actor}','${capability}','${capability}',1,clock_timestamp()+interval '1 hour');
 insert into public.assistant_registered_result_schemas values('${capability}','${capability}',1,1,'SAFE_WRITE',${literal(canonicalArgumentsV1(schema))},${literal(argumentsDigest(schema))},'{"customerRef":"customer","label":"scalar"}');
 create table public.${sink}(workspace_id uuid,outbox_ref text,receipt_ref text,admission jsonb,primary key(workspace_id,outbox_ref));
 create table public.${outcomes}(workspace_id uuid,operation_ref text,command_ref text,receipt_ref text,outcome jsonb,primary key(workspace_id,operation_ref));
 revoke all on public.${sink},public.${outcomes} from public,anon,authenticated,service_role;`)
 assert.equal(Object.keys(ten).length,10)
 const key='unconfirmed_race_key_'+nonce,command={dispatcher:capability,commandRef:'unconfirmed_race_command_'+nonce};commands.set(key,command)
 race=true
 const requests=Array.from({length:20},(_,i)=>({...context,requestId:'unconfirmed_original_'+i+'_'+nonce}))
 const decisions=await Promise.all(requests.map(c=>ten.reserveOperation(c,binding,key)))
 race=false;assert.equal(ready,20);assert.equal(new Set(processes).size,20);assert.equal(new Set(backends).size,20)
 assert.equal(decisions.filter(d=>d.status==='reserved').length,1);assert.equal(decisions.filter(d=>d.status==='existing').length,19)
 const winner=decisions.findIndex(d=>d.status==='reserved'),record=decisions[winner].record
 assert.ok(decisions.every(d=>JSON.stringify(d.record)===JSON.stringify(record)))
 assert.equal(await sql(`select request_ref from public.assistant_original_audit_intents where operation_ref=${literal(record.operationRef)};`),requests[winner].requestId)
 assert.equal(await sql(`select count(*) from public.assistant_confirmations where capability='${capability}';`),'0')
 const stored=hash(await allLedger());assert.equal((await ten.reserveOperation({...context,requestId:'unconfirmed_changed_retry_'+nonce},binding,key)).status,'existing');assert.equal(hash(await allLedger()),stored)
 const lossKey='unconfirmed_replyloss_key_'+nonce;commands.set(lossKey,{dispatcher:capability,commandRef:'unconfirmed_replyloss_command_'+nonce});loseReply=true
 await assert.rejects(ten.reserveOperation(context,binding,lossKey));const afterLoss=hash(await allLedger());assert.equal((await ten.reserveOperation(context,binding,lossKey)).status,'existing');assert.equal(hash(await allLedger()),afterLoss)
 assert.equal((await ten.startExecution(context,record.operationRef,binding,1)).status,'applied')
 const outbox=await sql(`select outbox_ref from public.assistant_effect_outbox where operation_ref=${literal(record.operationRef)};`),claim=await ten.claimOutbox(context,outbox,1)
 assert.equal(claim.status,'applied');const receipt=hash('unconfirmed_original_receipt:'+outbox),admission={workspaceId:workspace,actorId:actor,outboxRef:outbox,operationRef:record.operationRef,capability,argumentsDigest:digest,dispatcher:capability,commandRef:command.commandRef,claimFence:claim.claimFence,receiptRef:receipt,receiptAuthority:'registered_effect_source.v1'}
 await sql(`insert into public.${sink} values('${workspace}',${literal(outbox)},${literal(receipt)},${literal(JSON.stringify(admission))}::jsonb);`)
 assert.equal((await ten.ackOutbox(context,outbox,2,claim.claimFence,receipt)).status,'applied')
 const result={status:'SUCCESS',capability,data:input},audit={event:'assistant.capability.completed',requestId:'unconfirmed_completion_original_'+nonce,actorId:actor,workspaceId:workspace,capability,accessClass:'SAFE_WRITE',status:'SUCCESS',reasonCode:'capability_success',confirmationState:'not_applicable',idempotencyState:'reserved',durationMs:123},eventRef=hash('unconfirmed_complete:'+record.operationRef)
 await sql(`insert into public.${outcomes} values('${workspace}',${literal(record.operationRef)},${literal(command.commandRef)},${literal(receipt)},${literal(JSON.stringify({binding,operationRef:record.operationRef,command,receiptRef:receipt,result,sourceAuthority:'registered_result_source.v1'}))}::jsonb);`)
 const originalInput={operationRef:record.operationRef,binding,expectedVersion:3,result,eventRef,auditIntent:audit},principal={...context,requestId:audit.requestId}
 await assert.rejects(ten.completeOperationWithAuditIntent(principal,{...originalInput,auditIntent:{...audit,confirmationState:'accepted'}}))
 assert.equal((await ten.completeOperationWithAuditIntent(principal,originalInput)).status,'applied')
 const complete=hash(await allLedger()),replay=await ten.reserveOperation(context,binding,key)
 assert.equal(replay.status,'existing');assert.equal(replay.record.state,'completed');assert.deepEqual(replay.record.result,result);assert.equal(hash(await allLedger()),complete)
 const expiryKey='unconfirmed_expiry_key_'+nonce;commands.set(expiryKey,{dispatcher:capability,commandRef:'unconfirmed_expiry_command_'+nonce})
 const holderName='unconfirmed_reservation_holder_'+nonce
 const holder=run(`begin;set application_name='${holderName}';select pg_advisory_xact_lock(hashtextextended(jsonb_build_array('${workspace}'::uuid,'${capability}'::text,'${expiryKey}'::text)::text,0));select pg_sleep(4);rollback;`)
 let sleeping=false;for(let n=0;n<20;n++){if(await sql(`select exists(select 1 from pg_stat_activity where application_name='${holderName}' and wait_event='PgSleep');`)==='t'){sleeping=true;break}}assert.ok(sleeping)
 authority.grantVersion=2;expiryBarrier=true
 const denied=assert.rejects(ten.reserveOperation(context,binding,expiryKey));let waiting=false
 for(let n=0;n<25;n++){const observed=JSON.parse(await sql(`select jsonb_build_object('waiting',exists(select 1 from pg_stat_activity where application_name='completion_expiry_wait_${nonce}' and wait_event_type='Lock'),'live',clock_timestamp()<(select expires_at from public.assistant_registered_effect_workers where worker_ref='${workerRef}'));`));if(observed.waiting){assert.ok(observed.live);waiting=true;break}}
 assert.ok(waiting);assert.equal((await holder).code,0);await denied;expiryBarrier=false;assert.equal(hash(await allLedger()),complete)
 // Three independent SQL mutants; restore the exact current function and ACL.
 const originalDefinition=await sql("select pg_get_functiondef('public.assistant_durable_v1_reserve_material(uuid,text,bigint,text,text,text,text,text,text,jsonb)'::regprocedure);")
 for(const [remove,expected] of [
 [" and p.access_class='SAFE_WRITE' and p.confirmation_policy='none' for share;",'unconfirmed_unregistered_policy_accepted'],
 [' or t>=g.expires_at','unconfirmed_expired_grant_accepted'],
 ]){
  assert.ok(originalDefinition.includes(remove))
  let mutant=originalDefinition
  if(expected==='unconfirmed_unregistered_policy_accepted')mutant=mutant.replace(" if not found then raise exception using errcode='42501',message='assistant_unconfirmed_forbidden';end if;",'')
  else mutant=mutant.replaceAll(remove,'')
  const rejected=await run('begin;'+terminatedCatalogFunctionDefinition(mutant)+readFileSync('supabase/tests/assistant-unconfirmed-reservation.sql','utf8'))
  assert.notEqual(rejected.code,0);assert.ok(rejected.err.includes(expected));await sql(terminatedCatalogFunctionDefinition(originalDefinition))
 }
 const deliveryInsert=" insert into public.assistant_audit_delivery_outbox(workspace_id,event_ref,next_eligible_at,created_at) values(p_workspace,event_id,t,t);"
 assert.ok(originalDefinition.includes(deliveryInsert));const rejected=await run('begin;'+terminatedCatalogFunctionDefinition(originalDefinition.replace(deliveryInsert,''))+readFileSync('supabase/tests/assistant-unconfirmed-reservation.sql','utf8'))
 assert.notEqual(rejected.code,0);assert.ok(rejected.err.includes('unconfirmed_atomic_rollback_incomplete'));await sql(terminatedCatalogFunctionDefinition(originalDefinition))
 assert.equal(await sql("select pg_get_functiondef('public.assistant_durable_v1_reserve_material(uuid,text,bigint,text,text,text,text,text,text,jsonb)'::regprocedure);"),originalDefinition)
 const auditWorker={...authority,grantVersion:1,workerRef:'unconfirmed_audit_worker_'+nonce,permissions:new Set([...authority.permissions,'assistant:audit:deliver'])}
 await sql(`insert into public.assistant_registered_audit_workers(workspace_id,worker_ref,actor_id,capability,expires_at) values('${workspace}','${auditWorker.workerRef}','${actor}','${capability}',clock_timestamp()+interval '1 hour');create table public.${auditSink}(event_ref text primary key,packet jsonb);revoke all on public.${auditSink} from public,anon,authenticated,service_role;`)
 const originals=await sql(`select jsonb_agg(to_jsonb(i) order by event_ref) from public.assistant_original_audit_intents i where capability='${capability}';`)
 const drain=createDurableAuditDrainV1({port:createDurableAuditDeliveryPortV1({currentWorker:async()=>auditWorker,invoke}),deliver:async packet=>{
  if(packet.event.eventRef===eventRef)assert.deepEqual(packet.event.capabilityEvent,audit)
  await sql(`insert into public.${auditSink} values(${literal(packet.event.eventRef)},${literal(JSON.stringify(packet))}::jsonb) on conflict do nothing;`)
  const retained=JSON.parse(await sql(`select packet from public.${auditSink} where event_ref=${literal(packet.event.eventRef)};`));assert.deepEqual(retained,packet)
  return {status:'accepted',workspaceId:workspace,eventRef:packet.event.eventRef,digestAlgorithm:packet.digestAlgorithm,contentDigest:packet.contentDigest,receiptRef:hash('unconfirmed_audit:'+packet.event.eventRef)}
 }})
 const page=await drain.processPage();assert.equal(page.status,'page_processed');assert.equal(page.delivered,4);assert.equal((await drain.processPage()).status,'empty_page')
 assert.equal(await sql(`select jsonb_agg(to_jsonb(i) order by event_ref) from public.assistant_original_audit_intents i where capability='${capability}';`),originals)
 console.log('UNCONFIRMED RESERVATION NATIVE PASS:20 distinct SQL processes/backends;one reservation19 original replays;actual ten-method constructor;no fabricated confirmation;targeted postcommit loss;authorized completed replay;original not_applicable eleven-field audit;grant expiry after observed advisory key lock;three SQL mutants restored;four original audits drained;NOT full23/independent Node workers/business handler/SIGKILL/restart')
}finally{
 for(const child of owned)child.kill('SIGKILL')
 await run(`drop table if exists public.${sink},public.${outcomes},public.${auditSink};`)
}
