import {test} from 'node:test'
import assert from 'node:assert/strict'
import {executeProductReadPlanV2,type ProductReadDependenciesV2} from '../../src/assistant/product-read-executor-v2.ts'
const customer='10000000-0000-4000-8000-000000000001'
const initial={actorId:'actor-a',workspaceId:'workspace-a',scopeEpoch:'epoch-a',role:'owner'}
const page={contract_version:'telecom.collections.v1',operation:'customer.list',items:[{id:customer,version:1,display_name:'Synthetic authorized customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}
const plan={version:2,decision:'plan',nodes:[{id:'clients',capability:'crm.customer.list',arguments:[],bindings:[]}]}
function fixture(){return{authority:async()=>initial,offeredHandles:[],resolveReference:async()=>null,now:()=>new Date('2026-10-12T12:00:00Z'),readers:{collection:async()=>({ok:true,data:page}),report:async()=>({ok:false,error:'validation'})}} as ProductReadDependenciesV2}
// Controlled server adapter objects, not a live Auth incident or model run.
test('held initial authority object cannot change the fence to a later tenant during a read',async()=>{
 const deps=fixture(),current={...initial};deps.authority=async()=>current
 deps.readers.collection=async()=>{current.workspaceId='workspace-b';return{ok:true,data:page}}
 const result=await executeProductReadPlanV2(plan,deps)
 assert.equal(result.status,'access_changed');assert.deepEqual(result.evidence,[])
})
test('adapter cannot replace the fresh-authority callback with a cached grant after revocation',async()=>{
 const deps=fixture();let live:typeof initial|null={...initial};deps.authority=async()=>live
 deps.readers.collection=async()=>{live=null;deps.authority=async()=>({...initial});return{ok:true,data:page}}
 const result=await executeProductReadPlanV2(plan,deps)
 assert.equal(result.status,'access_changed');assert.deepEqual(result.evidence,[])
})
test('reference callback replacement cannot hide a scope change before the selected resource is read',async()=>{
 const deps=fixture();let live:typeof initial|null={...initial},reads=0;deps.authority=async()=>live;deps.offeredHandles=['selected_customer']
 deps.resolveReference=async()=>{live={...initial,scopeEpoch:'epoch-b'};deps.authority=async()=>({...initial});return customer}
 deps.readers.report=async()=>{reads++;return{ok:false,error:'validation'}}
 const selected={version:2,decision:'plan',nodes:[{id:'summary',capability:'crm.customer360.summary',arguments:[],bindings:[{field:'customer_id',handle:'selected_customer',nodeId:null}]}]}
 const result=await executeProductReadPlanV2(selected,deps)
 assert.equal(result.status,'access_changed');assert.deepEqual(result.evidence,[]);assert.equal(reads,0)
})
