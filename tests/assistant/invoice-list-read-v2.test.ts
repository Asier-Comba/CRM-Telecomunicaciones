import assert from 'node:assert/strict'
import test from 'node:test'
import {parseAssistantInvoiceListInputV1,projectAuthorizedInvoiceListV1} from '../../src/assistant/invoice-read-projection-v1.ts'
import {productCapabilityV2,productPlannerCatalogV2} from '../../src/assistant/product-capabilities-v2.ts'
import {parseProductReadPlanV2} from '../../src/assistant/product-read-plan-v2.ts'
import {executeProductReadPlanV2,type ProductReadDependenciesV2} from '../../src/assistant/product-read-executor-v2.ts'
import {composeProductResponseV2} from '../../src/assistant/product-response-v2.ts'
const customer='10000000-0000-4000-8000-000000000001',foreign='10000000-0000-4000-8000-000000000002'
const id='30000000-0000-4000-8000-000000000001',second='30000000-0000-4000-8000-000000000002'
const capability='crm.invoice.list',authority={actorId:'actor',workspaceId:'workspace',scopeEpoch:'epoch',role:'owner'}
const invoice={id,version:1,status:'issued',customer_id:customer,issue_on:'2026-08-15',due_on:'2026-09-15',series:'S',currency:'EUR',
  number:{series:'S',year:2026,sequence:1},totals:{subtotal_minor:12345,tax_minor:0,withholding_minor:0,total_minor:12345},overdue:true}
