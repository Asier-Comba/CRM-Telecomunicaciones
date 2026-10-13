import assert from 'node:assert/strict'
import {test} from 'node:test'
import {parseAssistantEquipmentListInputV1,projectAuthorizedEquipmentListV1} from '../../src/assistant/equipment-read-projection-v1.ts'
import {productCapabilityV2,productPlannerCatalogV2} from '../../src/assistant/product-capabilities-v2.ts'
import {parseProductReadPlanV2} from '../../src/assistant/product-read-plan-v2.ts'
import {executeProductReadPlanV2,type ProductReadDependenciesV2} from '../../src/assistant/product-read-executor-v2.ts'
import {composeProductResponseV2} from '../../src/assistant/product-response-v2.ts'
import {createAssistantEquipmentListReaderV1} from '../../src/lib/server/assistant-equipment-list-reader-v1.ts'
const uuid=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`,customer=uuid(1),capability='crm.equipment.list'
const row={id:uuid(3),version:1,customer_id:customer,contract_id:uuid(4),service_id:uuid(5),line_id:uuid(6),commitment_id:uuid(7),kind:'router',
 manufacturer:'Private maker',model:'Private model',commercial_description:'Private description',status:'prepared',purchased_on:'2026-10-01',assigned_on:null,
 returned_on:null,replaced_on:null,cancelled_on:null,replaces_equipment_id:null,replaced_by_id:null,source:'manual'}
const page=(items:unknown[]=[row],next_id:string|null=null)=>({contract_version:'equipment.v1',operation:'equipment.list',items,next_id})
const node={id:'equipment',capability,arguments:[],bindings:[{field:'customer_id',handle:'customer_ref',nodeId:null}]},plan={version:2,decision:'plan',nodes:[node]}
const scope={actorId:'actor-a',workspaceId:'workspace-a',scopeEpoch:'epoch-a',role:'owner'}
function fixture(data:unknown=page()){
 let live:typeof scope|null=scope,reads=0
 const deps:ProductReadDependenciesV2={authority:async()=>live,resolveReference:async()=>customer,offeredHandles:['customer_ref'],now:()=>new Date('2026-10-13T12:00:00Z'),
  readers:{collection:async()=>{throw Error('wrong reader')},report:async()=>{throw Error('wrong reader')},equipment:async(op,input)=>{reads++;assert.equal(op,'equipment.list');assert.deepEqual(input,{customer_id:customer,limit:20});return{ok:true,data}}}}
 return{deps,role:(role:string)=>{live={...scope,role}},revoke:()=>{live=null},reads:()=>reads}
}
// Controlled DTO/adapter evidence; actual cookie/DB must run on the new source.
test('equipment list is a selected-customer read for current roles, without get history or commands',()=>{
 for(const role of ['owner','admin','member','viewer'])assert.ok(productPlannerCatalogV2(role).some(c=>c.name===capability))
 for(const name of ['crm.equipment.get','crm.equipment.history','crm.equipment.create','crm.equipment.assign','crm.equipment.return','crm.equipment.replace','crm.equipment.cancel'])assert.equal(productCapabilityV2(name),null)
 assert.deepEqual(productCapabilityV2(capability)!.enabled,{local:true,stage:false,prod:false});assert.ok(parseProductReadPlanV2(plan,['customer_ref']))
 for(const change of [{bindings:[]},{bindings:[],arguments:[{field:'customer_id',value:customer}]},{bindings:[{field:'customer_id',handle:'foreign',nodeId:null}]},
  {arguments:[{field:'workspace_id',value:uuid(9)}]},{arguments:[{field:'manufacturer',value:'private'}]}])assert.equal(parseProductReadPlanV2({...plan,nodes:[{...node,...change}]},['customer_ref']),null)
})
test('equipment input caps twenty rows and denies unselected customer or private associations',()=>{
 assert.deepEqual(parseAssistantEquipmentListInputV1({customer_id:customer}),{customer_id:customer,limit:20})
 for(const change of [{limit:21},{limit:0},{kind:'serial'},{status:'installed'},{source:'manual'},{contract_id:uuid(4)},{service_id:uuid(5)},
  {line_id:uuid(6)},{commitment_id:uuid(7)},{manufacturer:'private'},{workspace_id:uuid(9)}])assert.equal(parseAssistantEquipmentListInputV1({customer_id:customer,...change}),null)
 assert.equal(parseAssistantEquipmentListInputV1({limit:20}),null)
})
test('complete W1 equipment DTO and filters validated before private field minimization',()=>{
 const projected=projectAuthorizedEquipmentListV1({customer_id:customer},page());assert.ok(projected)
 for(const field of ['manufacturer','model','commercial_description','purchased_on','customer_id','contract_id','service_id','line_id','commitment_id','replaces_equipment_id','replaced_by_id','version'])assert.ok(!JSON.stringify(projected).includes('"'+field+'"'))
 for(const bad of [{...row,customer_id:uuid(2)},{...row,status:'assigned'},{...row,assigned_on:'2026-09-01'},{...row,serial:'private'},
  {...row,manufacturer:''},{...row,kind:'unknown'}])assert.equal(projectAuthorizedEquipmentListV1({customer_id:customer},page([bad])),null)
 assert.equal(projectAuthorizedEquipmentListV1({customer_id:customer,status:'returned'},page()),null)
 assert.equal(projectAuthorizedEquipmentListV1({customer_id:customer,kind:'ont'},page()),null)
})
test('keyset bound and current page preserve partiality without truncation or invented emptiness',async()=>{
 const rows=Array.from({length:20},(_,i)=>({...row,id:uuid(20+i)})),f=fixture(page(rows,uuid(39)))
 const result=await executeProductReadPlanV2(plan,f.deps);assert.equal(result.status,'completed');assert.equal(result.evidence[0].partial,true)
 assert.equal(composeProductResponseV2(result,'req').blocks[0].rows.length,20)
 for(const value of [page([row,row]),page([{...row,id:uuid(4)},row]),page([row],row.id),page([...rows,{...row,id:uuid(40)}])])assert.equal(projectAuthorizedEquipmentListV1({customer_id:customer},value),null)
 assert.equal((await executeProductReadPlanV2(plan,fixture(null).deps)).status,'unavailable')
})
test('owner admin member viewer render registered Spanish facts with no private text or IDs',async()=>{
 for(const role of ['owner','admin','member','viewer']){
  const f=fixture();f.role(role);const result=await executeProductReadPlanV2(plan,f.deps),response=composeProductResponseV2(result,'req')
  assert.equal(result.status,'completed');assert.equal(f.reads(),1);assert.equal(response.blocks[0].title,'Equipos del cliente · estado registrado')
  assert.equal(response.blocks[0].rows[0].kind,'Router');assert.equal(response.blocks[0].rows[0].status,'Preparado');assert.equal(response.blocks[0].rows[0].assigned_on,null)
  assert.equal(response.sources[0].capability,capability);assert.equal(response.sources[0].asOf,null)
  for(const value of [row.manufacturer,row.model,row.commercial_description,customer,row.id,row.contract_id,row.service_id,row.line_id,row.commitment_id,'purchased_on'])assert.ok(!JSON.stringify(response).includes(value))
 }
})
test('revocation discards equipment facts and missing reader stays unavailable',async()=>{
 const f=fixture(),read=f.deps.readers.equipment!;f.deps.readers.equipment=async(op,input)=>{const result=await read(op,input);f.revoke();return result}
 const result=await executeProductReadPlanV2(plan,f.deps);assert.equal(result.status,'access_changed');assert.deepEqual(result.evidence,[])
 const missing=fixture();delete missing.deps.readers.equipment;assert.equal((await executeProductReadPlanV2(plan,missing.deps)).status,'unavailable')
})
test('equipment getters and Proxy reads cannot replace admitted facts with private material',()=>{
 let gets=0;const hidden={...row};Object.defineProperty(hidden,'manufacturer',{enumerable:true,get(){gets++;return row.manufacturer}})
 assert.equal(projectAuthorizedEquipmentListV1({customer_id:customer},page([hidden])),null);assert.equal(gets,0)
 const proxy=new Proxy(row,{get(target,key){if(key!=='then')gets++;return Reflect.get(target,key)}})
 assert.ok(projectAuthorizedEquipmentListV1({customer_id:customer},page([proxy])));assert.equal(gets,0)
})
test('equipment runtime denies get history and every command before scope/RPC',async()=>{
 let resolves=0,rpcs=0
 const reader=createAssistantEquipmentListReaderV1({resolve:async()=>{resolves++;return{workspaceId:uuid(8),userId:uuid(9),role:'owner'}},rpc:async(name,input)=>{rpcs++;
  assert.equal(name,'equipment_v1_query');assert.deepEqual(input,{p_workspace_id:uuid(8),p_operation:'equipment.list',p_input:{customer_id:customer,limit:20}});return{data:page(),error:null}}})
 for(const operation of ['equipment.get','equipment.history','equipment.create','equipment.assign','equipment.return','equipment.replace','equipment.cancel',null,{}])assert.deepEqual(await reader(operation,{customer_id:customer}),{ok:false,error:'validation'})
 for(const input of [{},{customer_id:customer,limit:21},{customer_id:customer,contract_id:uuid(4)}])assert.deepEqual(await reader('equipment.list',input),{ok:false,error:'validation'})
 assert.equal(resolves,0);assert.equal(rpcs,0);assert.equal((await reader('equipment.list',{customer_id:customer})).ok,true);assert.equal(resolves,1);assert.equal(rpcs,1)
})
