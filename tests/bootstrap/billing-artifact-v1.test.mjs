import test from 'node:test'
import assert from 'node:assert/strict'
import {renderFrozenInvoicePdfV1,parseBillingArtifactInputV1,billingArtifactChildCommandV1}from '../../src/lib/server/billing-artifact-runtime-v1.ts'
import {BillingArtifactServiceV1}from '../../src/lib/server/billing-artifact-service-v1.ts'
import {BillingIssueArtifactServiceV1}from '../../src/lib/server/billing-issue-artifact-service-v1.ts'
import {calculateBillingV1}from '../../src/lib/server/billing-runtime-v1.ts'
const fid='10000000-0000-4000-8000-000000000001'
const line={description:'Synthetic private PDF',quantity_milli:1500,unit_price_minor:101,discount_bps:500,tax_bps:2100,withholding_bps:1500}
const profile={legal_name:'Synthetic Company',tax_id:'SYNTHETIC-NOT-VALID',address:'Synthetic Street',postal_code:'00000',city:'Synthetic',region:'Synthetic',country:'ES'}
const invoice={id:fid,version:2,status:'issued',customer_id:fid,issue_on:'2026-10-04',due_on:null,series:'A',currency:'EUR',number:{series:'A',year:2026,sequence:1},totals:calculateBillingV1([line]),overdue:false,lines:[line],notes:null,contract_id:null,service_id:null,opportunity_id:null,issuer:{...profile,currency:'EUR',default_series:'A'},customer_fiscal:profile,issued_at:'2026-10-04T16:00:00Z',paid_at:null,fx:null}
const id=invoice.id,document='e9100000-0000-4000-8000-000000000001',command='f9100000-0000-4000-8000-000000000001'
test('frozen persisted PDF bytes survive paid/overdue display changes and reject unissued/forged fiscal truth',()=>{
 const expected=renderFrozenInvoicePdfV1(invoice)
 assert.deepEqual(renderFrozenInvoicePdfV1({...invoice,status:'paid',paid_at:'2026-10-05T12:00:00Z',version:3}),expected)
 assert.deepEqual(renderFrozenInvoicePdfV1({...invoice,overdue:true,version:3}),expected)
 assert.equal(renderFrozenInvoicePdfV1({...invoice,status:'draft',number:null,issued_at:null}),null)
 assert.equal(renderFrozenInvoicePdfV1({...invoice,totals:{...invoice.totals,total_minor:1}}),null)
 const key=billingArtifactChildCommandV1(command,id,'upload');assert.equal(key,billingArtifactChildCommandV1(command,id,'upload'));assert.notEqual(key,billingArtifactChildCommandV1(command,id,'finalize'))
})
test('fiscal artifact download rejects mismatching stored bytes and respects archive before content access',async()=>{
 const ref={contract_version:'billing.artifact.v1',operation:'invoice.private_pdf_reference',id,invoice_id:id,document_id:document,version:1,renderer_version:'billing.snapshot.pdf.v1',verification_required:true,document_status:'active'}
 let stored=renderFrozenInvoicePdfV1(invoice),archived=false
 const port={resolve:async()=>({workspaceId:id,role:'owner'}),rpc:async(name)=>({error:null,data:name==='billing_artifact_v1_get'?{...ref,document_status:archived?'archived':'active'}:name==='billing_v1_invoice_get'?{contract_version:'billing.v1',operation:'invoice.get',invoice}:name==='document_v1_get_metadata'?{contract_version:'document.v1',operation:'document.get_metadata',record:{id:document,version:2,status:'active',document_kind:'billing',media_type:'application/pdf',size_bytes:stored.length,target:{kind:'customer',id}}}:null})}
 const content={execute:async()=>({ok:true,receipt:{ticket_id:command}}),download:async()=>({ok:true,bytes:stored})},service=new BillingArtifactServiceV1(port,content)
 assert.equal((await service.download({id})).ok,true)
 stored=new Uint8Array(stored);stored[100]^=1;assert.equal((await service.download({id})).error,'conflict')
 archived=true;assert.equal((await service.download({id})).error,'access_denied')
})
test('artifact input forbids caller PDF/path/hash and member cannot reach fiscal/context ports',async()=>{
 const value={command_id:command,id,expected_version:2,expected_artifact_version:0};assert.ok(parseBillingArtifactInputV1(value))
 for(const extra of [{document_id:document},{pdf:'fake'},{storage_path:'arbitrary'},{sha256:'f'.repeat(64)},{expected_artifact_version:-1}])assert.equal(parseBillingArtifactInputV1({...value,...extra}),null)
 const service=new BillingArtifactServiceV1({resolve:async()=>({workspaceId:id,role:'member'}),rpc:async()=>{throw Error('unexpected RPC')}},{})
 assert.equal((await service.persist(value)).error,'access_denied')
})
test('optional PDF persistence failure cannot erase or falsify the committed fiscal receipt',async()=>{
 const receipt={contract_version:'billing.v1',operation:'invoice.issue',command_id:command,id,version:2,status:'issued',number:invoice.number},port={resolve:async()=>({workspaceId:id,role:'owner'}),rpc:async()=>({error:null,data:receipt})}
 const service=new BillingIssueArtifactServiceV1(port,async()=>({persist:async()=>{throw Error('storage unavailable')}}),true)
 assert.deepEqual(await service.execute('invoice.issue',{command_id:command,id,expected_version:1}),{ok:true,receipt})
})
