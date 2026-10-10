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
  const values=operation==='assistant_durable_v1_issue'
   ?[input.p_workspace,input.p_capability,input.p_digest]
   :[input.p_workspace,input.p_confirmation,input.p_capability,input.p_digest,input.p_key,input.p_dispatcher,input.p_command,input.p_request]
  return {data:JSON.parse(await sql(auth+`select public.${operation}(${values.map(v=>`'${v}'`).join(',')});`)),error:null}
 }})
 const typedConfirmation=await port.issueConfirmation(principal,binding,new Date('2099-01-01'))
 const typedKey='native_typed_key_'+nonce
 const typedCommand={confirmationRef:typedConfirmation.operationRef,binding,idempotencyKey:typedKey,command:{dispatcher,commandRef:'native_typed_command_'+nonce}}
 const typedReserved=await port.confirmReserveEnqueue(principal,typedCommand)
 assert.equal(typedReserved.status,'reserved');assert.deepEqual(await ledger(typedKey),one)
 const typedReplay=await port.confirmReserveEnqueue({...principal,requestId:request+'_typed_retry'},typedCommand)
 assert.equal(typedReplay.status,'existing');assert.deepEqual(typedReplay.record,typedReserved.record)
 console.log('TYPED RESERVATION PHYSICAL SEAM PASS: issue/confirmed reservation/exact replay; synthetic DB session only; full port/effects NOT_RUN.')
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
 const source=readFileSync('supabase/migrations/20261011010500_assistant_confirm_reserve_atomic.sql','utf8')
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
