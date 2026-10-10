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
