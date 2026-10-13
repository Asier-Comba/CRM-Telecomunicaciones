import test from 'node:test'
import assert from 'node:assert/strict'
import {CapabilityRegistry} from '../../src/assistant/registry.ts'
import type {CapabilityDefinition,CapabilityResult} from '../../src/assistant/contracts.ts'
import type {DurableIdempotencyRecord} from '../../src/assistant/durable-contracts.ts'
import type {CommandMaterialAuthorityV1} from '../../src/assistant/durable-command-material.ts'
import {createDurableResultMaterialProducerV1,preparedResultParametersV1,type PreparedResultMaterialV1} from '../../src/assistant/durable-result-material.ts'
const capability='fixture.result.update',permission='fixture:result:write'
const actor='a1000000-0000-4000-8000-000000000001',workspace='b2000000-0000-4000-8000-000000000001',customer='c3000000-0000-4000-8000-000000000001'
const command={dispatcher:capability,commandRef:'result_command_reference_0001'}
const record:DurableIdempotencyRecord={operationRef:'result_operation_reference_0001',idempotencyKey:'result_key_'+'0123456789',binding:{actorId:actor,workspaceId:workspace,capability,argumentsDigest:'a'.repeat(64)},
 state:'effect_applied',attempt:1,version:3,effectReceiptRef:'verified_effect_receipt_reference',leaseExpiresAt:'2026-10-11T04:05:00Z',createdAt:'2026-10-11T04:00:00Z',updatedAt:'2026-10-11T04:00:01Z'}
