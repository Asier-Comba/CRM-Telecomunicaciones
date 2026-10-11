// Private partial audit-worker evidence. Full V3 crash/restart driver NOT_RUN.
import assert from 'node:assert/strict'
import {spawn,spawnSync} from 'node:child_process'
import {randomBytes,createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {isExpectedNativeImage} from './expected-image.mjs'
import {createDurableAuditDeliveryPortV1} from '../../../src/assistant/durable-audit-delivery-port.ts'
const container=process.env.TELECOM_NATIVE_TEST_CONTAINER??''
assert.match(container,/^[0-9a-f]{12,64}$/)
const image=spawnSync('docker',['inspect','--format={{.Config.Image}}',container],{encoding:'utf8'})
assert.equal(image.status,0);assert.ok(isExpectedNativeImage(image.stdout.trim()))
const database='telecom_test',workspace='b2000000-0000-4000-8000-000000000001',actor='a1000000-0000-4000-8000-000000000001'
const args=['exec','-i','-u','postgres',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',database]
const nonce=randomBytes(12).toString('hex'),capability='fixture.audit.'+nonce,worker='audit_native_worker_'+nonce
const auth=`set request.jwt.claim.sub='${actor}';`,owned=new Set()
function run(input){return new Promise((resolve,reject)=>{
 const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']});owned.add(child)
 let out='',err='',timedOut=false
 const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},30000)
 child.stdout.on('data',b=>{out+=b;if(out.length>32768)child.kill('SIGKILL')})
 child.stderr.on('data',b=>{err+=b;if(err.length>32768)child.kill('SIGKILL')})
 child.on('error',e=>{clearTimeout(timer);owned.delete(child);reject(e)})
 child.on('close',code=>{clearTimeout(timer);owned.delete(child);resolve({code,out,err,pid:child.pid,timedOut})})
 // Do not print transient claim proofs in PostgreSQL error statements/details.
 // Session-local settings on this verified synthetic database only.
 child.stdin.end("set log_min_error_statement='panic';set log_error_verbosity='terse';"+input)
})}
async function sql(input){const r=await run(input);assert.equal(r.code,0,'native audit SQL failed');assert.equal(r.timedOut,false);return r.out.trim()}
const state=e=>sql(`select to_jsonb(d) from public.assistant_audit_delivery_outbox d where workspace_id='${workspace}' and event_ref='${e}';`)
async function fixture(suffix){
 const proof=JSON.parse(await sql(auth+`select public.assistant_durable_v1_issue('${workspace}','${capability}','${'a'.repeat(64)}');`)).confirmationRef
 assert.match(proof,/^[0-9a-f]{64}$/)
 const r=JSON.parse(await sql(auth+`select public.assistant_durable_v1_confirm_reserve('${workspace}','${proof}','${capability}','${'a'.repeat(64)}',
 'audit_native_key_${suffix}_${nonce}','${capability}','audit_native_command_${suffix}_${nonce}','audit_native_original_${nonce}');`))
 assert.equal(r.status,'reserved');assert.match(r.operationRef,/^[0-9a-f]{64}$/)
 const e=await sql(`select event_ref from public.assistant_original_audit_intents where workspace_id='${workspace}' and operation_ref='${r.operationRef}';`)
 assert.match(e,/^[0-9a-f]{64}$/);return {event:e,operation:r.operationRef}
}
const claim=e=>`public.assistant_durable_v1_claim_audit('${workspace}','${worker}',1,'${e}',1)`
try{
 assert.equal(await sql('select current_database();'),database)
 await sql(`insert into public.assistant_registered_dispatchers values('${capability}','${capability}',1);
 insert into public.assistant_registered_audit_workers(workspace_id,worker_ref,actor_id,capability,expires_at)
 values('${workspace}','${worker}','${actor}','${capability}',clock_timestamp()+interval '1 hour');`)
 const port=createDurableAuditDeliveryPortV1({currentWorker:async()=>({authentication:'user_session',actorId:actor,workspaceId:workspace,
  workerRef:worker,capability,grantVersion:1,permissions:new Set(['assistant:audit:deliver'])}),invoke:async(operation,input)=>{
  for(const value of Object.values(input))assert.match(value,/^[A-Za-z0-9_.:+-]*$/)
  const parameters={assistant_durable_v1_claim_audit:[input.p_workspace,input.p_worker,input.p_authority_version,input.p_event,input.p_version],
   assistant_durable_v1_ack_audit:[input.p_workspace,input.p_worker,input.p_authority_version,input.p_event,input.p_version,input.p_fence,input.p_claim,input.p_receipt],
   assistant_durable_v1_list_audit:[input.p_workspace,input.p_worker,input.p_authority_version,input.p_after_time,input.p_after_event]}
  assert.ok(Object.hasOwn(parameters,operation))
  return {data:JSON.parse(await sql(auth+`select public.${operation}(${parameters[operation].map(v=>`'${v}'`).join(',')});`)),error:null}
 }})
 const race=await fixture('race')
 const originalBefore=await sql(`select to_jsonb(i) from public.assistant_original_audit_intents i where event_ref='${race.event}';`)
 const contenders=await Promise.all(Array.from({length:20},()=>run(auth+`select jsonb_build_object('backend',pg_backend_pid(),'receipt',${claim(race.event)});`)))
 assert.equal(new Set(contenders.map(r=>r.pid)).size,20);assert.ok(contenders.every(r=>r.code===0&&!r.timedOut))
 const rows=contenders.map(r=>JSON.parse(r.out.trim()));assert.equal(new Set(rows.map(r=>r.backend)).size,20)
 assert.equal(rows.filter(r=>r.receipt.status==='applied').length,1);assert.equal(rows.filter(r=>r.receipt.status==='version_conflict').length,19)
 const raw=rows.find(r=>r.receipt.status==='applied').receipt
 const oldClaim={workspaceId:workspace,eventRef:race.event,workerRef:raw.workerRef,grantVersion:raw.grantVersion,
  version:raw.version,fence:raw.fence,claimRef:raw.claimRef,claimedAt:raw.claimedAt,leaseExpiresAt:raw.leaseExpiresAt}
 // Independent disposable sink ledger deduplicates exact original content.
 // Accepted sink transaction closes before ACK is deliberately withheld. This
 // is an unacked/lost-reply fixture, not a claimed SIGKILL or live provider test.
 const sink='assistant_native_audit_sink_'+nonce
 await sql(`create table public.${sink}(workspace_id uuid,event_ref text,content jsonb,receipt_ref text,primary key(workspace_id,event_ref));`)
 const sinkReceipt=createHash('sha256').update('synthetic_audit_receipt:'+race.event).digest('hex')
 async function accept(event){
  const literal=JSON.stringify(event).replaceAll("'","''")
  await sql(`insert into public.${sink} values('${workspace}','${race.event}','${literal}'::jsonb,'${sinkReceipt}') on conflict do nothing;`)
  assert.equal(await sql(`select content='${literal}'::jsonb from public.${sink} where workspace_id='${workspace}' and event_ref='${race.event}';`),'t')
 }
 await accept(raw.event)
 await sql(`update public.assistant_audit_delivery_outbox set lease_expires_at=clock_timestamp()-interval '1 millisecond' where event_ref='${race.event}';`)
 const resumed=await port.claim(race.event,2);assert.equal(resumed.status,'applied');assert.equal(resumed.claim.fence,2);assert.equal(resumed.claim.version,3)
 assert.deepEqual(resumed.event,raw.event);await accept(resumed.event)
 assert.equal(await sql(`select count(*) from public.${sink};`),'1')
 const beforeBadAck=await state(race.event)
 assert.deepEqual(await port.ack({...oldClaim,version:3},sinkReceipt),{status:'invalid_claim'})
 assert.equal(await state(race.event),beforeBadAck)
 assert.deepEqual(await port.ack(resumed.claim,sinkReceipt),{status:'applied',version:4})
 assert.deepEqual(await port.ack(resumed.claim,'audit_changed_sink_receipt_'+nonce),{status:'version_conflict'})
 assert.equal(JSON.parse(await state(race.event)).receipt_ref,sinkReceipt)
 assert.equal(await sql(`select to_jsonb(i) from public.assistant_original_audit_intents i where event_ref='${race.event}';`),originalBefore)
 await sql(`drop table public.${sink};`)
 const trigger='assistant_audit_native_cut_'+nonce
 await sql(`create function public.${trigger}() returns trigger language plpgsql as $fixture$
 begin if current_setting('test.assistant.audit.cut',true)='on' then raise exception 'synthetic_audit_cutpoint';end if;return NEW;end;$fixture$;
 create trigger ${trigger} after update on public.assistant_audit_delivery_outbox for each row execute function public.${trigger}();`)
 const cut=await fixture('cut'),beforeCut=await state(cut.event)
 const failedClaim=await run(auth+`set test.assistant.audit.cut='on';select ${claim(cut.event)};`)
 assert.notEqual(failedClaim.code,0);assert.equal(failedClaim.timedOut,false);assert.match(failedClaim.err,/synthetic_audit_cutpoint/)
 assert.equal(await state(cut.event),beforeCut)
 const retried=await port.claim(cut.event,1);assert.equal(retried.status,'applied')
 const beforeAck=await state(cut.event)
 const failedAck=await run(auth+`set test.assistant.audit.cut='on';select public.assistant_durable_v1_ack_audit('${workspace}','${worker}',1,'${cut.event}',2,1,'${retried.claim.claimRef}','audit_native_cut_receipt_${nonce}');`)
 assert.notEqual(failedAck.code,0);assert.equal(failedAck.timedOut,false);assert.match(failedAck.err,/synthetic_audit_cutpoint/)
 assert.equal(await state(cut.event),beforeAck)
 assert.deepEqual(await port.ack(retried.claim,'audit_native_cut_receipt_'+nonce),{status:'applied',version:3})
 await sql(`drop trigger ${trigger} on public.assistant_audit_delivery_outbox;drop function public.${trigger}();`)
 const waiting=await fixture('wait'),waitWorker='audit_native_wait_worker_'+nonce,marker='audit_native_lock_'+nonce
 await sql(`insert into public.assistant_registered_audit_workers(workspace_id,worker_ref,actor_id,capability,expires_at)
 values('${workspace}','${waitWorker}','${actor}','${capability}',clock_timestamp()+interval '3 seconds');`)
 const beforeWait=await state(waiting.event)
 const holder=run(`set application_name='${marker}';begin;select event_ref from public.assistant_audit_delivery_outbox where event_ref='${waiting.event}' for update;select pg_sleep(4);commit;`)
 let locked=false
 for(let i=0;i<80&&!locked;i++){
  locked=await sql(`select count(*)=1 from pg_stat_activity a join pg_locks l on l.pid=a.pid where a.application_name='${marker}' and a.wait_event='PgSleep' and l.relation='public.assistant_audit_delivery_outbox'::regclass and l.mode='RowShareLock' and l.granted;`)==='t'
  if(!locked)await new Promise(resolve=>setTimeout(resolve,25))
 }
 assert.equal(locked,true)
 const waited=await run(auth+`select jsonb_build_object('startedBeforeExpiry',clock_timestamp()<expires_at) from public.assistant_registered_audit_workers where worker_ref='${waitWorker}';select public.assistant_durable_v1_claim_audit('${workspace}','${waitWorker}',1,'${waiting.event}',1);`)
 assert.equal(waited.code,0);assert.equal(waited.timedOut,false)
 const [started,expired]=waited.out.trim().split('\n').map(line=>JSON.parse(line))
 assert.equal(started.startedBeforeExpiry,true);assert.deepEqual(expired,{status:'forbidden'});assert.equal((await holder).code,0)
 assert.equal(await state(waiting.event),beforeWait)
 for(let i=0;i<21;i++)await fixture('page'+i)
 const page1=await port.listEligible();assert.equal(page1.status,'applied');assert.equal(page1.items.length,20);assert.ok(page1.nextCursor)
 const page2=await port.listEligible(page1.nextCursor);assert.equal(page2.status,'applied');assert.equal(page2.items.length,2);assert.equal(page2.nextCursor,null)
 const discovered=[...page1.items,...page2.items];assert.equal(new Set(discovered.map(i=>i.eventRef)).size,22)
 assert.equal(await sql(`select count(*) from public.assistant_original_audit_intents i join public.assistant_audit_delivery_outbox d using(workspace_id,event_ref) where i.workspace_id='${workspace}' and i.capability='${capability}' and d.state='pending';`),'22')
 const fromQueue=await port.claim(page1.items[0].eventRef,page1.items[0].version);assert.equal(fromQueue.status,'applied')
 assert.deepEqual(await port.ack(fromQueue.claim,'audit_queue_discovered_receipt_'+nonce),{status:'applied',version:3})
 const stableTail=await port.listEligible(page1.nextCursor);assert.equal(stableTail.status,'applied');assert.deepEqual(stableTail.items,page2.items)
 console.log('AUDIT QUEUE NATIVE PASS:22 exact eligible events;20+2 keyset pages without duplication;claim/ACK from discovered version;tail unchanged after earlier delivery. Current scoped private worker only.')
 const queueSource=readFileSync('supabase/migrations/20261011040500_assistant_audit_queue.sql','utf8').replace(/\r\n/g,'\n')
 const queueDefinition=queueSource.slice(queueSource.indexOf('create function'),queueSource.indexOf('revoke all on function'))
 for(const [removed,expected] of [[' and i.capability=g.capability','audit_queue_foreign_capability_disclosed'],
  ['  and (after_time is null or (i.created_at,i.event_ref)>(after_time,p_after_event))','audit_queue_keyset_skipped_or_duplicated']]){
  assert.ok(queueDefinition.includes(removed))
  const definition="select pg_get_functiondef('public.assistant_durable_v1_list_audit(uuid,text,bigint,text,text)'::regprocedure);",before=await sql(definition)
  const mutant=await run('begin;'+queueDefinition.replace('create function','create or replace function').replace(removed,'')+readFileSync('supabase/tests/assistant-audit-queue.sql','utf8'))
  assert.notEqual(mutant.code,0);assert.equal(mutant.timedOut,false);assert.ok(mutant.err.includes(expected));assert.equal(await sql(definition),before)
 }
 const source=readFileSync('supabase/migrations/20261011034500_assistant_audit_delivery_workers.sql','utf8').replace(/\r\n/g,'\n')
 for(const [name,signature,removed,expected] of [
  ['assistant_durable_v1_ack_audit','uuid,text,bigint,text,bigint,bigint,text,text',' or d.fence<>p_fence','audit_future_fence_accepted'],
  ['assistant_durable_v1_ack_audit','uuid,text,bigint,text,bigint,bigint,text,text',' or d.claim_ref is distinct from p_claim','audit_wrong_claim_proof_accepted'],
  ['assistant_durable_v1_claim_audit','uuid,text,bigint,text,bigint',' or t>=g.expires_at','audit_expired_grant_accepted'],
 ]){
  const from=source.indexOf('create function public.'+name+'('),to=source.indexOf('revoke all on function public.'+name+'(',from)
  const original=source.slice(from,to);assert.ok(original.includes(removed))
  const definition=`select pg_get_functiondef('public.${name}(${signature})'::regprocedure);`,before=await sql(definition)
  const mutant=await run('begin;'+original.replace('create function','create or replace function').replace(removed,'')+readFileSync('supabase/tests/assistant-audit-delivery.sql','utf8'))
  assert.notEqual(mutant.code,0);assert.equal(mutant.timedOut,false);assert.ok(mutant.err.includes(expected));assert.equal(await sql(definition),before)
 }
 console.log('AUDIT DELIVERY NATIVE PASS:20 processes/backends one claim;exact-content sink dedup after unacked expiry;old ACK rejected;claim/ACK rollback and retry;grant expiry after blocking lock;seven SQL fence/identity/lease denials;three mutants restored. NO live provider/SIGKILL/full23/W4 acceptance.')
}finally{for(const child of owned)child.kill('SIGKILL')}
