import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createDurableReservationPortV1,DurableReservationUnavailable} from '../../src/assistant/durable-reservation-port.ts'
import type {ReservationRpcV1} from '../../src/assistant/durable-reservation-port.ts'
import type {ReconciliationActor} from '../../src/assistant/durable-contracts.ts'

const binding={actorId:'a1000000-0000-4000-8000-000000000001',workspaceId:'b2000000-0000-4000-8000-000000000001',capability:'fixture.projection',argumentsDigest:'a'.repeat(64)}
const actor:ReconciliationActor={...binding,authentication:'user_session',permissions:new Set(['forged.permission']),requestId:'projection_original_request'}
const issuedAt='2026-10-11T01:25:00+00:00',expiresAt='2026-10-11T01:30:00+00:00'
const record={operationRef:'c'.repeat(64),binding,state:'issued',version:1,issuedAt,expiresAt,updatedAt:issuedAt}
const issued={confirmationRef:record.operationRef,state:'issued',version:1,issuedAt,expiresAt,record}
const operation={operationRef:'d'.repeat(64),idempotencyKey:'projection_idempotency_key',binding,state:'reserved',attempt:1,version:1,leaseExpiresAt:expiresAt,createdAt:issuedAt,updatedAt:issuedAt}
const receipt={status:'reserved',operationRef:operation.operationRef,state:'reserved',version:1,record:operation}
const command={confirmationRef:record.operationRef,binding,idempotencyKey:operation.idempotencyKey,command:{dispatcher:binding.capability,commandRef:'projection_command_reference'}}
function fixture(){
 let permission=true,data:unknown=issued,error:unknown=null,authorityCalls=0
 const calls:{operation:ReservationRpcV1;input:Readonly<Record<string,string>>}[]=[]
 const port=createDurableReservationPortV1({authority:async()=>{authorityCalls++;return {...binding,permissions:new Set(permission?[binding.capability]:[]) }},invoke:async(operation,input)=>{calls.push({operation,input});return {data,error}}})
 return {port,calls,permission:(v:boolean)=>{permission=v},data:(v:unknown)=>{data=v},error:(v:unknown)=>{error=v},authorityCalls:()=>authorityCalls}
}
const safeUnavailable=(error:unknown)=>error instanceof DurableReservationUnavailable&&error.code==='ASSISTANT_DURABLE_RESERVATION_UNAVAILABLE'&&!error.message.includes('private')

test('execution admission uses current authority and the exact persisted successor with a server lease',async()=>{
 const f=fixture(),started={...operation,state:'executing',version:2}
 f.data({status:'applied',record:started})
 assert.deepEqual(await f.port.startExecution(actor,operation.operationRef,binding,1),{status:'applied',record:started})
 assert.deepEqual(f.calls[0],{operation:'assistant_durable_v1_start_execution',input:{p_workspace:binding.workspaceId,
  p_operation:operation.operationRef,p_capability:binding.capability,p_digest:binding.argumentsDigest,p_version:'1'}})
 assert.ok(Object.isFrozen(f.calls[0].input))
 for(const status of ['not_found','binding_mismatch','version_conflict','invalid_transition']){
  f.data({status});assert.deepEqual(await f.port.startExecution(actor,operation.operationRef,binding,1),{status})
 }
 f.permission(false)
 await assert.rejects(f.port.startExecution({...actor,permissions:new Set([binding.capability])},operation.operationRef,binding,1),safeUnavailable)
 assert.equal(f.calls.length,5)
})

