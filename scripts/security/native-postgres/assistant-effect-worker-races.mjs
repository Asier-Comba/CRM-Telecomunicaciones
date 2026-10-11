// Private partial native admission evidence; no production business dispatcher.
import assert from 'node:assert/strict'
import {spawn,spawnSync} from 'node:child_process'
import {randomBytes,createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {isExpectedNativeImage} from './expected-image.mjs'
import {CapabilityRegistry} from '../../../src/assistant/registry.ts'
import {argumentsDigest} from '../../../src/assistant/runtime.ts'
import {createDurableCommandMaterialProducerV1,createDurableMaterialReservationPortV1} from '../../../src/assistant/durable-command-material.ts'
import {createDurableBusinessOutboxPortV1} from '../../../src/assistant/durable-business-outbox-port.ts'
import {createDurableAuditDeliveryPortV1} from '../../../src/assistant/durable-audit-delivery-port.ts'
import {createDurableAuditDrainV1} from '../../../src/assistant/durable-audit-drain.ts'
const container=process.env.TELECOM_NATIVE_TEST_CONTAINER??''
assert.match(container,/^[0-9a-f]{12,64}$/)
const image=spawnSync('docker',['inspect','--format={{.Config.Image}}',container],{encoding:'utf8'})
assert.equal(image.status,0);assert.ok(isExpectedNativeImage(image.stdout.trim()))
const database='telecom_test',workspace='b2000000-0000-4000-8000-000000000001',actor='a1000000-0000-4000-8000-000000000001'
const nonce=randomBytes(12).toString('hex'),capability='fixture.effect.n'+nonce,workerRef='effect_native_worker_'+nonce
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
registry.register({contractVersion:3,name:capability,description:'Disposable scoped effect fixture',inputSchema:{type:'object',properties:{customerRef:{type:'string',maxLength:80},label:{type:'string',maxLength:48}},required:['customerRef','label'],additionalProperties:false},outputSchema:{type:'null'},outputPolicy:{sourceProjection:'explicit_dto',sensitiveValueScan:'high_confidence'},permission:'fixture:write',accessClass:'SAFE_WRITE',confirmationPolicy:'none',idempotencyRequired:true,tenantScope:{source:'server_context',modelMayChooseWorkspace:false},
 authorize:async(ctx,values)=>await sql(`select count(*) from public.customers where id=${literal(values.customerRef)}::uuid and workspace_id=${literal(ctx.workspaceId)}::uuid;`)==='1'?{allowed:true}:{allowed:false,reason:'resource_not_accessible'},handler:async()=>{throw Error('business_handler_not_run')},projectOutput:()=>null})
const producer=createDurableCommandMaterialProducerV1({registry,registrations:[{dispatcher:capability,capability,schemaVersion:1}],authority:async()=>authority,
 loadDraft:async(_current,command)=>{const raw=await sql(`select jsonb_build_object('schemaVersion',schema_version,'arguments',arguments) from public.assistant_command_material where workspace_id='${workspace}' and command_ref=${literal(command.commandRef)};`)
  // Reservation drafts precede the immutable row; fixture input is server owned.
  return {binding,command,...(raw?JSON.parse(raw):{schemaVersion:1,arguments:input})}}})
const fields={assistant_durable_v1_issue:['p_workspace','p_capability','p_digest'],assistant_durable_v1_confirm_reserve_material:['p_workspace','p_confirmation','p_capability','p_digest','p_key','p_dispatcher','p_command','p_request','p_material'],assistant_durable_v1_start_execution:['p_workspace','p_operation','p_capability','p_digest','p_version'],
 assistant_durable_v1_claim_effect:['p_workspace','p_worker','p_authority_version','p_outbox','p_version'],assistant_durable_v1_ack_effect:['p_workspace','p_worker','p_authority_version','p_outbox','p_version','p_fence','p_claim','p_receipt','p_request'],
 assistant_durable_v1_list_audit:['p_workspace','p_worker','p_authority_version','p_after_time','p_after_event'],assistant_durable_v1_claim_audit:['p_workspace','p_worker','p_authority_version','p_event','p_version'],assistant_durable_v1_ack_audit:['p_workspace','p_worker','p_authority_version','p_event','p_version','p_fence','p_claim','p_receipt']}
let race=false,ready=0,release,loseReply=false;const barrier=new Promise(resolve=>{release=resolve}),processes=[],backends=[]
const sink='effect_native_receipts_'+nonce,auditSink='effect_native_audit_sink_'+nonce
async function invoke(operation,params){
 const names=fields[operation];assert.ok(names);assert.deepEqual(Object.keys(params).sort(),[...names].sort())
 const result=await run(auth+`select jsonb_build_object('backend',pg_backend_pid(),'data',public.${operation}(${names.map(f=>literal(params[f])+(f==='p_material'?'::jsonb':'')).join(',')}));`)
 assert.equal(result.code,0,'native effect RPC failed');assert.equal(result.timedOut,false);const value=JSON.parse(result.out.trim())
 if(race&&operation==='assistant_durable_v1_claim_effect'){processes.push(result.pid);backends.push(value.backend)}
 if(loseReply&&operation==='assistant_durable_v1_ack_effect'){loseReply=false;throw Error('synthetic_postcommit_ack_reply_lost')}
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
const aggregate=()=>sql(`select jsonb_build_object('operations',(select jsonb_agg(to_jsonb(x) order by operation_ref) from public.assistant_operations x where capability='${capability}'),'outboxes',(select jsonb_agg(to_jsonb(x) order by outbox_ref) from public.assistant_effect_outbox x where capability='${capability}'),'audits',(select jsonb_agg(to_jsonb(x) order by event_ref) from public.assistant_original_audit_intents x where capability='${capability}'),'deliveries',(select jsonb_agg(to_jsonb(x) order by x.event_ref) from public.assistant_audit_delivery_outbox x join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.capability='${capability}'));`)
try{
 assert.equal(await sql('select current_database();'),database)
 await sql(`insert into public.assistant_registered_dispatchers values('${capability}','${capability}',1);insert into public.assistant_registered_effect_workers(workspace_id,worker_ref,actor_id,capability,dispatcher_key,schema_version,expires_at) values('${workspace}','${workerRef}','${actor}','${capability}','${capability}',1,clock_timestamp()+interval '1 hour');
 create table public.${sink}(workspace_id uuid,outbox_ref text,receipt_ref text,admission jsonb,primary key(workspace_id,outbox_ref));revoke all on public.${sink} from public,anon,authenticated,service_role;`)
 const ref=await fixture('race');race=true
 const results=await Promise.all(Array.from({length:20},()=>port.claimOutbox(context,ref,1)));race=false
 assert.equal(new Set(processes).size,20);assert.equal(new Set(backends).size,20);assert.equal(results.filter(r=>r.status==='applied').length,1);assert.equal(results.filter(r=>r.status==='version_conflict').length,19)
 const claim=results.find(r=>r.status==='applied'),receipt=await accept(claim)
 loseReply=true;await assert.rejects(port.ackOutbox(context,ref,2,claim.claimFence,receipt));const committed=hash(await aggregate())
 assert.equal((await port.ackOutbox({...context,requestId:'effect_new_retry_request_'+nonce},ref,2,claim.claimFence,'effect_different_receipt_reference')).status,'version_conflict');assert.equal(hash(await aggregate()),committed)
 assert.equal(await sql(`select count(*) from public.assistant_original_audit_intents where capability='${capability}' and event='assistant.operation.effect_applied' and request_ref='${context.requestId}';`),'1')
 const rollback=await fixture('rollback'),second=await port.claimOutbox(context,rollback,1),secondReceipt=await accept(second)
 assert.equal(second.status,'applied');const before=hash(await aggregate()),cut='effect_native_cut_'+nonce
 await sql(`create function public.${cut}() returns trigger language plpgsql as $$begin if NEW.workspace_id='${workspace}' and NEW.event_ref in(select event_ref from public.assistant_original_audit_intents where capability='${capability}' and event='assistant.operation.effect_applied') then raise exception 'synthetic_native_effect_cut';end if;return NEW;end$$;revoke all on function public.${cut}() from public,anon,authenticated,service_role;create trigger ${cut} after insert on public.assistant_audit_delivery_outbox for each row execute function public.${cut}();`)
 await assert.rejects(port.ackOutbox(context,rollback,2,second.claimFence,secondReceipt));assert.equal(hash(await aggregate()),before)
 await sql(`drop trigger ${cut} on public.assistant_audit_delivery_outbox;drop function public.${cut}();`)
 assert.equal((await port.ackOutbox(context,rollback,2,second.claimFence,secondReceipt)).status,'applied');assert.equal(await sql(`select count(*) from public.${sink};`),'2')
 const waiting=await fixture('expiry'),holderName='effect_holder_'+nonce,claimName='effect_waiter_'+nonce
 const held=run(`set application_name='${holderName}';begin;select 1 from public.assistant_effect_outbox where workspace_id='${workspace}' and outbox_ref='${waiting}' for update;select pg_sleep(2);commit;`)
 let locked=false;for(let n=0;n<20;n++){if(await sql(`select count(*) from pg_stat_activity where application_name='${holderName}' and wait_event='PgSleep';`)==='1'){locked=true;break}}assert.ok(locked)
 await sql(`update public.assistant_registered_effect_workers set authority_version=2,expires_at=clock_timestamp()+interval '1 second' where workspace_id='${workspace}' and worker_ref='${workerRef}';`)
 const blocked=run(auth+`set application_name='${claimName}';select public.assistant_durable_v1_claim_effect('${workspace}','${workerRef}',2,'${waiting}',1);`)
 let observed=false;for(let n=0;n<20;n++){const raw=JSON.parse(await sql(`select jsonb_build_object('waiting',exists(select 1 from pg_stat_activity where application_name='${claimName}' and wait_event_type='Lock'),'beforeExpiry',clock_timestamp()<(select expires_at from public.assistant_registered_effect_workers where workspace_id='${workspace}' and worker_ref='${workerRef}'));`));if(raw.waiting){assert.ok(raw.beforeExpiry);observed=true;break}}assert.ok(observed)
 assert.equal((await held).code,0);const denied=await blocked;assert.notEqual(denied.code,0);assert.ok(denied.err.includes('assistant_effect_forbidden'))
 assert.equal(await sql(`select count(*) from public.assistant_effect_outbox where workspace_id='${workspace}' and outbox_ref='${waiting}' and state='pending' and version=1 and fence=0;`),'1')
 const migration=readFileSync('supabase/migrations/20261011060000_assistant_effect_workers.sql','utf8').replace(/\r\n/g,'\n')
 for(const [name,signature,remove,expected] of [
  ['assistant_durable_v1_ack_effect','uuid,text,bigint,text,bigint,bigint,text,text,text',' or b.fence<>p_fence','effect_wrong_fence_accepted'],
  ['assistant_durable_v1_ack_effect','uuid,text,bigint,text,bigint,bigint,text,text,text',' or t>=b.lease_expires_at','effect_expired_lease_accepted'],
  ['assistant_durable_v1_ack_effect','uuid,text,bigint,text,bigint,bigint,text,text,text',' insert into public.assistant_audit_delivery_outbox(workspace_id,event_ref,next_eligible_at,created_at) values(p_workspace,event_id,t,t);','effect_ack_atomic_rollback_incomplete'],
  ['assistant_durable_v1_claim_effect','uuid,text,bigint,text,bigint',' or t>=g.expires_at','effect_expired_grant_accepted']]){
  const from=migration.indexOf('create function public.'+name+'('),to=migration.indexOf('revoke all on function public.'+name+'(',from),definition=migration.slice(from,to)
  assert.ok(definition.includes(remove));const query=`select pg_get_functiondef('public.${name}(${signature})'::regprocedure);`,beforeDefinition=hash(await sql(query))
  const mutant=await run('begin;'+definition.replace('create function','create or replace function').replace(remove,'')+readFileSync('supabase/tests/assistant-effect-workers.sql','utf8'))
  assert.notEqual(mutant.code,0);assert.equal(mutant.timedOut,false);assert.ok(mutant.err.includes(expected));assert.equal(hash(await sql(query)),beforeDefinition)
 }
 const auditWorker='effect_audit_worker_'+nonce
 await sql(`insert into public.assistant_registered_audit_workers(workspace_id,worker_ref,actor_id,capability,expires_at) values('${workspace}','${auditWorker}','${actor}','${capability}',clock_timestamp()+interval '1 hour');create table public.${auditSink}(workspace_id uuid,event_ref text,content jsonb,content_digest text,receipt_ref text,primary key(workspace_id,event_ref));revoke all on public.${auditSink} from public,anon,authenticated,service_role;`)
 const originals=()=>sql(`select jsonb_agg(to_jsonb(i) order by event_ref) from public.assistant_original_audit_intents i where capability='${capability}';`),beforeOriginals=hash(await originals())
 const auditPort=createDurableAuditDeliveryPortV1({currentWorker:async()=>({...authority,workerRef:auditWorker,grantVersion:1,permissions:new Set(['assistant:audit:deliver'])}),invoke})
 const drain=createDurableAuditDrainV1({port:auditPort,deliver:async packet=>{const e=packet.event,content=JSON.stringify(e),receipt=hash('synthetic_effect_audit_receipt:'+e.eventRef)
  const raw=await sql(`begin;insert into public.${auditSink} values('${workspace}',${literal(e.eventRef)},${literal(content)}::jsonb,${literal(packet.contentDigest)},${literal(receipt)}) on conflict do nothing;select jsonb_build_object('status','already_accepted','workspaceId',workspace_id,'eventRef',event_ref,'contentDigest',content_digest,'digestAlgorithm',${literal(packet.digestAlgorithm)},'receiptRef',receipt_ref) from public.${auditSink} where workspace_id='${workspace}' and event_ref=${literal(e.eventRef)} and content=${literal(content)}::jsonb and content_digest=${literal(packet.contentDigest)};commit;`);if(!raw)throw Error('synthetic_effect_audit_content_conflict');return JSON.parse(raw)}})
 const drained=await drain.processPage();assert.equal(drained.status,'page_processed');assert.equal(drained.delivered,5);assert.equal(drained.uncertain,0)
 assert.equal(await sql(`select count(*) from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents i using(workspace_id,event_ref) where i.capability='${capability}' and d.state<>'delivered';`),'0')
 assert.equal(await sql(`select count(*) from public.${auditSink} s join public.assistant_original_audit_intents i using(workspace_id,event_ref) where s.content=jsonb_build_object('eventRef',i.event_ref,'workspaceId',i.workspace_id,'operationRef',i.operation_ref,'operationVersion',i.operation_version,'actorId',i.actor_id,'capability',i.capability,'argumentsDigest',i.arguments_digest,'event',i.event,'requestId',i.request_ref,'createdAt',i.created_at,'reasonCode',i.reason_code);`),'5')
 assert.equal(hash(await originals()),beforeOriginals);await sql(`drop table public.${auditSink};drop table public.${sink};`)
 console.log('EFFECT WORKER NATIVE PASS:20 distinct processes/backends and metadata barrier one claim;registered material/resources and receipt lookup;postcommit ACK reply-loss immutable replay;ACK operation/outbox/audit/delivery rollback and retry;grant expires after independently observed blocking lock;four SQL mutants exact-restored;five exact original reservation/effect-applied audits drained with zero pending. Synthetic receipt source only;NO business handler/SIGKILL/restart/full23/W4 acceptance.')
}finally{for(const child of owned)child.kill('SIGKILL')}
