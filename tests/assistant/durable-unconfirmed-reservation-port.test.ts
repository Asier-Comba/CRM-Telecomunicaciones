import test from 'node:test'
import assert from 'node:assert/strict'
import {CapabilityRegistry} from '../../src/assistant/registry.ts'
import {argumentsDigest} from '../../src/assistant/runtime.ts'
import {createDurableCommandMaterialProducerV1,preparedUnconfirmedMaterialParametersV1,type PreparedCommandMaterialV1} from '../../src/assistant/durable-command-material.ts'
import {createDurableUnconfirmedReservationPortV1} from '../../src/assistant/durable-unconfirmed-reservation-port.ts'
import type {DurableCompletionPortV1} from '../../src/assistant/durable-completion-port.ts'
import type {EffectWorkerAuthorityV1} from '../../src/assistant/durable-business-outbox-port.ts'
import type {AccessClass,ConfirmationPolicy} from '../../src/assistant/contracts.ts'
const capability='fixture.safe.unconfirmed',permission='fixture:unconfirmed:write',actorId='a1000000-0000-4000-8000-000000000001',workspaceId='b2000000-0000-4000-8000-000000000001'
const args={label:'Synthetic original'},binding={actorId,workspaceId,capability,argumentsDigest:argumentsDigest(args)},key='unconfirmed_original_'+'0123456789'
const command={dispatcher:capability,commandRef:'unconfirmed_command_reference_001'},actor={actorId,workspaceId,authentication:'user_session' as const,permissions:new Set([capability,permission]),requestId:'unconfirmed_original_request_001'}
const reserved={operationRef:'unconfirmed_operation_reference',idempotencyKey:key,binding,state:'reserved' as const,attempt:1,version:1,createdAt:'2026-10-11T04:00:00.123456Z',updatedAt:'2026-10-11T04:00:00.123456Z',leaseExpiresAt:'2026-10-11T04:05:00.123456Z'}
function fixture(accessClass:AccessClass='SAFE_WRITE',confirmationPolicy:ConfirmationPolicy='none'){
 let worker:EffectWorkerAuthorityV1|null={...actor,scopeEpoch:'scope1',workerRef:'unconfirmed_worker_reference_001',grantVersion:1,schemaVersion:1,capability,dispatcher:capability},readable=true,loaded:unknown=reserved,response:unknown={status:'reserved',record:reserved},draft:unknown={binding,command,schemaVersion:1,arguments:args}
 const registry=new CapabilityRegistry(),calls:{params:Readonly<Record<string,string>>;signal:AbortSignal}[]=[],loads:string[]=[]
 registry.register({contractVersion:3,name:capability,description:'Synthetic safe reservation',permission,accessClass,confirmationPolicy,idempotencyRequired:true,
  inputSchema:{type:'object',properties:{label:{type:'string',maxLength:48}},required:['label'],additionalProperties:false},outputSchema:{type:'object',properties:{},required:[],additionalProperties:false},
  outputPolicy:{sourceProjection:'explicit_dto',sensitiveValueScan:'high_confidence'},tenantScope:{source:'server_context',modelMayChooseWorkspace:false},authorize:async()=>readable?{allowed:true}:{allowed:false,reason:'resource_not_accessible'},handler:async()=>{throw Error('never_dispatch')},projectOutput:()=>null})
 const materialDeps={registry,registrations:[{dispatcher:capability,capability,schemaVersion:1}],authority:async()=>worker,loadDraft:async():Promise<unknown>=>structuredClone(draft)}
 const producer=createDurableCommandMaterialProducerV1(materialDeps)
 const completion={loadAuthorizedOperation:async(_actor:unknown,ref:string)=>{loads.push(ref);return structuredClone(loaded)}} as unknown as DurableCompletionPortV1
 const deps={completion,currentWorker:async()=>worker,producer,loadCommand:async():Promise<unknown>=>command,
  invoke:async(_name:'assistant_durable_v1_reserve_material',params:Readonly<Record<string,string>>,signal:AbortSignal):Promise<{data:unknown;error:unknown}>=>{calls.push({params,signal});return {data:structuredClone(response),error:null}}}
 return {deps,producer,materialDeps,calls,loads,port:createDurableUnconfirmedReservationPortV1(deps),worker:()=>worker!,setWorker:(v:EffectWorkerAuthorityV1|null)=>{worker=v},setReadable:(v:boolean)=>{readable=v},setResponse:(v:unknown)=>{response=v},setLoaded:(v:unknown)=>{loaded=v},setDraft:(v:unknown)=>{draft=v}}
}
test('SAFE none reservation sends only actual registered material and no confirmation in one private transaction',async()=>{
 const f=fixture(),r=await f.port.reserveOperation(actor,binding,key);assert.deepEqual(r,{status:'reserved',record:reserved});assert.equal(f.calls.length,1)
 const {params,signal}=f.calls[0];assert.equal(params.p_command,command.commandRef);assert.equal(params.p_request,actor.requestId);assert.ok(!Object.keys(params).some(k=>k.includes('confirmation')));assert.equal(JSON.parse(params.p_material).canonicalArguments,JSON.stringify(args));assert.ok(signal.aborted)
 assert.throws(()=>preparedUnconfirmedMaterialParametersV1({} as PreparedCommandMaterialV1,binding,command,f.worker(),1))
})
test('registered sensitive, irreversible and preview-confirm policies cannot use the unconfirmed seam',async()=>{
 for(const [c,p] of [['SAFE_WRITE','preview_confirm'],['SENSITIVE_WRITE','preview_confirm'],['IRREVERSIBLE','preview_confirm']] as const){const f=fixture(c,p);await assert.rejects(f.port.reserveOperation(actor,binding,key));assert.equal(f.calls.length,0)}
})
test('foreign actor tenant capability digest and service authority deny before private mutation',async()=>{
 for(const [a,b] of [[{...actor,actorId:workspaceId},binding],[{...actor,workspaceId:actorId},binding],[{...actor,authentication:'service_principal' as const},binding],[actor,{...binding,capability:'foreign.capability'}],[actor,{...binding,argumentsDigest:'b'.repeat(64)}]] as const){const f=fixture();await assert.rejects(f.port.reserveOperation(a,b,key));assert.equal(f.calls.length,0)}
})
test('absent, foreign and changed original draft or revoked resource deny before mutation',async()=>{
 for(const bad of [null,{binding,command:{...command,commandRef:'foreign_command_reference_001'},schemaVersion:1,arguments:args},{binding,command,schemaVersion:2,arguments:args},{binding,command,schemaVersion:1,arguments:{label:'changed'}}]){const f=fixture();f.setDraft(bad);await assert.rejects(f.port.reserveOperation(actor,binding,key));assert.equal(f.calls.length,0)}
 const f=fixture();f.setReadable(false);await assert.rejects(f.port.reserveOperation(actor,binding,key));assert.equal(f.calls.length,0)
})
test('grant epoch and permission revocation during original draft validation deny before mutation',async()=>{
 for(const patch of [{grantVersion:2},{scopeEpoch:'scope2'},{permissions:new Set([capability])}]){const f=fixture();f.materialDeps.loadDraft=async()=>{f.setWorker({...f.worker(),...patch});return {binding,command,schemaVersion:1,arguments:args}};await assert.rejects(f.port.reserveOperation(actor,binding,key));assert.equal(f.calls.length,0)}
})
test('existing reservation loads the original authorized DTO and never invents a completed result',async()=>{
 const f=fixture();f.setResponse({status:'existing',operationRef:reserved.operationRef});assert.deepEqual(await f.port.reserveOperation(actor,binding,key),{status:'existing',record:reserved});assert.deepEqual(f.loads,[reserved.operationRef])
 for(const bad of [null,{...reserved,idempotencyKey:'foreign_key_reference_001'},{...reserved,binding:{...binding,actorId:workspaceId}},{...reserved,state:'completed',version:4}]){const f=fixture();f.setResponse({status:'existing',operationRef:reserved.operationRef});f.setLoaded(bad);await assert.rejects(f.port.reserveOperation(actor,binding,key))}
})
test('existing completed replay preserves original result admitted by the completion loader',async()=>{
 const f=fixture(),completed={...reserved,state:'completed',version:4,updatedAt:'2026-10-11T04:00:03Z',effectReceiptRef:'unconfirmed_original_receipt_001',result:{status:'SUCCESS',capability,data:{}}};f.setResponse({status:'existing',operationRef:reserved.operationRef});f.setLoaded(completed);assert.deepEqual(await f.port.reserveOperation({...actor,requestId:'unconfirmed_retry_request_001'},binding,key),{status:'existing',record:completed})
})
test('closed conflict makes no second mutation or operation lookup',async()=>{
 const f=fixture();f.setResponse({status:'conflict'});assert.deepEqual(await f.port.reserveOperation(actor,binding,key),{status:'conflict'});assert.equal(f.calls.length,1);assert.equal(f.loads.length,0)
})
test('lost reply remains unavailable without recreating the original operation',async()=>{
 const f=fixture();f.deps.invoke=async()=>{throw Error('synthetic_reply_loss')};await assert.rejects(createDurableUnconfirmedReservationPortV1(f.deps).reserveOperation(actor,binding,key));assert.equal(f.loads.length,0)
})
test('postcommit input resource revocation does not expose the reserved DTO or redo the mutation',async()=>{
 const f=fixture();f.deps.invoke=async(_name,params,signal)=>{f.calls.push({params,signal});f.setReadable(false);return {data:{status:'reserved',record:reserved},error:null}};await assert.rejects(createDurableUnconfirmedReservationPortV1(f.deps).reserveOperation(actor,binding,key));assert.equal(f.calls.length,1)
})
test('late key lookup and ignored RPC cannot outlive the whole-call deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 for(const stage of ['lookup','rpc']){const f=fixture();let release!:(v:never)=>void
  if(stage==='lookup')f.deps.loadCommand=async()=>new Promise(resolve=>{release=resolve})
  else f.deps.invoke=async(_name,params,signal)=>{f.calls.push({params,signal});return new Promise(resolve=>{release=resolve})}
  const pending=createDurableUnconfirmedReservationPortV1(f.deps).reserveOperation(actor,binding,key),denied=assert.rejects(pending)
  for(let i=0;i<100;i++)await Promise.resolve();assert.equal(typeof release,'function');t.mock.timers.tick(10000);await denied
  release((stage==='lookup'?command:{data:{status:'reserved',record:reserved},error:null}) as never)
  for(let i=0;i<30;i++)await Promise.resolve();assert.equal(f.calls.length,stage==='lookup'?0:1);if(stage==='rpc')assert.ok(f.calls[0].signal.aborted)
 }
})
test('accessors exotic envelopes invalid calendars and altered reservation versions fail closed',async()=>{
 let accessed=0;const hostile={...binding};Object.defineProperty(hostile,'capability',{get(){accessed++;return capability},enumerable:true});const f=fixture();await assert.rejects(f.port.reserveOperation(actor,hostile,key));assert.equal(accessed,0)
 for(const bad of [{status:'reserved',record:{...reserved,version:2}},{status:'reserved',record:{...reserved,createdAt:'2026-02-30T04:00:00Z'}},{status:'existing',operationRef:reserved.operationRef,extra:'forbidden'}]){const f=fixture();f.setResponse(bad);await assert.rejects(f.port.reserveOperation(actor,binding,key))}
})
