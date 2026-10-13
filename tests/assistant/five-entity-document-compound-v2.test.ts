import assert from 'node:assert/strict'
import {test} from 'node:test'
import {executeProductReadPlanV2,type ProductReadDependenciesV2} from '../../src/assistant/product-read-executor-v2.ts'
import {composeProductResponseV2} from '../../src/assistant/product-response-v2.ts'
const uuid=(n:number)=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0'),customer=uuid(1)
const names=['crm.invoice.list','crm.portability.list','crm.case.list','crm.equipment.list','crm.document.list']
const plan=(documentHandle='customer_ref')=>({version:2,decision:'plan',nodes:names.map((capability,i)=>({id:'read_'+i,capability,arguments:[],bindings:[{field:'customer_id',handle:i===4?documentHandle:'customer_ref',nodeId:null}]}))})
const invoice={id:uuid(11),version:1,status:'issued',customer_id:customer,issue_on:'2026-08-15',due_on:'2026-09-15',series:'S',currency:'EUR',number:{series:'S',year:2026,sequence:1},totals:{subtotal_minor:12345,tax_minor:0,withholding_minor:0,total_minor:12345},overdue:true}
const port={id:uuid(12),version:2,customer_id:customer,contract_id:uuid(4),service_id:uuid(5),line_id:uuid(6),number_identifier_id:uuid(7),masked_display:'••••181',direction:'inbound',donor_operator_id:uuid(8),target_operator_id:uuid(9),requested_on:'2026-10-01',submitted_on:'2026-10-02',scheduled_on:null,started_on:null,completed_on:null,closed_on:null,status:'requested',reason_code:null,owner_user_id:uuid(10),source:'manual',created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-02T00:00:00Z'}
const incident={id:uuid(13),version:1,customer_id:customer,contract_id:uuid(4),service_id:uuid(5),line_id:uuid(6),case_type:'technical',title:'PRIVATE_CASE_TITLE',priority:'high',due_on:'2026-10-13',assigned_user_id:uuid(7),status:'open',source:'manual',resolved_at:null,closed_at:null,resolution_code:null,cancellation_code:null,internal_note_count:5,created_at:'2026-10-12T00:00:00Z',updated_at:'2026-10-12T00:00:00Z',overdue:false}
const equipment={id:uuid(14),version:1,customer_id:customer,contract_id:uuid(4),service_id:uuid(5),line_id:uuid(6),commitment_id:uuid(7),kind:'router',manufacturer:'PRIVATE_MAKER',model:'PRIVATE_MODEL',commercial_description:'PRIVATE_DESCRIPTION',status:'prepared',purchased_on:'2026-10-01',assigned_on:null,returned_on:null,replaced_on:null,cancelled_on:null,replaces_equipment_id:null,replaced_by_id:null,source:'manual'}
const document={id:uuid(15),version:1,document_kind:'general',status:'active',media_type:'application/pdf',size_bytes:1013,target:{kind:'customer',id:customer}}
const data=(contract:string,operation:string,row:unknown)=>({ok:true,data:{contract_version:contract,operation,items:[row],next_id:null}})
function fixture(role='owner'){
 const scope={actorId:'actor',workspaceId:'workspace',scopeEpoch:'epoch',role},calls:string[]=[]
 const read=(op:string,value:unknown)=>{calls.push(op);return Promise.resolve(value)}
 const deps:ProductReadDependenciesV2={authority:async()=>scope,offeredHandles:['customer_ref','foreign_ref'],resolveReference:async handle=>handle==='customer_ref'?customer:null,
  now:()=>new Date('2026-10-13T00:00:00Z'),readers:{collection:async()=>{throw Error('UNEXPECTED_COLLECTION')},report:async()=>{throw Error('UNEXPECTED_REPORT')},
   billingInvoices:op=>read(op,data('billing.v1',op,invoice)),portabilities:op=>read(op,data('portability.v1',op,port)),cases:op=>read(op,data('case.v1',op,incident)),equipment:op=>read(op,data('equipment.v1',op,equipment)),documents:op=>read(op,data('document.v1',op,document))}}
 return{scope,calls,deps}
}

test('five current entity groups preserve distinct sources and exact minimized facts without documentary content',async()=>{
 const d=fixture(),response=composeProductResponseV2(await executeProductReadPlanV2(plan(),d.deps),'test')
 assert.equal(response.status,'completed');assert.equal(response.blocks.length,5)
 assert.deepEqual(response.sources.map(s=>s.capability),names);assert.equal(new Set(response.sources.map(s=>s.ref)).size,5)
 assert.ok(response.blocks.every((b,i)=>b.sourceRef===response.sources[i]!.ref&&b.rows.length===1&&!b.partial))
 assert.equal(response.blocks[0]!.rows[0]!.total_minor,'123,45');assert.equal(response.blocks[0]!.rows[0]!.currency,'EUR')
 assert.equal(response.blocks[4]!.title,'Documentos directos del cliente · metadatos registrados')
 assert.deepEqual(response.blocks[4]!.rows[0],{status:'Activo',document_kind:'General',media_type:'application/pdf',size_bytes:1013})
 for(const privateValue of [customer,uuid(11),uuid(12),uuid(13),uuid(14),uuid(15),'PRIVATE_CASE_TITLE','PRIVATE_MAKER','PRIVATE_MODEL','PRIVATE_DESCRIPTION','file_name','storage_path','indexingApproved'])assert.ok(!JSON.stringify(response).includes(privateValue))
 assert.equal(d.calls.length,5)
})

test('document permission denies the entire five-entity plan before any read for viewer or member',async()=>{
 for(const role of ['viewer','member']){
  const d=fixture(role);let resolutions=0;d.deps.resolveReference=async()=>{resolutions++;return customer}
  const result=await executeProductReadPlanV2(plan(),d.deps)
  assert.equal(result.status,'abstain');assert.equal(resolutions,0);assert.deepEqual(d.calls,[])
  assert.deepEqual(composeProductResponseV2(result,'test').blocks,[])
 }
})

test('foreign metadata reference late revocation or malformed last DTO discards all earlier four groups',async()=>{
 for(const mode of ['foreign','revoked','malformed']){
  const d=fixture()
  if(mode!=='foreign')d.deps.readers.documents=async op=>{d.calls.push(op);if(mode==='revoked')d.scope.role='viewer';return data('document.v1',op,mode==='malformed'?{...document,file_name:'PRIVATE_FILE'}:document)}
  const result=await executeProductReadPlanV2(plan(mode==='foreign'?'foreign_ref':'customer_ref'),d.deps)
  assert.equal(result.status,mode==='malformed'?'unavailable':'access_changed')
  assert.equal(d.calls.length,mode==='foreign'?4:5)
  assert.deepEqual(result.evidence,[]);assert.deepEqual(composeProductResponseV2(result,'test').blocks,[])
 }
})