const result:CapabilityResult={status:'SUCCESS',capability,data:{customerRef:customer,label:'Synthetic result'}}
function fixture(){
 const registry=new CapabilityRegistry(),definition:CapabilityDefinition={contractVersion:3,name:capability,description:'Synthetic result admission',permission,accessClass:'SAFE_WRITE',confirmationPolicy:'preview_confirm',idempotencyRequired:true,
  tenantScope:{source:'server_context',modelMayChooseWorkspace:false},inputSchema:{type:'object',properties:{},required:[],additionalProperties:false},
  outputSchema:{type:'object',properties:{customerRef:{type:'string',minLength:36,maxLength:36},label:{type:'string',maxLength:120}},required:['customerRef','label'],additionalProperties:false},
  outputPolicy:{sourceProjection:'explicit_dto',sensitiveValueScan:'high_confidence'},authorize:async()=>({allowed:true}),handler:async()=>{throw Error('handler_must_not_run')},projectOutput:()=>null}
 registry.register(definition)
 let authority:CommandMaterialAuthorityV1|null={authentication:'user_session',actorId:actor,workspaceId:workspace,scopeEpoch:'scope1',permissions:new Set([capability,permission])},reads=0,authorizations=0
 let observed:unknown={binding:{...record.binding},operationRef:record.operationRef,command:{...command},receiptRef:record.effectReceiptRef,result:structuredClone(result),sourceAuthority:'registered_result_source.v1'}
 const registration={dispatcher:capability,capability,schemaVersion:1,authorizeResult:async(context:CommandMaterialAuthorityV1|{workspaceId:string},_record:Readonly<DurableIdempotencyRecord>,value:Readonly<CapabilityResult>)=>{
  authorizations++;return context.workspaceId===workspace&&typeof value.data==='object'&&value.data!==null&&!Array.isArray(value.data)&&value.data.customerRef===customer
 }}
 const deps={registry,registrations:[registration],authority:async()=>authority,loadOutcome:async()=>{reads++;return observed}}
 return {deps,definition,registration,setAuthority:(v:typeof authority)=>{authority=v},setOutcome:(v:unknown)=>{observed=v},counts:()=>({reads,authorizations}),current:()=>authority}
}
test('registered original receipt/schema/every resource produces only a private branded result',async()=>{
 const f=fixture(),producer=createDurableResultMaterialProducerV1(f.deps),handle=await producer.prepare(record,command,result,'result_request_0123456789')
 assert.equal(JSON.stringify(handle),'{}');assert.deepEqual(Object.keys(handle),[]);assert.ok(Object.isFrozen(handle))
 const p=preparedResultParametersV1(handle,f.current(),record,command)
 assert.equal(p.schemaVersion,1);assert.match(p.schemaDigest,/^[0-9a-f]{64}$/);assert.deepEqual(JSON.parse(p.canonicalResult),result)
 assert.deepEqual(f.counts(),{reads:1,authorizations:2})
 assert.throws(()=>preparedResultParametersV1({} as PreparedResultMaterialV1,f.current(),record,command))
})
test('unregistered output schema or missing resource authorizer denies construction',()=>{
 for(const patch of [{capability:'missing.result.update'},{schemaVersion:0},{authorizeResult:undefined}]){
  const f=fixture();assert.throws(()=>createDurableResultMaterialProducerV1({...f.deps,registrations:[{...f.registration,...patch} as typeof f.registration]}))
 }
})
test('wrong/private/missing/foreign projected result never reaches the original outcome lookup',async()=>{
 for(const value of [{...result,capability:'other.result.update'},{...result,status:'EMPTY'},{...result,replayed:true},{...result,data:{customerRef:customer}},
  {...result,data:{customerRef:customer,label:'x'.repeat(121)}},{...result,data:{customerRef:customer,label:'safe',workspaceId:workspace}},
  {...result,data:{customerRef:customer,label:'Authorization: Bearer '+'x'.repeat(40)}}]){
  const f=fixture();await assert.rejects(createDurableResultMaterialProducerV1(f.deps).prepare(record,command,value,'result_request_0123456789'));assert.equal(f.counts().reads,0)
 }
})
test('result accessors/exotic prototypes are rejected without invoking a getter',async()=>{
 let getters=0
 const value={...result};Object.defineProperty(value,'data',{enumerable:true,get(){getters++;return result.data}})
 for(const candidate of [value,Object.assign(Object.create({}),result)]){const f=fixture();await assert.rejects(createDurableResultMaterialProducerV1(f.deps).prepare(record,command,candidate,'result_request_0123456789'));assert.equal(f.counts().reads,0)}
 assert.equal(getters,0)
})
test('original record accessors and private fields deny admission without reading a getter',async()=>{
 let reads=0;const accessor={...record};Object.defineProperty(accessor,'state',{enumerable:true,get(){reads++;return 'effect_applied'}})
 for(const candidate of [accessor,{...record,privateProof:'forbidden'},{...record,createdAt:'2026-02-30T00:00:00Z'},{...record,idempotencyKey:'short'}]){
  const f=fixture();await assert.rejects(createDurableResultMaterialProducerV1(f.deps).prepare(candidate,command,result,'result_request_0123456789'));assert.equal(f.counts().reads,0)
 }
 assert.equal(reads,0)
})
test('private outcome must match full tenant actor operation command receipt and projected content',async()=>{
 for(const patch of [{binding:{...record.binding,workspaceId:'b2000000-0000-4000-8000-000000000002'}},{binding:{...record.binding,actorId:'a1000000-0000-4000-8000-000000000002'}},
  {binding:{...record.binding,argumentsDigest:'b'.repeat(64)}},{operationRef:'other_operation_reference_0001'},{command:{...command,commandRef:'other_command_reference_0001'}},
  {receiptRef:'different_effect_receipt_reference'},{sourceAuthority:'caller_assertion'},{result:{...result,data:{customerRef:customer,label:'Changed'}}}]){
  const f=fixture();f.setOutcome({binding:record.binding,operationRef:record.operationRef,command,receiptRef:record.effectReceiptRef,result,sourceAuthority:'registered_result_source.v1',...patch})
  await assert.rejects(createDurableResultMaterialProducerV1(f.deps).prepare(record,command,result,'result_request_0123456789'));assert.equal(f.counts().authorizations,0)
 }
})
test('valid schema and original receipt still require current authorization of returned resources',async()=>{
 const f=fixture(),foreign={...result,data:{customerRef:'c3000000-0000-4000-8000-000000000002',label:'Synthetic'}}
 f.setOutcome({binding:record.binding,operationRef:record.operationRef,command,receiptRef:record.effectReceiptRef,result:foreign,sourceAuthority:'registered_result_source.v1'})
 await assert.rejects(createDurableResultMaterialProducerV1(f.deps).prepare(record,command,foreign,'result_request_0123456789'));assert.equal(f.counts().authorizations,1)
})
test('registered schema snapshot is not changed by later registry definition mutation',async()=>{
 const f=fixture(),producer=createDurableResultMaterialProducerV1(f.deps)
 f.definition.outputSchema={type:'string',maxLength:50000}
 await assert.rejects(producer.prepare(record,command,{status:'SUCCESS',capability,data:'arbitrary opaque ref'},'result_request_0123456789'));assert.equal(f.counts().reads,0)
})
test('revoked scope or permission after preparation cannot release result parameters',async()=>{
 const f=fixture(),producer=createDurableResultMaterialProducerV1(f.deps),handle=await producer.prepare(record,command,result,'result_request_0123456789')
 const original=f.current()!
 for(const current of [null,{...original,scopeEpoch:'scope2'},{...original,permissions:new Set([capability])},{...original,workspaceId:'b2000000-0000-4000-8000-000000000002'}])assert.throws(()=>preparedResultParametersV1(handle,current,record,command))
 assert.throws(()=>preparedResultParametersV1(handle,original,{...record,version:4},command))
 assert.throws(()=>preparedResultParametersV1(handle,original,{...record,effectReceiptRef:'other_verified_receipt_reference'},command))
})
test('resource authorizer cannot mutate admitted result content across awaits',async()=>{
 const f=fixture();f.registration.authorizeResult=async(_context,_record,value)=>{(value.data as {label:string}).label='Changed';return true}
 await assert.rejects(createDurableResultMaterialProducerV1(f.deps).prepare(record,command,result,'result_request_0123456789'))
})
test('whole-call deadline cancels an ignored outcome lookup before resource admission',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const f=fixture();let release!:(value:unknown)=>void
 f.deps.loadOutcome=async()=>new Promise(resolve=>{release=resolve})
 const preparing=createDurableResultMaterialProducerV1(f.deps).prepare(record,command,result,'result_request_0123456789')
 const rejected=assert.rejects(preparing)
 for(let i=0;i<12;i++)await Promise.resolve()
 assert.equal(typeof release,'function');t.mock.timers.tick(10000);await rejected
 release({binding:record.binding,operationRef:record.operationRef,command,receiptRef:record.effectReceiptRef,result,sourceAuthority:'registered_result_source.v1'})
 for(let i=0;i<12;i++)await Promise.resolve()
 assert.equal(f.counts().authorizations,0)
})
