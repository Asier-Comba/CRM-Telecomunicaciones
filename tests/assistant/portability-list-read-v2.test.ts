import assert from 'node:assert/strict'
import {test} from 'node:test'
import {parseAssistantPortabilityListInputV1,projectAuthorizedPortabilityListV1} from '../../src/assistant/portability-read-projection-v1.ts'
import {productCapabilityV2,productPlannerCatalogV2} from '../../src/assistant/product-capabilities-v2.ts'
import {parseProductReadPlanV2} from '../../src/assistant/product-read-plan-v2.ts'
import {executeProductReadPlanV2,type ProductReadDependenciesV2} from '../../src/assistant/product-read-executor-v2.ts'
import {composeProductResponseV2} from '../../src/assistant/product-response-v2.ts'
const uuid=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`,customer=uuid(1),capability='crm.portability.list'
const row={id:uuid(3),version:2,customer_id:customer,contract_id:uuid(4),service_id:uuid(5),line_id:uuid(6),number_identifier_id:uuid(7),masked_display:'••••181',direction:'inbound',
 donor_operator_id:uuid(8),target_operator_id:uuid(9),requested_on:'2026-10-01',submitted_on:'2026-10-02',scheduled_on:null,started_on:null,completed_on:null,closed_on:null,
 status:'requested',reason_code:null,owner_user_id:uuid(10),source:'manual',created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-02T00:00:00Z'}
const page=(items:unknown[]=[row],next_id:string|null=null)=>({contract_version:'portability.v1',operation:'portability.list',items,next_id})
const node={id:'ports',capability,arguments:[],bindings:[{field:'customer_id',handle:'customer_ref',nodeId:null}]},plan={version:2,decision:'plan',nodes:[node]}
const scope={actorId:'actor-a',workspaceId:'workspace-a',scopeEpoch:'epoch-a',role:'owner'}
function fixture(data:unknown=page()){
 let live:typeof scope|null=scope,reads=0
 const deps:ProductReadDependenciesV2={authority:async()=>live,resolveReference:async()=>customer,offeredHandles:['customer_ref'],now:()=>new Date('2026-10-12T12:00:00Z'),
  readers:{collection:async()=>{throw Error('wrong reader')},report:async()=>{throw Error('wrong reader')},portabilities:async(op,input)=>{reads++;assert.equal(op,'portability.list');assert.deepEqual(input,{customer_id:customer,limit:20});return{ok:true,data}}}}
 return{deps,role:(role:string)=>{live={...scope,role}},revoke:()=>{live=null},reads:()=>reads}
}
test('bounded portability capability uses selected customer and existing read roles, no get or write registration',()=>{
 for(const role of ['owner','admin','member','viewer'])assert.ok(productPlannerCatalogV2(role).some(c=>c.name===capability))
 assert.equal(productCapabilityV2('crm.portability.get'),null);assert.equal(productCapabilityV2('crm.portability.complete'),null)
 assert.deepEqual(productCapabilityV2(capability)!.enabled,{local:true,stage:false,prod:false});assert.ok(parseProductReadPlanV2(plan,['customer_ref']))
})
test('model IDs unoffered customer workspace broad reads and private identifier binding reject before calls',()=>{
 for(const change of [{bindings:[]},{bindings:[],arguments:[{field:'customer_id',value:customer}]},{bindings:[{field:'customer_id',handle:'foreign_ref',nodeId:null}]},
  {arguments:[{field:'workspace_id',value:uuid(2)}]},{bindings:[{field:'number_identifier_id',handle:'customer_ref',nodeId:null}]}])assert.equal(parseProductReadPlanV2({...plan,nodes:[{...node,...change}]},['customer_ref']),null)
})
test('input has a strict twenty-row default and exact civil date pair and slice',()=>{
 assert.deepEqual(parseAssistantPortabilityListInputV1({customer_id:customer}),{customer_id:customer,limit:20})
 for(const change of [{limit:21},{limit:0},{status:'delivered'},{direction:'both'},{window_from:'2026-10-01'},{window_from:'2026-02-30',window_to:'2026-03-01'},
  {window_from:'2026-10-02',window_to:'2026-10-01'},{window_from:'2024-01-01',window_to:'2026-01-01'},{number_identifier_id:uuid(7)},{operator_id:uuid(8)}])assert.equal(parseAssistantPortabilityListInputV1({customer_id:customer,...change}),null)
})
test('whole W1 DTO is validated then private ancestry operators assignee version and audit timestamps are discarded',()=>{
 const data=projectAuthorizedPortabilityListV1({customer_id:customer},page());assert.ok(data)
 const text=JSON.stringify(data)
 for(const field of ['customer_id','contract_id','service_id','line_id','number_identifier_id','donor_operator_id','target_operator_id','owner_user_id','version','created_at','updated_at'])assert.ok(!text.includes('"'+field+'"'))
 assert.ok(text.includes('••••181'))
 for(const bad of [{...row,customer_id:uuid(2)},{...row,masked_display:'+12025550181'},{...row,donor_operator_id:row.target_operator_id},{...row,requested_on:'2026-02-30'},
  {...row,status:'completed'},{...row,complete_number:'+12025550181'}])assert.equal(projectAuthorizedPortabilityListV1({customer_id:customer},page([bad])),null)
 assert.equal(projectAuthorizedPortabilityListV1({customer_id:customer,status:'scheduled'},page()),null)
 assert.equal(projectAuthorizedPortabilityListV1({customer_id:customer,window_from:'2026-10-03',window_to:'2026-10-04'},page()),null)
})
test('sorted unique keyset full page and cursor preserve partiality without silently truncating or inventing emptiness',async()=>{
 const rows=Array.from({length:20},(_,i)=>({...row,id:uuid(20+i)})),f=fixture(page(rows,uuid(39)))
 const result=await executeProductReadPlanV2(plan,f.deps);assert.equal(result.status,'completed');assert.equal(result.evidence[0].partial,true)
 assert.equal(composeProductResponseV2(result,'req').blocks[0].rows.length,20)
 for(const value of [page([row,row]),page([{...row,id:uuid(4)},row]),page([row],row.id),page([...rows,{...row,id:uuid(40)}])])assert.equal(projectAuthorizedPortabilityListV1({customer_id:customer},value),null)
})
test('all authorized existing roles expose masks and registered facts only, with exact source and civil-date labels',async()=>{
 for(const role of ['owner','admin','member','viewer']){
  const f=fixture();f.role(role);const result=await executeProductReadPlanV2(plan,f.deps),response=composeProductResponseV2(result,'req')
  assert.equal(result.status,'completed');assert.equal(f.reads(),1);assert.equal(response.blocks[0].title,'Portabilidades del cliente · estado registrado')
  assert.equal(response.blocks[0].rows[0].masked_display,'••••181');assert.equal(response.blocks[0].rows[0].requested_on,row.requested_on);assert.equal(response.blocks[0].rows[0].direction,'Entrante')
  assert.equal(response.sources[0].capability,capability);assert.equal(response.sources[0].asOf,null)
  assert.equal(response.blocks[0].columns.find(c=>c.field==='status')?.label,'Estado registrado')
  for(const id of [customer,row.contract_id,row.service_id,row.line_id,row.number_identifier_id,row.owner_user_id])assert.ok(!JSON.stringify(response).includes(id))
 }
})
test('missing denied malformed and empty sources remain distinguished without claiming a transfer',async()=>{
 const absent=fixture();delete absent.deps.readers.portabilities;assert.equal((await executeProductReadPlanV2(plan,absent.deps)).status,'unavailable')
 const denied=fixture();denied.deps.readers.portabilities=async()=>({ok:false,error:'access_denied'});assert.equal((await executeProductReadPlanV2(plan,denied.deps)).status,'unavailable')
 const invalid=fixture(page([{...row,status:'forged'}]));assert.equal((await executeProductReadPlanV2(plan,invalid.deps)).status,'unavailable')
 const empty=fixture(page([]));const result=await executeProductReadPlanV2(plan,empty.deps);assert.equal(result.status,'completed');assert.equal(result.evidence[0].partial,false);assert.equal(composeProductResponseV2(result,'req').blocks[0].rows.length,0)
})
test('fresh post-read scope rejects revoked tenant actor role or epoch before releasing any facts',async()=>{
 for(const changed of [null,{...scope,workspaceId:'workspace-b'},{...scope,actorId:'actor-b'},{...scope,role:'viewer'},{...scope,scopeEpoch:'epoch-b'}]){
  const f=fixture();let current:typeof scope|null=scope;f.deps.authority=async()=>current;f.deps.readers.portabilities=async()=>{current=changed;return{ok:true,data:page()}}
  const result=await executeProductReadPlanV2(plan,f.deps);assert.equal(result.status,'access_changed');assert.deepEqual(result.evidence,[]);assert.equal(composeProductResponseV2(result,'req').blocks.length,0)
 }
})
