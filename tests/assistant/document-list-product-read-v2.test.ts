import assert from 'node:assert/strict'
import test from 'node:test'
import {executeProductReadPlanV2,type ProductReadDependenciesV2} from '../../src/assistant/product-read-executor-v2.ts'
import {composeProductResponseV2} from '../../src/assistant/product-response-v2.ts'
import {productPlannerCatalogV2} from '../../src/assistant/product-capabilities-v2.ts'
const customer='10000000-0000-4000-8000-000000000001',doc='20000000-0000-4000-8000-000000000001'
const node={id:'docs',capability:'crm.document.list',arguments:[],bindings:[{field:'customer_id',handle:'customer_ref',nodeId:null}]}
const plan=(n:unknown=node)=>({version:2,decision:'plan',nodes:[n]})
const row={id:doc,version:1,document_kind:'general',status:'active',media_type:'application/pdf',size_bytes:1000,target:{kind:'customer',id:customer}}
const data=(items:unknown[]=[row],next_id:unknown=null)=>({contract_version:'document.v1',operation:'document.list',items,next_id})
function deps(role='owner'){
 let calls=0,resolutions=0;const scope={actorId:'actor',workspaceId:'workspace',scopeEpoch:'epoch',role}
 const value:ProductReadDependenciesV2={authority:async()=>scope,resolveReference:async()=>{resolutions++;return customer},offeredHandles:['customer_ref'],now:()=>new Date('2026-10-13T00:00:00Z'),
  readers:{collection:async()=>{throw Error('UNEXPECTED')},report:async()=>{throw Error('UNEXPECTED')},documents:async(op,input)=>{calls++;assert.equal(op,'document.list');assert.deepEqual(input,{customer_id:customer,status:'active',limit:20});assert.ok(Object.isFrozen(input));return{ok:true,data:data()}}}}
 return{value,scope,calls:()=>calls,resolutions:()=>resolutions}
}
test('document metadata response retains only registered direct facts and no private identities or availability claims',async()=>{
 const d=deps(),result=await executeProductReadPlanV2(plan(),d.value),response=composeProductResponseV2(result,'test')
 assert.equal(result.status,'completed');assert.deepEqual(response.blocks[0].rows,[{status:'Activo',document_kind:'General',media_type:'application/pdf',size_bytes:1000}])
 assert.equal(response.blocks[0].title,'Documentos directos del cliente · metadatos registrados');assert.equal(response.sources.length,1)
 assert.ok(!JSON.stringify(response).includes(doc));assert.ok(!JSON.stringify(response).includes(customer));assert.ok(!JSON.stringify(response).includes('file_name'))
})
test('document metadata owner/admin catalogs and whole-plan denial precede reference lookup or reader calls',async()=>{
 for(const role of ['owner','admin','member','viewer']){
  const d=deps(role),result=await executeProductReadPlanV2(plan(),d.value),allowed=['owner','admin'].includes(role)
  assert.equal(result.status,allowed?'completed':'abstain');assert.equal(d.calls(),allowed?1:0);assert.equal(d.resolutions(),allowed?1:0)
  assert.equal(productPlannerCatalogV2(role).some(c=>c.name==='crm.document.list'),allowed)
 }
})
test('document metadata rejects limits/raw targets/indexing flags before privileged readers',async()=>{
 for(const argumentsValue of [[{field:'limit',value:21}],[{field:'target_kind',value:'contract'}],[{field:'indexingApproved',value:'true'}],[{field:'customer_id',value:customer}]]){
  const d=deps(),result=await executeProductReadPlanV2(plan({...node,arguments:argumentsValue}),d.value)
  assert.equal(result.status,'invalid_plan');assert.equal(d.calls(),0)
 }
})
test('foreign document customer reference has no document call or factual response',async()=>{
 const d=deps();d.value.resolveReference=async()=>null
 const result=await executeProductReadPlanV2(plan(),d.value);assert.equal(result.status,'access_changed');assert.equal(d.calls(),0);assert.deepEqual(result.evidence,[])
})
test('document metadata discards all facts when role changes while the reader waits',async()=>{
 const d=deps();d.value.readers.documents=async()=>{d.scope.role='viewer';return{ok:true,data:data()}}
 const result=await executeProductReadPlanV2(plan(),d.value);assert.equal(result.status,'access_changed');assert.deepEqual(composeProductResponseV2(result,'test').blocks,[])
})
test('document metadata refuses malformed complete DTO and sensitive additions before any response',async()=>{
 for(const bad of [{...row,file_name:'PRIVATE_FIXTURE'},{...row,target:{kind:'customer',id:doc}},{...row,version:0}]){
  const d=deps();d.value.readers.documents=async()=>({ok:true,data:data([bad])})
  assert.equal((await executeProductReadPlanV2(plan(),d.value)).status,'unavailable')
 }
})
test('missing metadata reader produces no report fallback or invented documents',async()=>{
 const d=deps();delete d.value.readers.documents
 const result=await executeProductReadPlanV2(plan(),d.value);assert.equal(result.status,'unavailable');assert.deepEqual(result.evidence,[])
})
test('document metadata canonical request is immutable and genuine full-page cursor is partial',async()=>{
 const d=deps(),items=Array.from({length:20},(_,i)=>({...row,id:'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0')}))
 d.value.readers.documents=async(_op,input)=>{assert.throws(()=>Object.assign(input as object,{customer_id:doc}),TypeError);return{ok:true,data:data(items,items.at(-1)!.id)}}
 const result=await executeProductReadPlanV2(plan(),d.value);assert.equal(result.status,'completed');assert.equal(composeProductResponseV2(result,'test').blocks[0].partial,true)
})
