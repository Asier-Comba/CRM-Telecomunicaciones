import {test} from 'node:test'
import assert from 'node:assert/strict'
import {executeProductReadPlanV2,isValidatedProductReadResultV2,type ProductReadDependenciesV2} from '../../src/assistant/product-read-executor-v2.ts'
const authority={actorId:'actor-a',workspaceId:'workspace-a',scopeEpoch:'epoch-a',role:'owner'}
const page={contract_version:'telecom.collections.v1',operation:'customer.list',items:[{id:'10000000-0000-4000-8000-000000000001',version:1,
 display_name:'Synthetic authorized customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}
const plan=(count:number)=>({version:2,decision:'plan',nodes:Array.from({length:count},(_,i)=>({id:'clients_'+i,capability:'crm.customer.list',arguments:[],bindings:[]}))})
const pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms))
const flush=async()=>{for(let i=0;i<50;i++)await Promise.resolve()}
function fixture():ProductReadDependenciesV2{return{authority:async()=>authority,offeredHandles:[],resolveReference:async()=>null,
 now:()=>new Date('2026-10-12T12:00:00Z'),readers:{collection:async()=>({ok:true,data:page}),report:async()=>({ok:false,error:'validation'})}}}

// Controlled Node timers/adapters: latency-policy evidence, not actual RPC,
// database cancellation or live-model performance. Every individual wait <10s.
test('three individually bounded reads share a twenty-second plan deadline and discard partial facts',async context=>{
 context.mock.timers.enable({apis:['setTimeout']})
 const deps=fixture();deps.readers.collection=async()=>{await pause(8000);return{ok:true,data:page}}
 let elapsed=0,finishedAt:number|null=null
 const pending=executeProductReadPlanV2(plan(3),deps).then(result=>{finishedAt=elapsed;return result})
 await flush()
 for(const step of [8000,8000,4000,4000]){elapsed+=step;context.mock.timers.tick(step);await flush()}
 const result=await pending
 assert.equal(result.status,'unavailable');assert.deepEqual(result.evidence,[]);assert.equal(finishedAt,20000)
 assert.equal(isValidatedProductReadResultV2(result),false)
})
test('fresh authorization consumes the same plan budget; facts cannot escape after a late fence',async context=>{
 context.mock.timers.enable({apis:['setTimeout']})
 const deps=fixture();deps.authority=async()=>{await pause(6000);return authority}
 deps.readers.collection=async()=>{await pause(6000);return{ok:true,data:page}}
 let elapsed=0,finishedAt:number|null=null
 const pending=executeProductReadPlanV2(plan(1),deps).then(result=>{finishedAt=elapsed;return result})
 await flush()
 // Drain the old implementation's final authorization too, so the negative
 // ends normally instead of leaving a mock timer pending after24s.
 for(const step of [6000,6000,6000,2000,4000,6000]){elapsed+=step;context.mock.timers.tick(step);await flush()}
 const result=await pending
 assert.equal(result.status,'unavailable');assert.deepEqual(result.evidence,[]);assert.equal(finishedAt,20000)
})
test('a multistep plan within the total budget retains every validated fact',async context=>{
 context.mock.timers.enable({apis:['setTimeout']})
 const deps=fixture();deps.readers.collection=async()=>{await pause(4000);return{ok:true,data:page}}
 const pending=executeProductReadPlanV2(plan(3),deps);await flush()
 for(let i=0;i<3;i++){context.mock.timers.tick(4000);await flush()}
 const result=await pending;assert.equal(result.status,'completed');assert.equal(result.evidence.length,3)
 assert.equal(isValidatedProductReadResultV2(result),true)
 context.mock.timers.tick(20000);assert.equal(result.status,'completed')
})
