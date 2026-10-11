// Narrow physical reservation evidence; not the full durable-process.v2 driver.
import assert from 'node:assert/strict'
import {spawn,spawnSync} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {isExpectedNativeImage} from './expected-image.mjs'
import {createDurableReservationPortV1} from '../../../src/assistant/durable-reservation-port.ts'

const container=process.env.TELECOM_NATIVE_TEST_CONTAINER??''
assert.match(container,/^[0-9a-f]{12,64}$/)
const image=spawnSync('docker',['inspect','--format={{.Config.Image}}',container],{encoding:'utf8'})
assert.equal(image.status,0);assert.ok(isExpectedNativeImage(image.stdout.trim()))
// This database is created by test-zero-to-head.sh in the verified CI container.
const database='telecom_test'
const workspace='b2000000-0000-4000-8000-000000000001'
const actor='a1000000-0000-4000-8000-000000000001'
const args=['exec','-i','-u','postgres',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d',database]
const nonce=randomBytes(12).toString('hex')
const capability='fixture.atomic.'+nonce
const dispatcher=capability
const digest='a'.repeat(64)
const request='native_atomic_request_'+nonce
const auth=`set request.jwt.claim.sub='${actor}';`
const owned=new Set()
function run(input){
 return new Promise((resolve,reject)=>{
  const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']});owned.add(child)
  let out='',err='',timedOut=false
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL')},30000)
  child.stdout.on('data',b=>{out+=b;if(out.length>32768)child.kill('SIGKILL')})
  child.stderr.on('data',b=>{err+=b;if(err.length>32768)child.kill('SIGKILL')})
  child.on('error',e=>{clearTimeout(timer);owned.delete(child);reject(e)})
  child.on('close',code=>{clearTimeout(timer);owned.delete(child);resolve({code,out,err,pid:child.pid,timedOut})})
  child.stdin.end(input)
 })
}
async function sql(input){const r=await run(input);assert.equal(r.code,0,'native reservation SQL failed');assert.equal(r.timedOut,false);return r.out.trim()}
async function issue(){return JSON.parse(await sql(auth+`select public.assistant_durable_v1_issue('${workspace}','${capability}','${digest}');`)).confirmationRef}
function invoke(ref,key,command,overrides={}){
 const v={workspace,ref,capability,digest,key,dispatcher,command,request,...overrides}
 // Every interpolated value is a fixed synthetic literal or server-issued hex.
 for(const value of Object.values(v))assert.match(value,/^[A-Za-z0-9_.:-]+$/)
 return `public.assistant_durable_v1_confirm_reserve('${v.workspace}','${v.ref}','${v.capability}','${v.digest}','${v.key}','${v.dispatcher}','${v.command}','${v.request}')`
}
async function ledger(key){
 const value=JSON.parse(await sql(`select jsonb_build_object(
  'operations',(select count(*) from public.assistant_operations where workspace_id='${workspace}' and idempotency_key='${key}'),
  'commands',(select count(*) from public.assistant_registered_commands c join public.assistant_operations o using(workspace_id,operation_ref) where o.workspace_id='${workspace}' and o.idempotency_key='${key}'),
  'outbox',(select count(*) from public.assistant_effect_outbox c join public.assistant_operations o using(workspace_id,operation_ref) where o.workspace_id='${workspace}' and o.idempotency_key='${key}'),
  'intents',(select count(*) from public.assistant_original_audit_intents c join public.assistant_operations o using(workspace_id,operation_ref) where o.workspace_id='${workspace}' and o.idempotency_key='${key}'),
  'deliveries',(select count(*) from public.assistant_audit_delivery_outbox d join public.assistant_original_audit_intents c using(workspace_id,event_ref) join public.assistant_operations o using(workspace_id,operation_ref) where o.workspace_id='${workspace}' and o.idempotency_key='${key}'));`))
 return value
}
const one={operations:1,commands:1,outbox:1,intents:1,deliveries:1}
const zero={operations:0,commands:0,outbox:0,intents:0,deliveries:0}
try{
 assert.equal(await sql('select current_database();'),database)
 await sql(`insert into public.assistant_registered_dispatchers values('${dispatcher}','${capability}',1);`)
 // Execute the SAME typed reservation seam against physical SQL, rather than
 // accepting a synthetic JavaScript receipt as database conformance.
 const binding={actorId:actor,workspaceId:workspace,capability,argumentsDigest:digest}
 const principal={actorId:actor,workspaceId:workspace,authentication:'user_session',permissions:new Set(),requestId:request}
 const port=createDurableReservationPortV1({authority:async()=>({actorId:actor,workspaceId:workspace,permissions:new Set([capability])}),invoke:async(operation,input)=>{
  for(const value of Object.values(input))assert.match(value,/^[A-Za-z0-9_.:-]+$/)
  const parameters={
   assistant_durable_v1_issue:[input.p_workspace,input.p_capability,input.p_digest],
   assistant_durable_v1_cancel:[input.p_workspace,input.p_confirmation,input.p_capability,input.p_digest],
   assistant_durable_v1_confirm_reserve:[input.p_workspace,input.p_confirmation,input.p_capability,input.p_digest,input.p_key,input.p_dispatcher,input.p_command,input.p_request],
   assistant_durable_v1_load_operation:[input.p_workspace,input.p_operation],
   assistant_durable_v1_require_reconciliation:[input.p_workspace,input.p_operation,input.p_capability,input.p_digest,input.p_version,input.p_reason,input.p_request],
  }
  assert.ok(Object.hasOwn(parameters,operation));const values=parameters[operation]
  return {data:JSON.parse(await sql(auth+`select public.${operation}(${values.map(v=>`'${v}'`).join(',')});`)),error:null}
 }})
 const typedConfirmation=await port.issueConfirmation(principal,binding,new Date('2099-01-01'))
 const typedKey='native_typed_key_'+nonce
 const typedCommand={confirmationRef:typedConfirmation.operationRef,binding,idempotencyKey:typedKey,command:{dispatcher,commandRef:'native_typed_command_'+nonce}}
 const typedReserved=await port.confirmReserveEnqueue(principal,typedCommand)
 assert.equal(typedReserved.status,'reserved');assert.deepEqual(await ledger(typedKey),one)
 const typedReplay=await port.confirmReserveEnqueue({...principal,requestId:request+'_typed_retry'},typedCommand)
 assert.equal(typedReplay.status,'existing');assert.deepEqual(typedReplay.record,typedReserved.record)
 assert.deepEqual(await port.cancelConfirmation(principal,typedConfirmation.operationRef,binding),{status:'already_terminal'})
 const typedCancelled=await port.issueConfirmation(principal,binding,new Date('2099-01-01'))
 const cancelReceipt=await port.cancelConfirmation(principal,typedCancelled.operationRef,binding)
 assert.equal(cancelReceipt.status,'applied');assert.equal(cancelReceipt.record.state,'cancelled');assert.equal(cancelReceipt.record.version,2)
 console.log('TYPED RESERVATION PHYSICAL SEAM PASS: issue/confirmed reservation/exact replay; synthetic DB session only; full port/effects NOT_RUN.')
 assert.deepEqual(await port.loadAuthorizedOperation(principal,typedReserved.record.operationRef,new Date('2099-01-01')),typedReserved.record)
 async function recoveryFixture(suffix){
  const proof=await issue(),k='native_recovery_key_'+suffix+'_'+nonce
  const receipt=JSON.parse(await sql(auth+`select ${invoke(proof,k,'native_recovery_command_'+suffix+'_'+nonce)};`))
  const operation=receipt.operationRef;assert.match(operation,/^[a-f0-9]{64}$/)
  await sql(`update public.assistant_operations set state='executing',version=2 where workspace_id='${workspace}' and operation_ref='${operation}';
   update public.assistant_effect_outbox set state='dispatching',version=2,fence=1,worker_ref='synthetic_recovery_worker',lease_expires_at=clock_timestamp()+interval '5 minutes'
   where workspace_id='${workspace}' and operation_ref='${operation}';`)
  return {operation,key:k}
 }
 function recoveryCall(operation,requestRef=request){
  assert.match(operation,/^[a-f0-9]{64}$/);assert.match(requestRef,/^[A-Za-z0-9_]+$/)
  return `public.assistant_durable_v1_require_reconciliation('${workspace}','${operation}','${capability}','${digest}',2,'internal_safe','${requestRef}')`
 }
 const recovering=await recoveryFixture('race')
 const recoveryRace=await Promise.all(Array.from({length:20},(_,i)=>run(auth+`select jsonb_build_object('backend',pg_backend_pid(),'receipt',${recoveryCall(recovering.operation,request+'_recovery_'+i)});`)))
 assert.ok(recoveryRace.every(r=>r.code===0&&!r.timedOut));assert.equal(new Set(recoveryRace.map(r=>r.pid)).size,20)
 const recoveryRows=recoveryRace.map(r=>JSON.parse(r.out.trim()));assert.equal(new Set(recoveryRows.map(r=>r.backend)).size,20)
 assert.equal(recoveryRows.filter(r=>r.receipt.status==='applied').length,1);assert.equal(recoveryRows.filter(r=>r.receipt.status==='version_conflict').length,19)
 assert.deepEqual(await ledger(recovering.key),{...one,intents:2,deliveries:2})
 const persistedRecovery=await port.loadAuthorizedOperation(principal,recovering.operation,new Date())
 assert.equal(persistedRecovery.state,'reconciliation_required');assert.equal(persistedRecovery.version,3);assert.equal(persistedRecovery.failureCode,'internal_safe')
 const winnerRequest=request+'_recovery_'+recoveryRows.findIndex(r=>r.receipt.status==='applied')
 assert.equal(await sql(`select request_ref from public.assistant_original_audit_intents where workspace_id='${workspace}' and operation_ref='${recovering.operation}' and operation_version=3;`),winnerRequest)
 assert.deepEqual(await port.transitionToReconciliation(principal,recovering.operation,binding,2,'internal_safe'),{status:'version_conflict'})
 // Actual abort after each write, separate connection observes rollback before retry.
 const triggerName='assistant_recovery_native_'+nonce
 await sql(`create function public.${triggerName}() returns trigger language plpgsql as $fixture$
 begin
 if current_setting('test.assistant.recovery.cut',true)=TG_TABLE_NAME
 and ((TG_TABLE_NAME='assistant_operations' and to_jsonb(NEW)->>'state'='reconciliation_required')
 or (TG_TABLE_NAME='assistant_effect_outbox' and to_jsonb(NEW)->>'state'='reconciliation_required')
 or (TG_TABLE_NAME='assistant_original_audit_intents' and to_jsonb(NEW)->>'event'='assistant.operation.recovery_required')
 or (TG_TABLE_NAME='assistant_audit_delivery_outbox' and exists(select 1 from public.assistant_original_audit_intents i
 where i.workspace_id=(to_jsonb(NEW)->>'workspace_id')::uuid and i.event_ref=to_jsonb(NEW)->>'event_ref' and i.event='assistant.operation.recovery_required'))) then
 raise exception 'synthetic_recovery_cutpoint';end if;return NEW;end;$fixture$;
 create trigger ${triggerName} after update on public.assistant_operations for each row execute function public.${triggerName}();
 create trigger ${triggerName} after update on public.assistant_effect_outbox for each row execute function public.${triggerName}();
 create trigger ${triggerName} after insert on public.assistant_original_audit_intents for each row execute function public.${triggerName}();
 create trigger ${triggerName} after insert on public.assistant_audit_delivery_outbox for each row execute function public.${triggerName}();`)
 for(const [i,table] of ['assistant_operations','assistant_effect_outbox','assistant_original_audit_intents','assistant_audit_delivery_outbox'].entries()){
  const fixture=await recoveryFixture('cut'+i)
  const failed=await run(auth+`set test.assistant.recovery.cut='${table}';select ${recoveryCall(fixture.operation)};`)
  assert.notEqual(failed.code,0);assert.equal(failed.timedOut,false);assert.ok(failed.err.includes('synthetic_recovery_cutpoint'))
  assert.deepEqual(await ledger(fixture.key),one)
  const observed=JSON.parse(await sql(`select jsonb_build_object('state',o.state,'version',o.version,'outboxState',b.state,'outboxVersion',b.version,'fence',b.fence,'worker',b.worker_ref)
   from public.assistant_operations o join public.assistant_effect_outbox b using(workspace_id,operation_ref) where o.workspace_id='${workspace}' and o.operation_ref='${fixture.operation}';`))
  assert.deepEqual(observed,{state:'executing',version:2,outboxState:'dispatching',outboxVersion:2,fence:1,worker:'synthetic_recovery_worker'})
  const applied=await port.transitionToReconciliation(principal,fixture.operation,binding,2,'internal_safe')
  assert.equal(applied.status,'applied');assert.equal(applied.record.version,3);assert.deepEqual(await ledger(fixture.key),{...one,intents:2,deliveries:2})
 }
 await sql(`drop trigger ${triggerName} on public.assistant_operations;drop trigger ${triggerName} on public.assistant_effect_outbox;
 drop trigger ${triggerName} on public.assistant_original_audit_intents;drop trigger ${triggerName} on public.assistant_audit_delivery_outbox;drop function public.${triggerName}();`)
 // Negative controls run the real SQL fixture and roll back the mutated definition.
 const recoveryMigration=readFileSync('supabase/migrations/20261011023000_assistant_operation_recovery.sql','utf8').replace(/\r\n/g,'\n')
 const recoveryTest=readFileSync('supabase/tests/assistant-operation-recovery.sql','utf8').replace(/\r\n/g,'\n')
 for(const [signature,name,replaceFrom,replaceTo,expectedFailure] of [
  ['uuid,text','assistant_durable_v1_load_operation',' and x.actor_id=a','', 'cross_actor_operation_leaked'],
  ['uuid,text,text,text,bigint,text,text','assistant_durable_v1_require_reconciliation',
   ' insert into public.assistant_audit_delivery_outbox(workspace_id,event_ref,next_eligible_at,created_at) values(p_workspace,event_id,t,t);','', 'recovery_atomic_audit_delivery_missing'],
 ]){
  const from=recoveryMigration.indexOf('create function public.'+name+'('),to=recoveryMigration.indexOf('revoke all on function public.'+name+'(',from)
  const original=recoveryMigration.slice(from,to);assert.ok(original.includes(replaceFrom))
  const before=await sql(`select pg_get_functiondef('public.${name}(${signature})'::regprocedure);`)
  const weakened=original.replace('create function','create or replace function').replace(replaceFrom,replaceTo)
  const mutation=await run('begin;'+weakened+recoveryTest);assert.notEqual(mutation.code,0);assert.ok(mutation.err.includes(expectedFailure))
  assert.equal(await sql(`select pg_get_functiondef('public.${name}(${signature})'::regprocedure);`),before)
 }
 console.log('OPERATION RECOVERY NATIVE PASS: typed lookup/CAS quarantine;20 processes/backends one winner;four independently observed rollback/retry cuts;actor/delivery mutants rejected. NO effects/verified outcome/full23/W4 acceptance.')
 const ref=await issue(),key='native_atomic_same_key_'+nonce,command='native_atomic_command_'+nonce
 const same=await Promise.all(Array.from({length:20},(_,i)=>run(auth+`select jsonb_build_object('backend',pg_backend_pid(),'receipt',${invoke(ref,key,command,{request:request+'_'+i})});`)))
 assert.ok(same.every(r=>r.code===0&&!r.timedOut))
 assert.equal(new Set(same.map(r=>r.pid)).size,20)
 const measured=same.map(r=>JSON.parse(r.out.trim()))
 assert.equal(new Set(measured.map(r=>r.backend)).size,20)
 assert.equal(measured.filter(r=>r.receipt.status==='reserved').length,1)
 assert.equal(measured.filter(r=>r.receipt.status==='existing').length,19)
 assert.equal(new Set(measured.map(r=>r.receipt.operationRef)).size,1)
 assert.deepEqual(await ledger(key),one)
 const original=await sql(`select request_ref from public.assistant_original_audit_intents where workspace_id='${workspace}' and operation_ref='${measured[0].receipt.operationRef}';`)
 // The committed first reply is deliberately discarded by this client. A fresh
 // PostgreSQL process must recover the same association without a second intent.
 const replay=JSON.parse(await sql(auth+`select ${invoke(ref,key,command,{request:request+'_lost_reply_retry'})};`))
 assert.equal(replay.status,'existing');assert.equal(replay.operationRef,measured[0].receipt.operationRef)
 assert.deepEqual(await ledger(key),one)
 assert.equal(await sql(`select request_ref from public.assistant_original_audit_intents where workspace_id='${workspace}' and operation_ref='${replay.operationRef}';`),original)
 for(const override of [{digest:'b'.repeat(64)},{command:command+'_changed'},{ref:'f'.repeat(64)}]){
  const conflict=JSON.parse(await sql(auth+`select ${invoke(ref,key,command,override)};`))
  assert.deepEqual(conflict,{status:'conflict'})
 }
 const singleRef=await issue()
 const competition=await Promise.all(Array.from({length:20},(_,i)=>run(auth+`select jsonb_build_object('backend',pg_backend_pid(),'receipt',${invoke(singleRef,'native_atomic_distinct_'+nonce+'_'+i,'native_atomic_distinct_command_'+nonce+'_'+i)});`)))
 assert.ok(competition.every(r=>r.code===0&&!r.timedOut))
 const competing=competition.map(r=>JSON.parse(r.out.trim()))
 assert.equal(new Set(competing.map(r=>r.backend)).size,20)
 assert.equal(competing.filter(r=>r.receipt.status==='reserved').length,1)
 assert.equal(competing.filter(r=>r.receipt.status==='invalid_confirmation').length,19)
 assert.equal(await sql(`select count(*) from public.assistant_operations where workspace_id='${workspace}' and confirmation_ref='${singleRef}';`),'1')
 const cancel=(proof)=>{assert.match(proof,/^[0-9a-f]{64}$/);return `public.assistant_durable_v1_cancel('${workspace}','${proof}','${capability}','${digest}')`}
 const cancelProof=await issue()
 const cancelled=await Promise.all(Array.from({length:20},()=>run(auth+`select jsonb_build_object('backend',pg_backend_pid(),'receipt',${cancel(cancelProof)});`)))
 assert.ok(cancelled.every(r=>r.code===0&&!r.timedOut));assert.equal(new Set(cancelled.map(r=>r.pid)).size,20)
 const cancels=cancelled.map(r=>JSON.parse(r.out.trim()))
 assert.equal(new Set(cancels.map(r=>r.backend)).size,20)
 assert.equal(cancels.filter(r=>r.receipt.status==='applied').length,1)
 assert.equal(cancels.filter(r=>r.receipt.status==='already_terminal').length,19)
 assert.equal(await sql(`select state||':'||version from public.assistant_confirmations where workspace_id='${workspace}' and confirmation_ref='${cancelProof}';`),'cancelled:2')
 assert.equal(await sql(`select count(*) from public.assistant_operations where workspace_id='${workspace}' and confirmation_ref='${cancelProof}';`),'0')
 const mixedProof=await issue(),mixedKey='native_cancel_reserve_key_'+nonce,mixedCommand='native_cancel_reserve_command_'+nonce
 const mixed=await Promise.all(Array.from({length:20},(_,i)=>run(auth+`select jsonb_build_object('backend',pg_backend_pid(),'receipt',${i<10?cancel(mixedProof):invoke(mixedProof,mixedKey,mixedCommand)});`)))
 assert.ok(mixed.every(r=>r.code===0&&!r.timedOut));assert.equal(new Set(mixed.map(r=>r.pid)).size,20)
 const contenders=mixed.map(r=>JSON.parse(r.out.trim()))
 assert.equal(new Set(contenders.map(r=>r.backend)).size,20)
 const terminal=await sql(`select state||':'||version from public.assistant_confirmations where workspace_id='${workspace}' and confirmation_ref='${mixedProof}';`)
 if(terminal==='cancelled:2'){
  assert.equal(contenders.filter(r=>r.receipt.status==='applied').length,1)
  assert.equal(contenders.filter(r=>r.receipt.status==='already_terminal').length,9)
  assert.equal(contenders.filter(r=>r.receipt.status==='invalid_confirmation').length,10)
  assert.deepEqual(await ledger(mixedKey),zero)
 }else{
  assert.equal(terminal,'consumed:2')
  assert.equal(contenders.filter(r=>r.receipt.status==='reserved').length,1)
  assert.equal(contenders.filter(r=>r.receipt.status==='existing').length,9)
  assert.equal(contenders.filter(r=>r.receipt.status==='already_terminal').length,10)
  assert.deepEqual(await ledger(mixedKey),one)
 }
 const cancelSource=readFileSync('supabase/migrations/20261011014500_assistant_confirmation_cancel.sql','utf8').replace(/\r\n/g,'\n')
 const cancelStart=cancelSource.indexOf('create function public.assistant_durable_v1_cancel(')
 const cancelEnd=cancelSource.indexOf('revoke all on function public.assistant_durable_v1_cancel(',cancelStart)
 const cancelDefinition=cancelSource.slice(cancelStart,cancelEnd)
 assert.ok(cancelDefinition.includes(' or c.arguments_digest<>p_digest'))
 const cancelMutant=cancelDefinition.replace('create function','create or replace function').replace(' or c.arguments_digest<>p_digest','')
 const cancelHash=()=>sql("select encode(extensions.digest(convert_to(pg_get_functiondef('public.assistant_durable_v1_cancel(uuid,text,text,text)'::regprocedure),'UTF8'),'sha256'),'hex');")
 const cancelBefore=await cancelHash()
 const cancelNegative=await run('begin;'+cancelMutant+readFileSync('supabase/tests/assistant-confirmation-cancel.sql','utf8'))
 assert.notEqual(cancelNegative.code,0);assert.equal(cancelNegative.timedOut,false);assert.match(cancelNegative.err,/cancel_changed_digest_accepted/)
 assert.equal(await cancelHash(),cancelBefore)
 await sql("create function public.assistant_native_cancel_fault() returns trigger language plpgsql as $$begin if NEW.state='cancelled' and current_setting('test.assistant.cancel.fail',true)='on' then raise exception 'synthetic_cancel_rollback';end if;return NEW;end$$;create trigger assistant_native_cancel_rollback after update on public.assistant_confirmations for each row execute function public.assistant_native_cancel_fault();")
 const cancelRollbackProof=await issue()
 const cancelRollback=await run(auth+`set test.assistant.cancel.fail='on';select ${cancel(cancelRollbackProof)};`)
 assert.notEqual(cancelRollback.code,0);assert.equal(cancelRollback.timedOut,false);assert.match(cancelRollback.err,/synthetic_cancel_rollback/)
 assert.equal(await sql(`select state||':'||version from public.assistant_confirmations where workspace_id='${workspace}' and confirmation_ref='${cancelRollbackProof}';`),'issued:1')
 await sql('drop trigger assistant_native_cancel_rollback on public.assistant_confirmations;drop function public.assistant_native_cancel_fault();')
 assert.equal(JSON.parse(await sql(auth+`select ${cancel(cancelRollbackProof)};`)).status,'applied')
 // Observe an unexpired caller waiting on the proof's actual row lock. Expiry
 // must be measured AFTER the lock becomes available, not at request start.
 const waitingProof=await issue()
 await sql(`with t as(select clock_timestamp()+interval '3 seconds' as expiry) update public.assistant_confirmations c set issued_at=t.expiry-interval '5 minutes',expires_at=t.expiry from t where c.workspace_id='${workspace}' and c.confirmation_ref='${waitingProof}';`)
 const lockMarker='native_cancel_lock_ready_'+nonce
 const holder=run(`set application_name='${lockMarker}';begin;select confirmation_ref from public.assistant_confirmations where workspace_id='${workspace}' and confirmation_ref='${waitingProof}' for update;select pg_sleep(4);commit;`)
 let locked=false
 const barrierDeadline=Date.now()+2500
 while(!locked&&Date.now()<barrierDeadline){
  locked=await sql(`select count(*)=1 from pg_stat_activity a join pg_locks l on l.pid=a.pid where a.application_name='${lockMarker}' and a.wait_event='PgSleep' and l.relation='public.assistant_confirmations'::regclass and l.mode='RowShareLock' and l.granted;`)==='t'
  if(!locked)await new Promise(resolve=>setTimeout(resolve,25))
 }
 assert.equal(locked,true,'independent PostgreSQL lock/sleep barrier was not observed')
 const waiting=await run(auth+`select jsonb_build_object('startedBeforeExpiry',clock_timestamp()<expires_at) from public.assistant_confirmations where workspace_id='${workspace}' and confirmation_ref='${waitingProof}';select ${cancel(waitingProof)};`)
 assert.equal(waiting.code,0);assert.equal(waiting.timedOut,false)
 const [started,expired]=waiting.out.trim().split('\n').map(line=>JSON.parse(line))
 assert.equal(started.startedBeforeExpiry,true);assert.deepEqual(expired,{status:'expired'});assert.equal((await holder).code,0)
 assert.equal(await sql(`select state||':'||version from public.assistant_confirmations where workspace_id='${workspace}' and confirmation_ref='${waitingProof}';`),'expired:2')
 console.log('CONFIRMATION CANCEL NATIVE PASS: one winner/19 terminal refusals;20 cancel-reserve contenders;independent state/ledger;binding mutant rejected. Full durable-process.v2 NOT_RUN.')
 // Inject faults using disposable trigger DDL, never a production RPC fault flag.
 await sql(`create function public.assistant_native_fixture_fault() returns trigger language plpgsql as $$begin
 if current_setting('test.assistant.cutpoint',true)=TG_ARGV[0] then raise exception 'synthetic_atomic_cutpoint';end if;return NEW;end$$;`)
 const points=[
  ['after_confirmation_lookup','assistant_confirmations','before update'],
  ['after_confirmation_consume','assistant_confirmations','after update'],
  ['after_operation_insert','assistant_operations','after insert'],
  ['after_command_insert','assistant_registered_commands','after insert'],
  ['after_outbox_insert','assistant_effect_outbox','after insert'],
  ['before_commit','assistant_audit_delivery_outbox','after insert'],
 ]
 for(const [i,[point,table,event]] of points.entries()){
  await sql(`create trigger assistant_native_cut_${i} ${event} on public.${table} for each row execute function public.assistant_native_fixture_fault('${point}');`)
  const rollbackRef=await issue(),rollbackKey='native_atomic_cut_key_'+nonce+'_'+i,rollbackCommand='native_atomic_cut_command_'+nonce+'_'+i
  const failed=await run(auth+`set test.assistant.cutpoint='${point}';select ${invoke(rollbackRef,rollbackKey,rollbackCommand)};`)
  assert.notEqual(failed.code,0);assert.equal(failed.timedOut,false);assert.match(failed.err,/synthetic_atomic_cutpoint/)
  // A separately connected observer reads actual post-rollback rows.
  assert.deepEqual(await ledger(rollbackKey),zero)
  assert.equal(await sql(`select state||':'||version from public.assistant_confirmations where workspace_id='${workspace}' and confirmation_ref='${rollbackRef}';`),'issued:1')
  await sql(`drop trigger assistant_native_cut_${i} on public.${table};`)
  const retry=JSON.parse(await sql(auth+`select ${invoke(rollbackRef,rollbackKey,rollbackCommand)};`))
  assert.equal(retry.status,'reserved');assert.deepEqual(await ledger(rollbackKey),one)
 }
 await sql('drop function public.assistant_native_fixture_fault();')
 const source=readFileSync('supabase/migrations/20261011010500_assistant_confirm_reserve_atomic.sql','utf8').replace(/\r\n/g,'\n')
 const start=source.indexOf('create function public.assistant_durable_v1_confirm_reserve(')
 const end=source.indexOf('revoke all on function public.assistant_durable_v1_confirm_reserve(',start)
 const omit=/ insert into public\.assistant_audit_delivery_outbox\(workspace_id,event_ref,next_eligible_at,created_at\)\n values\(p_workspace,event_id,t,t\);/
 const originalFunction=source.slice(start,end)
 assert.ok(omit.test(originalFunction))
 const weakened=originalFunction.replace('create function','create or replace function').replace(omit,'')
 const definitionHash=()=>sql("select encode(extensions.digest(convert_to(pg_get_functiondef('public.assistant_durable_v1_confirm_reserve(uuid,text,text,text,text,text,text,text)'::regprocedure),'UTF8'),'sha256'),'hex');")
 const before=await definitionHash()
 // Mutation and temporary fault triggers live only in this client's transaction.
 // ON_ERROR_STOP disconnects after the expected failure, rolling back all DDL.
 const negative=await run('begin;'+weakened+readFileSync('supabase/tests/assistant-confirm-reserve-atomic.sql','utf8'))
 assert.notEqual(negative.code,0);assert.equal(negative.timedOut,false)
 assert.match(negative.err,/atomic_rollback_incomplete/)
 assert.equal(await definitionHash(),before,'mutation changed the tested adapter')
 console.log('ASSISTANT RESERVATION NATIVE PASS: two 20-process/backend races; six independently observed rollbacks/retries; exact replay/original audit/conflicts. NO effects, full23 NOT_RUN, W4 NOT_ACCEPTED.')
}finally{
 // Only child clients owned by this test. The CI service owns fixture teardown.
 for(const child of owned)child.kill('SIGKILL')
}
