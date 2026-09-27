import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthorizedReconciliationService } from '../src/assistant/reconciliation.js'
import type { ValueSchema, StructuredValue } from '../src/assistant/contracts.js'
import type { DurableIdempotencyStore, DurableIdempotencyRecord, ReconciliationActor, ReconciliationAuditEvent } from '../src/assistant/durable-contracts.js'
const now = new Date('2026-09-27T14:00:00Z')
const actor: ReconciliationActor = { actorId:'reviewer-a',workspaceId:'workspace-a',authentication:'user_session',permissions:new Set(['assistant:operation:reconcile']),requestId:'synthetic-review' }
const initial: DurableIdempotencyRecord = { operationRef:'operation_opaque_000000000001',idempotencyKey:'synthetic-idem',binding:{actorId:'originator-a',workspaceId:'workspace-a',capability:'crm.task.create',argumentsDigest:'digest-a'},state:'reconciliation_required',attempt:1,version:4,leaseExpiresAt:now.toISOString(),createdAt:now.toISOString(),updatedAt:now.toISOString() }
const request = { operationRef:initial.operationRef,expectedVersion:4,requestedOutcome:'completed',reason:'provider_receipt' }
const schema: ValueSchema = {type:'object',properties:{taskRef:{type:'string',minLength:1,maxLength:160}},required:['taskRef'],additionalProperties:false}
function fixture(data: StructuredValue, foreign = false, capability = 'crm.task.create', noSchema = false) {
  let current=structuredClone(initial), transitions=0, failAudit=false
  if(foreign) current.binding.workspaceId='workspace-b'
  const events:ReconciliationAuditEvent[]=[]
  const store={ async inspectByOperationRef(){return structuredClone(current)},async applyAuthorizedReconciliation(){transitions++;current={...current,state:'completed',version:5};return {status:'applied',record:structuredClone(current)}} } as unknown as DurableIdempotencyStore
  const service=new AuthorizedReconciliationService({store,verifier:{async verify(){return {outcome:'effect_applied',result:{status:'SUCCESS',capability,data}}}},outputSchemas:noSchema?new Map():new Map([['crm.task.create',schema]]),audit:{async emit(e){if(failAudit)throw Error('synthetic_sink_outage');events.push(e)}}})
  return {service,transitions:()=>transitions,events,failAudit:(value:boolean)=>{failAudit=value}}
}
for(const [name,data] of Object.entries({unknown:{taskRef:'task-a',extra:true},private:{taskRef:'task-a',private_field:'synthetic'},missing:{},primitive:42,null:null,array:['task-a'],foreignScope:{taskRef:'task-a',workspaceId:'workspace-b'},oversized:{taskRef:'x'.repeat(161)}})) {
  test(`W4 v4.2: reject ${name} result before transition`,async()=>{const f=fixture(data);assert.equal((await f.service.reconcile(actor,request,now)).status,'CONFLICT');assert.equal(f.transitions(),0)})
}
test('W4 v4.2: valid result permits exactly one transition',async()=>{const f=fixture({taskRef:'task-a'});assert.equal((await f.service.reconcile(actor,request,now)).status,'SUCCESS');assert.equal(f.transitions(),1)})
test('W4 v4.2: foreign stored workspace is denied before transition',async()=>{const f=fixture({taskRef:'task-a'},true);assert.equal((await f.service.reconcile(actor,request,now)).status,'FORBIDDEN');assert.equal(f.transitions(),0)})
test('W4 v4.2: wrong capability and absent schema fail closed',async()=>{for(const f of [fixture({taskRef:'task-a'},false,'crm.task.delete'),fixture({taskRef:'task-a'},false,'crm.task.create',true)]){assert.equal((await f.service.reconcile(actor,request,now)).status,'CONFLICT');assert.equal(f.transitions(),0)}})
test('W4 v4.2 reproduction: original transition audit still lost after sink outage',async()=>{const f=fixture({taskRef:'task-a'});f.failAudit(true);assert.equal((await f.service.reconcile(actor,request,now)).status,'UNAVAILABLE');assert.equal(f.transitions(),1);f.failAudit(false);assert.equal((await f.service.reconcile(actor,request,now)).status,'CONFLICT');assert.equal(f.transitions(),1);assert.deepEqual(f.events.map(e=>e.decision),['conflict'])})