const page=(items:unknown[]=[invoice],next_id:string|null=null)=>({contract_version:'billing.v1',operation:'invoice.list',items,next_id})
const node={id:'invoices',capability,arguments:[{field:'limit',value:20}],bindings:[{field:'customer_id',handle:'customer-ref',nodeId:null}]}
const plan={version:2,decision:'plan',nodes:[node]}
function fixture(result:unknown={ok:true,data:page()}){
 let live:typeof authority|null=authority,reads=0,bindings=0
 const deps:ProductReadDependenciesV2={authority:async()=>live,resolveReference:async()=>{bindings++;return customer},offeredHandles:['customer-ref'],now:()=>new Date('2026-10-12T06:00:00Z'),
   readers:{collection:async()=>{throw Error('unexpected collection')},report:async()=>{throw Error('unexpected report')},billingInvoices:async(op,input)=>{reads++;assert.equal(op,'invoice.list');assert.equal((input as {customer_id:string}).customer_id,customer);return result}}}
 return {deps,setAuthority:(value:typeof authority|null)=>{live=value},reads:()=>reads,bindings:()=>bindings}
}
test('invoice capability requires customer binding and owner/admin, advertises limits without registering writes',()=>{
 assert.deepEqual(productCapabilityV2(capability)!.roles,['owner','admin'])
 for(const role of ['member','viewer','unknown'])assert.equal(productPlannerCatalogV2(role).some(c=>c.name===capability),false)
 assert.equal(productCapabilityV2('crm.invoice.get'),null);assert.equal(productCapabilityV2('crm.invoice.mark_paid'),null)
 assert.equal(parseProductReadPlanV2(plan,['customer-ref'])?.nodes.length,1)
})
test('model IDs, unoffered reference, workspace selector and broad invoice list reject before execution',()=>{
 for(const altered of [{...node,bindings:[]},{...node,bindings:[],arguments:[{field:'customer_id',value:customer}]},
  {...node,bindings:[{field:'customer_id',handle:'foreign-ref',nodeId:null}]},{...node,arguments:[{field:'workspace_id',value:foreign}]}])
  assert.equal(parseProductReadPlanV2({...plan,nodes:[altered]},['customer-ref']),null)
})
test('invoice input enforces twenty rows, complete date interval, known status and closed fields',()=>{
 for(const invalid of [{},{customer_id:customer,limit:21},{customer_id:customer,limit:0},{customer_id:customer,status:'collected'},
  {customer_id:customer,from:'2026-08-01'},{customer_id:customer,from:'2026-09-01',to:'2026-08-01'},
  {customer_id:customer,from:'2024-01-01',to:'2026-01-01'},{customer_id:customer,series:'S'},{customer_id:customer,sql:'select'}])
  assert.equal(parseAssistantInvoiceListInputV1(invalid),null)
 assert.ok(parseAssistantInvoiceListInputV1({customer_id:customer,status:'overdue',from:'2026-08-01',to:'2026-09-01',limit:1}))
})
test('complete W1 invoice list validates before minimization and exact money formatting',async()=>{
 const result=await executeProductReadPlanV2(plan,fixture().deps)
 assert.equal(result.status,'completed');if(result.status!=='completed')return
 assert.deepEqual(result.evidence[0]!.data.items,[{id,status:'issued',issue_on:'2026-08-15',due_on:'2026-09-15',currency:'EUR',total_minor:'12345',overdue:true}])
 const response=composeProductResponseV2(result,'request')
 assert.equal(response.blocks[0]!.title,'Facturas del cliente · estado registrado');assert.equal(response.blocks[0]!.rows[0]!.total_minor,'123,45')
 assert.equal(response.blocks[0]!.rows[0]!.status,'Emitida');assert.equal(response.blocks[0]!.rows[0]!.currency,'EUR')
 assert.equal(response.sources[0]!.asOf,null);assert.equal(response.sources[0]!.partial,false)
 for(const hidden of [customer,id,'customer_id','number','series','version','tax_minor','withholding_minor'])assert.equal(JSON.stringify(response).includes(hidden),false)
})
test('foreign customer or incorrect status/issue-date slice fails closed',()=>{
 for(const [input,row] of [[{customer_id:customer},{...invoice,customer_id:foreign}],
  [{customer_id:customer,status:'paid'},invoice],[{customer_id:customer,status:'overdue'},{...invoice,overdue:false}],
  [{customer_id:customer,from:'2026-09-01',to:'2026-10-01'},invoice],
  [{customer_id:customer,from:'2026-07-01',to:'2026-08-15'},invoice]] as const)
  assert.equal(projectAuthorizedInvoiceListV1(input,page([row])),null)
})
test('malformed totals, private extra fields, duplicate order and invalid cursor never project',()=>{
 for(const raw of [page([{...invoice,notes:'private'}]),page([{...invoice,totals:{...invoice.totals,total_minor:12}}]),
  page([{...invoice,due_on:'2026-08-01'}]),page([{...invoice,due_on:null}]),page([invoice,invoice]),page([invoice],second),
  page([{...invoice,number:{...invoice.number,series:'X'}}]),{...page(),issuer:{tax_id:'private'}}])
  assert.equal(projectAuthorizedInvoiceListV1({customer_id:customer},raw),null)
})
test('partial invoice page preserves cursor evidence without exposing identity or implying totals',async()=>{
 const f=fixture({ok:true,data:page([invoice],id)})
 const result=await executeProductReadPlanV2({...plan,nodes:[{...node,arguments:[{field:'limit',value:1}]}]},f.deps)
 assert.equal(result.status,'completed');if(result.status!=='completed')return
 assert.equal(result.evidence[0]!.partial,true);assert.equal(result.evidence[0]!.data.next_id,id)
 const response=composeProductResponseV2(result,'request');assert.equal(response.sources[0]!.partial,true)
 assert.equal(response.blocks[0]!.partial,true);assert.equal(JSON.stringify(response).includes(id),false)
})
test('mixed currencies remain separate and paid is only a recorded state',async()=>{
 const f=fixture({ok:true,data:page([invoice,{...invoice,id:second,status:'paid',currency:'USD',overdue:false,totals:{subtotal_minor:1,tax_minor:0,withholding_minor:0,total_minor:1}}])})
 const response=composeProductResponseV2(await executeProductReadPlanV2(plan,f.deps),'request')
 assert.deepEqual(response.blocks[0]!.rows.map(row=>[row.currency,row.total_minor,row.status]),[['EUR','123,45','Emitida'],['USD','0,01','Marcada como pagada']])
 assert.equal(response.blocks[0]!.rows.length,2)
})
for(const role of ['member','viewer'])test(`invoice plan for ${role} abstains before identity or invoice reads`,async()=>{
 const f=fixture();f.setAuthority({...authority,role})
 assert.equal((await executeProductReadPlanV2(plan,f.deps)).status,'abstain');assert.equal(f.reads(),0);assert.equal(f.bindings(),0)
})
test('missing server invoice reader is unavailable after authorized binding',async()=>{
 const f=fixture();delete f.deps.readers.billingInvoices
 assert.equal((await executeProductReadPlanV2(plan,f.deps)).status,'unavailable');assert.equal(f.reads(),0)
})
test('revoked or unresolvable customer reference performs no invoice query',async()=>{
 const f=fixture();f.deps.resolveReference=async()=>null
 assert.equal((await executeProductReadPlanV2(plan,f.deps)).status,'access_changed');assert.equal(f.reads(),0)
})
test('revocation while invoice read waits discards every financial fact',async()=>{
 const f=fixture();f.deps.readers.billingInvoices=async()=>{f.setAuthority(null);return{ok:true,data:page()}}
 const result=await executeProductReadPlanV2(plan,f.deps)
 assert.equal(result.status,'access_changed');assert.deepEqual(result.evidence,[])
 assert.equal(composeProductResponseV2(result,'request').grounded,false)
})
test('changed epoch while resolving customer reference prevents invoice query',async()=>{
 const f=fixture();f.deps.resolveReference=async()=>{f.setAuthority({...authority,scopeEpoch:'new'});return customer}
 assert.equal((await executeProductReadPlanV2(plan,f.deps)).status,'access_changed');assert.equal(f.reads(),0)
})