test('execution cannot admit unsafe versions, changed records, effects, unbounded leases or raw failure details',async()=>{
 const f=fixture(),started={...operation,state:'executing',version:2}
 for(const version of [0,-1,1.5,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER+1]){
  await assert.rejects(f.port.startExecution(actor,operation.operationRef,binding,version),safeUnavailable)
 }
 assert.equal(f.calls.length,0)
 for(const changed of [{...started,version:3},{...started,state:'reserved'},{...started,binding:{...binding,argumentsDigest:'b'.repeat(64)}},
  {...started,effectReceiptRef:'already_delivered_effect_reference'},{...started,failureCode:'internal_safe'},
  {...started,leaseExpiresAt:'2026-10-11T01:30:00.000001Z'},{...started,private:'body'}]){
  f.data({status:'applied',record:changed});await assert.rejects(f.port.startExecution(actor,operation.operationRef,binding,1),safeUnavailable)
 }
 f.error({message:'private provider and SQL body'})
 await assert.rejects(f.port.startExecution(actor,operation.operationRef,binding,1),safeUnavailable)
})

test('physical reservation seam uses current server authority and closed RPC arguments',async()=>{
 const f=fixture();assert.deepEqual(await f.port.issueConfirmation(actor,binding,new Date('2099-01-01')),record)
 assert.deepEqual(f.calls[0],{operation:'assistant_durable_v1_issue',input:{p_workspace:binding.workspaceId,p_capability:binding.capability,p_digest:binding.argumentsDigest}})
 f.data(receipt);assert.deepEqual(await f.port.confirmReserveEnqueue(actor,command),{status:'reserved',record:operation})
 assert.equal(f.calls[1].input.p_request,actor.requestId);assert.ok(Object.isFrozen(f.calls[1].input));assert.equal(f.authorityCalls(),2)
})
test('caller permissions do not authorize a revoked or foreign reservation',async()=>{
 const f=fixture();f.permission(false)
 assert.deepEqual(await f.port.confirmReserveEnqueue({...actor,permissions:new Set([binding.capability])},command),{status:'forbidden'})
 assert.equal(f.calls.length,0);f.permission(true)
 assert.deepEqual(await f.port.confirmReserveEnqueue({...actor,workspaceId:'b2000000-0000-4000-8000-000000000002'},command),{status:'forbidden'})
 assert.equal(f.calls.length,0)
})
test('receipt without a full projection cannot pretend to implement the typed port',async()=>{
 const f=fixture();const {record:_,...compact}=issued;void _;f.data(compact)
 await assert.rejects(f.port.issueConfirmation(actor,binding,new Date()),safeUnavailable)
})
test('confirmation projection rejects foreign binding, extra data, invalid timestamps and extended TTL',async()=>{
 for(const changed of [{...record,binding:{...binding,workspaceId:'b2000000-0000-4000-8000-000000000002'}},{...record,private:'private raw body'},{...record,issuedAt:'invalid'},{...record,issuedAt:'2026-04-31T01:25:00+00:00',expiresAt:'2026-04-31T01:30:00+00:00',updatedAt:'2026-04-31T01:25:00+00:00'},{...record,expiresAt:'2026-10-11T02:30:00+00:00'}]){
  const f=fixture();f.data({...issued,record:changed});await assert.rejects(f.port.issueConfirmation(actor,binding,new Date()),safeUnavailable)
 }
})
test('reservation projection rejects wrong key, unsafe version, completed-without-result and mismatched receipt',async()=>{
 for(const changed of [{...operation,idempotencyKey:'projection_another_key'},{...operation,version:9007199254740992},{...operation,state:'completed'},{...operation,operationRef:'e'.repeat(64)}]){
  const f=fixture();f.data({...receipt,record:changed});await assert.rejects(f.port.confirmReserveEnqueue(actor,command),safeUnavailable)
 }
})
test('exact existing projection survives retry without trusting a new response request',async()=>{
 const f=fixture();f.data({...receipt,status:'existing'});assert.deepEqual(await f.port.confirmReserveEnqueue({...actor,requestId:'projection_retry_request'},command),{status:'existing',record:operation})
 for(const status of ['conflict','invalid_confirmation','forbidden']){f.data({status});assert.deepEqual(await f.port.confirmReserveEnqueue(actor,command),{status})}
 f.data({status:'conflict',record:operation});await assert.rejects(f.port.confirmReserveEnqueue(actor,command),safeUnavailable)
})
test('malformed command identity and provider failure are closed without raw details',async()=>{
 const f=fixture();await assert.rejects(f.port.confirmReserveEnqueue(actor,{...command,command:{...command.command,commandRef:'https://private.example'}}),safeUnavailable)
 assert.equal(f.calls.length,0);f.error({message:'private database SQL and provider body'})
 await assert.rejects(f.port.issueConfirmation(actor,binding,new Date()),safeUnavailable)
})
test('projection accessors are rejected without execution',async()=>{
 const f=fixture();let invoked=0;const bad=Object.defineProperty({...issued},'record',{get(){invoked++;return record},enumerable:true});f.data(bad)
 await assert.rejects(f.port.issueConfirmation(actor,binding,new Date()),safeUnavailable);assert.equal(invoked,0)
 f.data({status:{toString(){invoked++;return 'conflict'}}})
 await assert.rejects(f.port.confirmReserveEnqueue(actor,command),safeUnavailable);assert.equal(invoked,0)
})
test('physical cancellation uses current authority, exact proof and full terminal record',async()=>{
 const f=fixture(),cancelled={...record,state:'cancelled',version:2,updatedAt:'2026-10-11T01:26:00+00:00'}
 f.data({status:'applied',record:cancelled});assert.deepEqual(await f.port.cancelConfirmation(actor,record.operationRef,binding),{status:'applied',record:cancelled})
 assert.deepEqual(f.calls[0],{operation:'assistant_durable_v1_cancel',input:{p_workspace:binding.workspaceId,p_confirmation:record.operationRef,p_capability:binding.capability,p_digest:binding.argumentsDigest}})
 f.permission(false);await assert.rejects(f.port.cancelConfirmation(actor,record.operationRef,binding),safeUnavailable);assert.equal(f.calls.length,1)
})
test('cancellation cannot claim success from a changed proof, unsafe version or expiry equality',async()=>{
 for(const changed of [{...record,operationRef:'e'.repeat(64),state:'cancelled',version:2},{...record,state:'cancelled',version:9007199254740992},{...record,state:'cancelled',version:2,updatedAt:expiresAt}]){
  const f=fixture();f.data({status:'applied',record:changed});await assert.rejects(f.port.cancelConfirmation(actor,record.operationRef,binding),safeUnavailable)
 }
 const f=fixture();for(const status of ['not_found','binding_mismatch','already_terminal','expired']){f.data({status});assert.deepEqual(await f.port.cancelConfirmation(actor,record.operationRef,binding),{status})}
})
test('cancellation respects PostgreSQL microseconds within a single JavaScript millisecond',async()=>{
 const f=fixture(),cancelled={...record,state:'cancelled',version:2,issuedAt:'2026-10-11T01:25:00.000001Z',updatedAt:'2026-10-11T01:25:00.000002Z',expiresAt:'2026-10-11T01:25:00.000003Z'}
 f.data({status:'applied',record:cancelled});assert.deepEqual(await f.port.cancelConfirmation(actor,record.operationRef,binding),{status:'applied',record:cancelled})
 f.data({...issued,record:{...record,issuedAt:'2026-10-11T01:25:00.000001Z',updatedAt:'2026-10-11T01:25:00.000001Z',expiresAt:'2026-10-11T01:30:00.000002Z'}})
 await assert.rejects(f.port.issueConfirmation(actor,binding,new Date()),safeUnavailable)
})
test('authorized operation lookup returns persisted nonterminal state and ignores caller clock',async()=>{
 const f=fixture();f.data(operation)
 assert.deepEqual(await f.port.loadAuthorizedOperation(actor,operation.operationRef,new Date('2099-01-01')),operation)
 assert.deepEqual(f.calls[0],{operation:'assistant_durable_v1_load_operation',input:{p_workspace:binding.workspaceId,p_operation:operation.operationRef}})
 assert.equal(f.authorityCalls(),2);f.data(null)
 assert.equal(await f.port.loadAuthorizedOperation(actor,operation.operationRef,new Date()),null)
 f.permission(false);f.data(operation)
 assert.equal(await f.port.loadAuthorizedOperation(actor,operation.operationRef,new Date()),null)
 assert.equal(await f.port.loadAuthorizedOperation({...actor,workspaceId:'b2000000-0000-4000-8000-000000000002'},operation.operationRef,new Date()),null)
})
test('lookup does not leak foreign, unsupported completed or malformed physical records',async()=>{
 const f=fixture();f.data({...operation,binding:{...binding,actorId:'a1000000-0000-4000-8000-000000000002'}})
 assert.equal(await f.port.loadAuthorizedOperation(actor,operation.operationRef,new Date()),null)
 for(const changed of [{...operation,state:'completed',result:{private:'body'}},{...operation,version:Number.MAX_SAFE_INTEGER+1},
  {...operation,attempt:0},{...operation,leaseExpiresAt:'2099-01-01T00:00:00Z'},
  {...operation,effectReceiptRef:'https://private.example'},{...operation,state:'effect_applied'},
  {...operation,operationRef:'e'.repeat(64)},{...operation,private:'body'}]){
  f.data(changed);await assert.rejects(f.port.loadAuthorizedOperation(actor,operation.operationRef,new Date()),safeUnavailable)
 }
 let invoked=0;f.data({...operation,failureCode:{toString(){invoked++;return 'internal_safe'}}})
 await assert.rejects(f.port.loadAuthorizedOperation(actor,operation.operationRef,new Date()),safeUnavailable);assert.equal(invoked,0)
})
test('lookup rechecks current permission after a delayed DB reply',async()=>{
 let allowed=true,calls=0
 const port=createDurableReservationPortV1({authority:async()=>({...binding,permissions:new Set(allowed?[binding.capability]:[])}),
  invoke:async()=>{calls++;allowed=false;return {data:operation,error:null}}})
 assert.equal(await port.loadAuthorizedOperation(actor,operation.operationRef,new Date()),null);assert.equal(calls,1)
})
test('recovery admission requires exact successor, immutable binding and closed uncertainty reason',async()=>{
 const f=fixture(),recovered={...operation,state:'reconciliation_required',version:3,failureCode:'internal_safe'}
 f.data({status:'applied',record:recovered})
 assert.deepEqual(await f.port.transitionToReconciliation(actor,operation.operationRef,binding,2,'internal_safe'),{status:'applied',record:recovered})
 assert.equal(f.calls[0].input.p_version,'2');assert.equal(f.calls[0].input.p_request,actor.requestId)
 for(const changed of [{...recovered,version:4},{...recovered,state:'completed'},
  {...recovered,failureCode:'effect_absence_verified_retryable'},{...recovered,binding:{...binding,argumentsDigest:'b'.repeat(64)}}]){
  f.data({status:'applied',record:changed});await assert.rejects(f.port.transitionToReconciliation(actor,operation.operationRef,binding,2,'internal_safe'),safeUnavailable)
 }
 for(const status of ['not_found','binding_mismatch','version_conflict','invalid_transition']){
  f.data({status});assert.deepEqual(await f.port.transitionToReconciliation(actor,operation.operationRef,binding,2,'internal_safe'),{status})
 }
})
test('recovery rejects exhausted versions, raw reasons and forged principal without an RPC',async()=>{
 const f=fixture()
 for(const version of [0,1.5,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER+1])
  await assert.rejects(f.port.transitionToReconciliation(actor,operation.operationRef,binding,version,'internal_safe'),safeUnavailable)
 await assert.rejects(f.port.transitionToReconciliation(actor,operation.operationRef,binding,2,'private provider SQL'),safeUnavailable)
 f.permission(false);await assert.rejects(f.port.transitionToReconciliation({...actor,permissions:new Set([binding.capability])},operation.operationRef,binding,2,'internal_safe'),safeUnavailable)
 assert.equal(f.calls.length,0)
})
