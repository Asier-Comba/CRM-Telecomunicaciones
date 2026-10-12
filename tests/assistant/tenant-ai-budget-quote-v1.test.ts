import assert from 'node:assert/strict'
import {test} from 'node:test'
import {prepareTenantAiBudgetV1,quoteTenantAiCallV1,type PreparedTenantAiBudgetV1} from '../../src/assistant/tenant-ai-budget-quote-v1.ts'
const scope={actorId:'actor-a',workspaceId:'workspace-a',scopeEpoch:'epoch-a',role:'owner'}
const source={workspaceId:scope.workspaceId,scopeEpoch:scope.scopeEpoch,revision:3,periodStart:'2026-10-01T00:00:00.000Z',periodEnd:'2026-11-01T00:00:00.000Z',
 observedAt:'2026-10-12T12:00:00.000Z',ceilingMicrousd:'100',spentMicrousd:'20',reservedMicrousd:'30',unsettledCalls:0,inputMicrousdPerMillion:1000000,outputMicrousdPerMillion:1000000}
const now=Date.parse(source.observedAt),request={mode:'llm',inputTokenCeiling:10,outputTokenCeiling:30}
const prepare=(overrides={})=>{const h=prepareTenantAiBudgetV1({...source,...overrides},scope);assert.ok(h);return h}
// Entire ledger/policy/clock/authority are synthetic, no DB/provider/charge.
test('tenant quote subtracts outstanding reserves and never authorizes dispatch',()=>{
 const h=prepare(),result=quoteTenantAiCallV1(h,scope,request,now)
 assert.deepEqual(result,{status:'reservation_required',revision:3,periodEnd:source.periodEnd,maxCostMicrousd:'40',availableMicrousd:'50',afterReservationMicrousd:'10',dispatchAuthorized:false})
 assert.equal(JSON.stringify(h),'{}');assert.ok(Object.isFrozen(result));assert.ok(!JSON.stringify(result).includes(scope.workspaceId))
 assert.deepEqual(quoteTenantAiCallV1(h,scope,request,now),result) // No reservation was booked by either quote.
})
test('joint numerator rounds once upwards and handles money beyond JS safe integers exactly',()=>{
 const h=prepare({ceilingMicrousd:'1000000000000000000',spentMicrousd:'999999999999999997',reservedMicrousd:'0',inputMicrousdPerMillion:1,outputMicrousdPerMillion:1})
 const result=quoteTenantAiCallV1(h,scope,{mode:'llm',inputTokenCeiling:1,outputTokenCeiling:1},now)
 assert.equal(result.status,'reservation_required');if(result.status==='reservation_required'){assert.equal(result.maxCostMicrousd,'1');assert.equal(result.availableMicrousd,'3');assert.equal(result.afterReservationMicrousd,'2')}
})
test('spent plus pending reservations cannot exceed the company ceiling',()=>{
 assert.equal(quoteTenantAiCallV1(prepare(),scope,{...request,outputTokenCeiling:41},now).status,'budget_exceeded')
 assert.equal(quoteTenantAiCallV1(prepare({reservedMicrousd:'81'}),scope,{...request,inputTokenCeiling:0,outputTokenCeiling:0},now).status,'budget_exceeded')
})
test('unknown charges fail closed instead of becoming free or releasing reserves',()=>{
 assert.equal(quoteTenantAiCallV1(prepare({unsettledCalls:1}),scope,request,now).status,'unavailable')
})
test('fresh authority must match tenant actor role and epoch; serialized handles are not authority',()=>{
 const h=prepare()
 for(const changed of [{workspaceId:'workspace-b'},{actorId:'actor-b'},{role:'admin'},{scopeEpoch:'epoch-b'}])assert.equal(quoteTenantAiCallV1(h,{...scope,...changed},request,now).status,'unavailable')
 assert.equal(prepareTenantAiBudgetV1({...source,workspaceId:'workspace-b'},scope),null)
 assert.equal(quoteTenantAiCallV1({} as PreparedTenantAiBudgetV1,scope,request,now).status,'unavailable')
})
test('future stale and expired observations are unavailable at exact clock boundaries',()=>{
 const h=prepare()
 assert.equal(quoteTenantAiCallV1(h,scope,request,now-1).status,'unavailable')
 assert.equal(quoteTenantAiCallV1(h,scope,request,now+60000).status,'reservation_required')
 assert.equal(quoteTenantAiCallV1(h,scope,request,now+60001).status,'unavailable')
 const end=Date.parse(source.periodEnd),fresh=prepare({observedAt:new Date(end-1).toISOString()})
 assert.equal(quoteTenantAiCallV1(fresh,scope,request,end).status,'unavailable')
})
test('reference and mock runs do not claim billable live usage',()=>{
 for(const mode of ['reference','mock'])assert.equal(quoteTenantAiCallV1(prepare(),scope,{...request,mode},now).status,'not_billable')
})
test('closed admission rejects accessors private fields noncanonical amounts and invalid bounds without getters',()=>{
 let gets=0
 assert.equal(prepareTenantAiBudgetV1(Object.defineProperty({...source},'spentMicrousd',{enumerable:true,get(){gets++;return'0'}}),scope),null)
 for(const changed of [{spentMicrousd:'01'},{reservedMicrousd:'-1'},{ceilingMicrousd:'1000000000000000001'},{private_key:'hidden'},{revision:0},{unsettledCalls:NaN},{periodEnd:'2026-12-01T00:00:00.000Z'},{observedAt:source.periodEnd}])assert.equal(prepareTenantAiBudgetV1({...source,...changed},scope),null)
 const h=prepare()
 assert.equal(quoteTenantAiCallV1(h,scope,Object.defineProperty({...request},'inputTokenCeiling',{enumerable:true,get(){gets++;return 0}}),now).status,'unavailable')
 for(const changed of [{inputTokenCeiling:-1},{outputTokenCeiling:Infinity},{mode:'forged'},{outputTokenCeiling:10000001},{context:'private'}])assert.equal(quoteTenantAiCallV1(h,scope,{...request,...changed},now).status,'unavailable')
 assert.equal(gets,0)
})
test('admitted ledger policy and authority cannot be changed through retained references or Proxy get',()=>{
 const ledger={...source},current={...scope},h=prepareTenantAiBudgetV1(new Proxy(ledger,{get(){throw Error('not_descriptor')}}),current);assert.ok(h)
 ledger.spentMicrousd='0';ledger.reservedMicrousd='0';ledger.inputMicrousdPerMillion=0;current.workspaceId='workspace-b'
 const result=quoteTenantAiCallV1(h,scope,new Proxy({...request},{get(){throw Error('not_descriptor')}}),now)
 assert.equal(result.status,'reservation_required');if(result.status==='reservation_required'){assert.equal(result.availableMicrousd,'50');assert.equal(result.maxCostMicrousd,'40')}
})
