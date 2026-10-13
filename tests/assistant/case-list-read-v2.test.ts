import assert from 'node:assert/strict'
import {test} from 'node:test'
import {parseAssistantCaseListInputV1,projectAuthorizedCaseListV1} from '../../src/assistant/case-read-projection-v1.ts'
import {productCapabilityV2,productPlannerCatalogV2} from '../../src/assistant/product-capabilities-v2.ts'
import {parseProductReadPlanV2} from '../../src/assistant/product-read-plan-v2.ts'
import {executeProductReadPlanV2,type ProductReadDependenciesV2} from '../../src/assistant/product-read-executor-v2.ts'
import {composeProductResponseV2} from '../../src/assistant/product-response-v2.ts'
import {createAssistantCaseListReaderV1} from '../../src/lib/server/assistant-case-list-reader-v1.ts'
const uuid=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`,customer=uuid(1),capability='crm.case.list'
const row={id:uuid(3),version:1,customer_id:customer,contract_id:uuid(4),service_id:uuid(5),line_id:uuid(6),case_type:'technical',
 title:'Private incident title',priority:'high',due_on:'2026-10-13',assigned_user_id:uuid(7),status:'open',source:'manual',resolved_at:null,closed_at:null,
 resolution_code:null,cancellation_code:null,internal_note_count:5,created_at:'2026-10-12T00:00:00Z',updated_at:'2026-10-12T00:00:00Z',overdue:false}
const page=(items:unknown[]=[row],next_id:string|null=null)=>({contract_version:'case.v1',operation:'case.list',items,next_id})
const node={id:'cases',capability,arguments:[],bindings:[{field:'customer_id',handle:'customer_ref',nodeId:null}]},plan={version:2,decision:'plan',nodes:[node]}
const scope={actorId:'actor-a',workspaceId:'workspace-a',scopeEpoch:'epoch-a',role:'owner'}
function fixture(data:unknown=page()){
 let live:typeof scope|null=scope,reads=0
 const deps:ProductReadDependenciesV2={authority:async()=>live,resolveReference:async()=>customer,offeredHandles:['customer_ref'],now:()=>new Date('2026-10-12T12:00:00Z'),
  readers:{collection:async()=>{throw Error('wrong reader')},report:async()=>{throw Error('wrong reader')},cases:async(op,input)=>{reads++;assert.equal(op,'case.list');assert.deepEqual(input,{customer_id:customer,limit:20});return{ok:true,data}}}}
 return{deps,role:(role:string)=>{live={...scope,role}},revoke:()=>{live=null},reads:()=>reads}
}
// Synthetic DTO/adapters. Own Auth/cookie evidence must come from new source CI.
test('case capability is a selected-customer read for existing roles, never get notes or commands',()=>{
 for(const role of ['owner','admin','member','viewer'])assert.ok(productPlannerCatalogV2(role).some(c=>c.name===capability))
 for(const name of ['crm.case.get','crm.case.note_list','crm.case.resolve','crm.case.create'])assert.equal(productCapabilityV2(name),null)
 assert.deepEqual(productCapabilityV2(capability)!.enabled,{local:true,stage:false,prod:false});assert.ok(parseProductReadPlanV2(plan,['customer_ref']))
 for(const change of [{bindings:[]},{bindings:[],arguments:[{field:'customer_id',value:customer}]},{bindings:[{field:'customer_id',handle:'foreign',nodeId:null}]},
  {arguments:[{field:'workspace_id',value:uuid(9)}]},{arguments:[{field:'title',value:'private'}]}])assert.equal(parseProductReadPlanV2({...plan,nodes:[{...node,...change}]},['customer_ref']),null)
})
test('case inputs enforce twenty rows and bounded civil-date pair; private filters and broad inventory denied',()=>{
 assert.deepEqual(parseAssistantCaseListInputV1({customer_id:customer}),{customer_id:customer,limit:20})
 for(const change of [{limit:21},{limit:0},{status:'done'},{priority:'critical'},{case_type:'secret'},{due_from:'2026-10-01'},
  {due_from:'2026-02-30',due_to:'2026-03-01'},{due_from:'2026-10-02',due_to:'2026-10-01'},{due_from:'2024-01-01',due_to:'2026-01-01'},
  {contract_id:uuid(4)},{assigned_user_id:uuid(7)},{overdue:true},{source:'system'}])assert.equal(parseAssistantCaseListInputV1({customer_id:customer,...change}),null)
 assert.equal(parseAssistantCaseListInputV1({limit:20}),null)
})
test('complete W1 case DTO validated before minimization; foreign private and inconsistent state facts reject',()=>{
 const projected=projectAuthorizedCaseListV1({customer_id:customer},page());assert.ok(projected)
 for(const field of ['title','internal_note_count','customer_id','contract_id','service_id','line_id','assigned_user_id','version','created_at','updated_at'])assert.ok(!JSON.stringify(projected).includes('"'+field+'"'))
 for(const bad of [{...row,customer_id:uuid(2)},{...row,status:'resolved'},{...row,closed_at:'2026-10-12T01:00:00Z'},{...row,body:'private note'},
  {...row,case_type:'unknown'},{...row,overdue:true,due_on:null}])assert.equal(projectAuthorizedCaseListV1({customer_id:customer},page([bad])),null)
 assert.equal(projectAuthorizedCaseListV1({customer_id:customer,status:'closed'},page()),null)
 assert.equal(projectAuthorizedCaseListV1({customer_id:customer,due_from:'2026-10-14',due_to:'2026-10-15'},page()),null)
})
test('keyset ordering exact cursor and full-page bound preserve partiality, with no truncation or invented emptiness',async()=>{
 const rows=Array.from({length:20},(_,i)=>({...row,id:uuid(20+i)})),f=fixture(page(rows,uuid(39)))
 const result=await executeProductReadPlanV2(plan,f.deps);assert.equal(result.status,'completed');assert.equal(result.evidence[0].partial,true)
 assert.equal(composeProductResponseV2(result,'req').blocks[0].rows.length,20)
 for(const value of [page([row,row]),page([{...row,id:uuid(4)},row]),page([row],row.id),page([...rows,{...row,id:uuid(40)}])])assert.equal(projectAuthorizedCaseListV1({customer_id:customer},value),null)
 assert.equal((await executeProductReadPlanV2(plan,fixture(null).deps)).status,'unavailable')
})
test('all authorized roles render registered Spanish facts and references without titles notes or private IDs',async()=>{
 for(const role of ['owner','admin','member','viewer']){
  const f=fixture();f.role(role);const result=await executeProductReadPlanV2(plan,f.deps),response=composeProductResponseV2(result,'req')
  assert.equal(result.status,'completed');assert.equal(f.reads(),1);assert.equal(response.blocks[0].title,'Incidencias del cliente · estado registrado')
  assert.equal(response.blocks[0].rows[0].case_type,'Técnica');assert.equal(response.blocks[0].rows[0].priority,'Alta');assert.equal(response.blocks[0].rows[0].status,'Abierta')
  assert.equal(response.sources[0].capability,capability);assert.equal(response.sources[0].asOf,null)
  for(const value of [row.title,customer,row.id,row.contract_id,row.service_id,row.line_id,row.assigned_user_id,'internal_note_count'])assert.ok(!JSON.stringify(response).includes(value))
 }
})
test('revocation after case read discards facts and no reader remains unavailable, never an empty claim',async()=>{
 const f=fixture(),read=f.deps.readers.cases!;f.deps.readers.cases=async(op,input)=>{const result=await read(op,input);f.revoke();return result}
 const result=await executeProductReadPlanV2(plan,f.deps);assert.equal(result.status,'access_changed');assert.deepEqual(result.evidence,[])
 const missing=fixture();delete missing.deps.readers.cases;assert.equal((await executeProductReadPlanV2(plan,missing.deps)).status,'unavailable')
})
test('accessors and Proxy reads cannot replace admitted case data with private material',()=>{
 let gets=0;const hidden={...row};Object.defineProperty(hidden,'title',{enumerable:true,get(){gets++;return row.title}})
 assert.equal(projectAuthorizedCaseListV1({customer_id:customer},page([hidden])),null);assert.equal(gets,0)
 const proxy=new Proxy(row,{get(target,key){if(key!=='then')gets++;return Reflect.get(target,key)}})
 assert.ok(projectAuthorizedCaseListV1({customer_id:customer},page([proxy])));assert.equal(gets,0)
})
test('runtime reader rejects every get note and write before scope/RPC; only bounded list reaches W1',async()=>{
 let resolves=0,rpcs=0
 const reader=createAssistantCaseListReaderV1({resolve:async()=>{resolves++;return{workspaceId:uuid(8),userId:uuid(9),role:'owner'}},rpc:async(name,input)=>{rpcs++;
  assert.equal(name,'case_v1_query');assert.deepEqual(input,{p_workspace_id:uuid(8),p_operation:'case.list',p_input:{customer_id:customer,limit:20}});return{data:page(),error:null}}})
 for(const operation of ['case.get','case.note_list','case.create','case.update','case.assign','case.change_status','case.resolve','case.reopen','case.close','case.cancel','case.note_create',null,{}])
  assert.deepEqual(await reader(operation,{customer_id:customer}),{ok:false,error:'validation'})
 for(const input of [{},{customer_id:customer,limit:21},{customer_id:customer,assigned_user_id:uuid(7)}])assert.deepEqual(await reader('case.list',input),{ok:false,error:'validation'})
 assert.equal(resolves,0);assert.equal(rpcs,0);assert.equal((await reader('case.list',{customer_id:customer})).ok,true);assert.equal(resolves,1);assert.equal(rpcs,1)
})
