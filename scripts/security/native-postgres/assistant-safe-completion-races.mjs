// Private partial completion evidence in the existing owned native fixture.
// Twenty SQL processes/backends, not full23 or twenty independent Node workers.
import assert from 'node:assert/strict'
import {spawn,spawnSync} from 'node:child_process'
import {randomBytes,createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {isExpectedNativeImage} from './expected-image.mjs'
import {CapabilityRegistry} from '../../../src/assistant/registry.ts'
import {argumentsDigest} from '../../../src/assistant/runtime.ts'
import {createDurableCommandMaterialProducerV1,createDurableMaterialReservationPortV1} from '../../../src/assistant/durable-command-material.ts'
import {createDurableResultMaterialProducerV1} from '../../../src/assistant/durable-result-material.ts'
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
const fields={assistant_durable_v1_load_operation:['p_workspace','p_operation'],assistant_durable_v1_complete:['p_workspace','p_worker','p_authority_version','p_operation','p_version','p_receipt','p_output_schema_version','p_schema_digest','p_result','p_audit','p_event'],assistant_durable_v1_load_result:['p_workspace','p_worker','p_authority_version','p_operation'],assistant_durable_v1_issue:['p_workspace','p_capability','p_digest'],assistant_durable_v1_confirm_reserve_material:['p_workspace','p_confirmation','p_capability','p_digest','p_key','p_dispatcher','p_command','p_request','p_material'],assistant_durable_v1_start_execution:['p_workspace','p_operation','p_capability','p_digest','p_version'],
 assistant_durable_v1_claim_effect:['p_workspace','p_worker','p_authority_version','p_outbox','p_version'],assistant_durable_v1_ack_effect:['p_workspace','p_worker','p_authority_version','p_outbox','p_version','p_fence','p_claim','p_receipt','p_request'],
 assistant_durable_v1_list_audit:['p_workspace','p_worker','p_authority_version','p_after_time','p_after_event'],assistant_durable_v1_claim_audit:['p_workspace','p_worker','p_authority_version','p_event','p_version'],assistant_durable_v1_ack_audit:['p_workspace','p_worker','p_authority_version','p_event','p_version','p_fence','p_claim','p_receipt']}
let race=false,ready=0,release,loseReply=false,expiryBarrier=false;const barrier=new Promise(resolve=>{release=resolve}),processes=[],backends=[]
const sink='completion_native_receipts_'+nonce,auditSink='completion_native_audit_sink_'+nonce
async function invoke(operation,params,signal){
 if(signal?.aborted)throw Error('native_completion_cancelled')
 const names=fields[operation];assert.ok(names);assert.deepEqual(Object.keys(params).sort(),[...names].sort())
 if(race&&operation==='assistant_durable_v1_complete'){if(++ready===20)release();await barrier}
 if(signal?.aborted)throw Error('native_completion_cancelled')
 if(expiryBarrier&&operation==='assistant_durable_v1_complete')await sql(`update public.assistant_registered_effect_workers set authority_version=2,expires_at=clock_timestamp()+interval '1 second' where workspace_id='${workspace}' and worker_ref='${workerRef}';`)
 const appName=expiryBarrier&&operation==='assistant_durable_v1_complete'?`set application_name='completion_expiry_wait_${nonce}';`:''
 const result=await run(auth+appName+`select jsonb_build_object('backend',pg_backend_pid(),'data',public.${operation}(${names.map(f=>literal(params[f])+(f==='p_material'?'::jsonb':'')).join(',')}));`)
 assert.equal(result.code,0,'native effect RPC failed');assert.equal(result.timedOut,false);const value=JSON.parse(result.out.trim())
 if(race&&operation==='assistant_durable_v1_complete'){processes.push(result.pid);backends.push(value.backend)}
 if(loseReply&&operation==='assistant_durable_v1_complete'){loseReply=false;throw Error('synthetic_postcommit_ack_reply_lost')}
 return {data:value.data,error:null}
}
const reservation=createDurableMaterialReservationPortV1({authority:async()=>authority,producer,invoke})
const port=createDurableBusinessOutboxPortV1({reservation,currentWorker:async()=>authority,producer,invoke,
 loadOutbox:async(_worker,ref)=>{const raw=await sql(`select jsonb_build_object('outboxRef',outbox_ref,'operationRef',operation_ref,'binding',jsonb_build_object('actorId',actor_id,'workspaceId',workspace_id,'capability',capability,'argumentsDigest',arguments_digest),'command',jsonb_build_object('dispatcher',dispatcher_key,'commandRef',command_ref),'version',version) from public.assistant_effect_outbox where workspace_id='${workspace}' and outbox_ref=${literal(ref)};`)
  if(race){if(++ready===20)release();await barrier}return raw?JSON.parse(raw):null},
 verifyReceipt:async(_worker,metadata,claimFence,receiptRef)=>{const raw=await sql(`select admission from public.${sink} where workspace_id='${workspace}' and outbox_ref=${literal(metadata.outboxRef)} and receipt_ref=${literal(receiptRef)} and admission->>'claimFence'=${literal(claimFence)};`);return raw?JSON.parse(raw):null}})
async function fixture(suffix){const confirmation=await port.issueConfirmation(context,binding,new Date(Date.now()+300000))
 const result=await port.confirmReserveEnqueue(context,{confirmationRef:confirmation.operationRef,binding,idempotencyKey:'effect_native_key_'+suffix+'_'+nonce,command:{dispatcher:capability,commandRef:'effect_native_command_'+suffix+'_'+nonce}})
 assert.equal(result.status,'reserved');assert.equal((await port.startExecution(context,result.record.operationRef,binding,1)).status,'applied')
 const ref=await sql(`select outbox_ref from public.assistant_effect_outbox where workspace_id='${workspace}' and operation_ref=${literal(result.record.operationRef)};`);assert.match(ref,/^[0-9a-f]{64}$/);return ref}
async function accept(claim){const r=claim.record,receiptRef=hash('synthetic_effect_receipt:'+r.outboxRef),admission={workspaceId:workspace,actorId:actor,outboxRef:r.outboxRef,operationRef:r.operationRef,capability,argumentsDigest:digest,dispatcher:capability,commandRef:r.command.commandRef,claimFence:claim.claimFence,receiptRef,receiptAuthority:'registered_effect_source.v1'}
 const found=await sql(`begin;insert into public.${sink} values('${workspace}',${literal(r.outboxRef)},${literal(receiptRef)},${literal(JSON.stringify(admission))}::jsonb) on conflict do nothing;select count(*) from public.${sink} where workspace_id='${workspace}' and outbox_ref=${literal(r.outboxRef)} and admission=${literal(JSON.stringify(admission))}::jsonb;commit;`);assert.equal(found,'1');return receiptRef}
const aggregate=()=>sql(`select jsonb_build_object('operations',(select jsonb_agg(to_jsonb(x) order by operation_ref) from public.assistant_operations x where capability='${capability}'),'outboxes',(select jsonb_agg(to_jsonb(x) order by outbox_ref) from public.assistant_effect_outbox x where capability='${capability}'),'audits',(select jsonb_agg(to_jsonb(x) order by event_ref) from public.assistant_original_audit_intents x where capability='${capability}'),'results',(select jsonb_agg(to_jsonb(x) order by operation_ref) from public.assistant_safe_results x where capability='${capability}'),'deliveries',(select jsonb_agg(to_jsonb(x) order by x.event_ref) from public.assistant_audit_delivery_outbox x join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.capability='${capability}'));`)
const outcomes='completion_native_outcomes_'+nonce,cut='completion_native_cut_'+nonce,expectedAudits=new Map()
const resultProducer=createDurableResultMaterialProducerV1({registry,registrations:[{dispatcher:capability,capability,schemaVersion:1,
 authorizeResult:async(ctx,_record,result)=>await sql(`select count(*) from public.customers where workspace_id=${literal(ctx.workspaceId)}::uuid and id=${literal(result.data.customerRef)}::uuid;`)==='1'}],authority:async()=>authority,
 loadOutcome:async(_current,record,command)=>{const raw=await sql(`select outcome from public.${outcomes} where workspace_id='${workspace}' and operation_ref=${literal(record.operationRef)} and command_ref=${literal(command.commandRef)} and receipt_ref=${literal(record.effectReceiptRef)};`);return raw?JSON.parse(raw):null}})
const completion=createDurableCompletionPortV1({business:port,currentWorker:async()=>authority,producer:resultProducer,
 loadCommand:async(_current,operation)=>{const raw=await sql(`select jsonb_build_object('dispatcher',dispatcher_key,'commandRef',command_ref) from public.assistant_registered_commands where workspace_id='${workspace}' and operation_ref=${literal(operation)} and actor_id='${actor}';`);return raw?JSON.parse(raw):null},invoke})
async function preparedCompletion(suffix){
 const ref=await fixture(suffix),claim=await port.claimOutbox(context,ref,1);assert.equal(claim.status,'applied')
 const receipt=await accept(claim);assert.equal((await port.ackOutbox(context,ref,2,claim.claimFence,receipt)).status,'applied')
 const record=await port.loadAuthorizedOperation(context,claim.record.operationRef,new Date())
 const result={status:'SUCCESS',capability,data:input},command=claim.record.command,eventRef=hash('completion:'+record.operationRef)
 await sql(`insert into public.${outcomes} values('${workspace}',${literal(record.operationRef)},${literal(command.commandRef)},${literal(receipt)},${literal(JSON.stringify({binding,operationRef:record.operationRef,command,receiptRef:receipt,result,sourceAuthority:'registered_result_source.v1'}))}::jsonb);`)
 return {operationRef:record.operationRef,binding,expectedVersion:3,result,eventRef}
}
const originalAudit=(requestId,durationMs)=>({event:'assistant.capability.completed',requestId,actorId:actor,workspaceId:workspace,capability,
 accessClass:'SAFE_WRITE',status:'SUCCESS',reasonCode:'capability_success',confirmationState:'accepted',idempotencyState:'reserved',durationMs})
const allOriginals=()=>sql(`select jsonb_agg(to_jsonb(i) order by event_ref) from public.assistant_original_audit_intents i where capability='${capability}';`)
try{
 assert.equal(await sql('select current_database();'),database)
 const schema=registry.get(capability).outputSchema
 await sql(`insert into public.assistant_registered_dispatchers values('${capability}','${capability}',1);
 insert into public.assistant_registered_effect_workers(workspace_id,worker_ref,actor_id,capability,dispatcher_key,schema_version,expires_at) values('${workspace}','${workerRef}','${actor}','${capability}','${capability}',1,clock_timestamp()+interval '1 hour');
 insert into public.assistant_registered_result_schemas values('${capability}','${capability}',1,1,'SAFE_WRITE',${literal(canonicalArgumentsV1(schema))},${literal(argumentsDigest(schema))},'{"customerRef":"customer","label":"scalar"}');
 create table public.${sink}(workspace_id uuid,outbox_ref text,receipt_ref text,admission jsonb,primary key(workspace_id,outbox_ref));
 create table public.${outcomes}(workspace_id uuid,operation_ref text,command_ref text,receipt_ref text,outcome jsonb,primary key(workspace_id,operation_ref));
 revoke all on public.${sink},public.${outcomes} from public,anon,authenticated,service_role;`)
 const candidate=await preparedCompletion('completion_race');race=true
 const auditInputs=Array.from({length:20},(_,i)=>originalAudit('completion_original_'+i+'_'+nonce,123+i))
 const results=await Promise.all(auditInputs.map(auditIntent=>completion.completeOperationWithAuditIntent({...context,requestId:auditIntent.requestId},{...candidate,auditIntent})))
 race=false;assert.equal(ready,20);assert.equal(new Set(processes).size,20);assert.equal(new Set(backends).size,20)
 assert.equal(results.filter(r=>r.status==='applied').length,1);assert.equal(results.filter(r=>r.status==='version_conflict').length,19)
 const winner=results.findIndex(r=>r.status==='applied');expectedAudits.set(candidate.eventRef,auditInputs[winner])
 const committed=hash(await aggregate())
 const replay=await completion.loadAuthorizedOperation({...context,requestId:'completion_authorized_replay_'+nonce},candidate.operationRef,new Date())
 assert.equal(replay.state,'completed');assert.equal(replay.version,4);assert.deepEqual(replay.result,candidate.result);assert.equal(hash(await aggregate()),committed)
 const replyLost=await preparedCompletion('completion_replyloss'),original=originalAudit('completion_lost_reply_original_'+nonce,234)
 loseReply=true;await assert.rejects(completion.completeOperationWithAuditIntent({...context,requestId:original.requestId},{...replyLost,auditIntent:original}));expectedAudits.set(replyLost.eventRef,original)
 const afterLoss=hash(await aggregate());assert.equal((await completion.loadAuthorizedOperation(context,replyLost.operationRef,new Date())).state,'completed');assert.equal(hash(await aggregate()),afterLoss)
 await assert.rejects(completion.completeOperationWithAuditIntent({...context,requestId:'completion_changed_retry_'+nonce},{...replyLost,auditIntent:originalAudit('completion_changed_retry_'+nonce,999)}));assert.equal(hash(await aggregate()),afterLoss)
 const rollback=await preparedCompletion('completion_rollback'),rollbackAudit=originalAudit('completion_rollback_original_'+nonce,345),before=hash(await aggregate())
 await sql(`create function public.${cut}() returns trigger language plpgsql set search_path='' as $$begin if NEW.event_ref='${rollback.eventRef}' then raise exception 'synthetic_native_completion_cut';end if;return NEW;end$$;
 create trigger ${cut} after insert on public.assistant_audit_delivery_outbox for each row execute function public.${cut}();`)
 await assert.rejects(completion.completeOperationWithAuditIntent({...context,requestId:rollbackAudit.requestId},{...rollback,auditIntent:rollbackAudit}));assert.equal(hash(await aggregate()),before)
 await sql(`drop trigger ${cut} on public.assistant_audit_delivery_outbox;drop function public.${cut}();`)
 assert.equal((await completion.completeOperationWithAuditIntent({...context,requestId:rollbackAudit.requestId},{...rollback,auditIntent:rollbackAudit})).status,'applied');expectedAudits.set(rollback.eventRef,rollbackAudit)
 const expiryCandidate=await preparedCompletion('completion_expiry'),expiryOriginal=originalAudit('completion_expiry_original_'+nonce,456)
 const beforeExpiry=hash(await aggregate()),holderName='completion_expiry_holder_'+nonce
 const holder=run(`begin;set application_name='${holderName}';select 1 from public.customers where id=${literal(input.customerRef)}::uuid for update;select pg_sleep(4);rollback;`)
 let sleeping=false;for(let n=0;n<20;n++){if(await sql(`select exists(select 1 from pg_stat_activity where application_name='${holderName}' and wait_event='PgSleep');`)==='t'){sleeping=true;break}}assert.ok(sleeping)
 authority.grantVersion=2;expiryBarrier=true
 const expiring=completion.completeOperationWithAuditIntent({...context,requestId:expiryOriginal.requestId},{...expiryCandidate,auditIntent:expiryOriginal}),expiryDenied=assert.rejects(expiring)
 let waiting=false;for(let n=0;n<25;n++){
  const observed=JSON.parse(await sql(`select jsonb_build_object('waiting',exists(select 1 from pg_stat_activity where application_name='completion_expiry_wait_${nonce}' and wait_event_type='Lock'),'live',clock_timestamp()<(select expires_at from public.assistant_registered_effect_workers where workspace_id='${workspace}' and worker_ref='${workerRef}'));`))
  if(observed.waiting){assert.ok(observed.live);waiting=true;break}
 }
 assert.ok(waiting);assert.equal((await holder).code,0);await expiryDenied;expiryBarrier=false;assert.equal(hash(await aggregate()),beforeExpiry)
 // Exact original completion SQL fixture catches independently applied mutants.
 const migration=readFileSync('supabase/migrations/20261011070000_assistant_safe_completion.sql','utf8').replace(/\r\n/g,'\n')
 for(const [fn,remove,expected] of [
  ['assistant_durable_v1_complete',' and x.schema_digest=p_schema_digest','completion_unregistered_schema_accepted'],
  ['assistant_durable_v1_complete',' if t>=o.lease_expires_at then return jsonb_build_object(\'status\',\'invalid_transition\');end if;','completion_expired_operation_accepted'],
  ['assistant_durable_v1_complete',' or t>=g.expires_at','completion_expired_grant_accepted'],
  ['assistant_durable_v1_complete',' insert into public.assistant_audit_delivery_outbox(workspace_id,event_ref,next_eligible_at,created_at) values(p_workspace,p_event,t,t);','completion_atomic_rollback_incomplete'],
  ['assistant_result_data_valid_v1','   if not found then return false;end if;','completion_invalid_result_accepted'],
 ]){
  const start=migration.indexOf('create function public.'+fn+'('),end=migration.indexOf('\nend$$;',start)+8,definition=migration.slice(start,end)
  assert.ok(start>=0&&end>start&&definition.includes(remove));const mutant=await run('begin;'+definition.replace('create function','create or replace function').replace(remove,'')+readFileSync('supabase/tests/assistant-safe-completion.sql','utf8'))
  assert.notEqual(mutant.code,0);assert.ok(mutant.err.includes(expected));await sql(definition.replace('create function','create or replace function'))
 }
 const originals=hash(await allOriginals()),auditWorker={...authority,grantVersion:1,workerRef:'completion_audit_worker_'+nonce,permissions:new Set([...authority.permissions,'assistant:audit:deliver'])}
 await sql(`insert into public.assistant_registered_audit_workers(workspace_id,worker_ref,actor_id,capability,expires_at) values('${workspace}','${auditWorker.workerRef}','${actor}','${capability}',clock_timestamp()+interval '1 hour');
 create table public.${auditSink}(workspace_id uuid,event_ref text,content_digest text,packet jsonb,receipt_ref text,primary key(workspace_id,event_ref));revoke all on public.${auditSink} from public,anon,authenticated,service_role;`)
 const auditPort=createDurableAuditDeliveryPortV1({currentWorker:async()=>auditWorker,invoke})
 const drain=createDurableAuditDrainV1({port:auditPort,deliver:async packet=>{
  const event=packet.event,receipt=hash('completion_audit:'+event.eventRef)
  if(expectedAudits.has(event.eventRef)){assert.deepEqual(event.capabilityEvent,expectedAudits.get(event.eventRef));assert.equal(Object.keys(event.capabilityEvent).length,11)}
  await sql(`insert into public.${auditSink} values('${workspace}',${literal(event.eventRef)},${literal(packet.contentDigest)},${literal(JSON.stringify(packet))}::jsonb,${literal(receipt)}) on conflict do nothing;`)
  const original=JSON.parse(await sql(`select jsonb_build_object('digest',content_digest,'packet',packet,'receipt',receipt_ref) from public.${auditSink} where workspace_id='${workspace}' and event_ref=${literal(event.eventRef)};`))
  assert.equal(original.digest,packet.contentDigest);assert.deepEqual(original.packet,packet)
  return {status:'accepted',workspaceId:workspace,eventRef:event.eventRef,digestAlgorithm:packet.digestAlgorithm,contentDigest:packet.contentDigest,receiptRef:original.receipt}
 }})
 const page=await drain.processPage();assert.equal(page.status,'page_processed');assert.equal(page.delivered,11);assert.equal((await drain.processPage()).status,'empty_page')
 assert.equal(await sql(`select count(*) from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.capability='${capability}' and d.state='pending';`),'0')
 assert.equal(await sql(`select count(*) from public.${auditSink};`),'11');assert.equal(hash(await allOriginals()),originals)
 console.log('SAFE COMPLETION NATIVE PASS:20 distinct SQL processes/backends;one completion19 conflicts;registered result producer;original receipt;postcommit loss/authorized replay;atomic rollback/retry;grant expiry after observed customer lock;five SQL mutants restored;eleven original audits including full eleven-field completion payloads drained;NOT full23/independent Node workers/business handler/SIGKILL/restart')
}finally{
 for(const child of owned)child.kill('SIGKILL')
 // Only nonce-owned fixture resources, after checking the existing owned cluster.
 await run(`drop trigger if exists ${cut} on public.assistant_audit_delivery_outbox;drop function if exists public.${cut}();drop table if exists public.${sink},public.${outcomes},public.${auditSink};`)
}
