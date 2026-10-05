import test from 'node:test'
import assert from 'node:assert/strict'
import {renderBillingPdfV1} from '../../src/lib/server/billing-pdf-v1.ts'
import {billingPdfHttpV1} from '../../src/lib/server/billing-pdf-http-v1.ts'
import {BillingServiceV1} from '../../src/lib/server/billing-service-v1.ts'
import {calculateBillingV1} from '../../src/lib/server/billing-runtime-v1.ts'
const id='10000000-0000-4000-8000-000000000001'
const line={description:'Synthetic conexión (fiscal) \\ detalle',quantity_milli:1500,unit_price_minor:101,discount_bps:500,tax_bps:2100,withholding_bps:1500}
const profile={legal_name:'Synthetic Compañía',tax_id:'SYNTHETIC-NOT-VALID',address:'Synthetic dirección 1',postal_code:'00000',city:'Synthetic',region:'Synthetic',country:'ES'}
const invoice={id,version:2,status:'issued',customer_id:id,issue_on:'2026-10-04',due_on:null,series:'A',currency:'EUR',number:{series:'A',year:2026,sequence:1},totals:calculateBillingV1([line]),overdue:false,lines:[line],notes:null,contract_id:null,service_id:null,opportunity_id:null,issuer:{...profile,currency:'EUR',default_series:'A'},customer_fiscal:profile,issued_at:'2026-10-04T16:00:00Z',paid_at:null,fx:null}
test('PDF is deterministic, escapes text, paginates all 50 lines, rejects injected snapshots and recalculates totals',()=>{
 const bytes=renderBillingPdfV1(invoice);assert.ok(bytes);assert.deepEqual(bytes,renderBillingPdfV1(invoice))
 const text=Buffer.from(bytes).toString('latin1');assert.ok(text.startsWith('%PDF-'));assert.ok(text.includes('1,52 EUR'));assert.ok(text.includes('SYNTHETIC-NOT-VALID'));assert.ok(text.includes('\\(fiscal\\)'))
 const lines=Array.from({length:50},(_,i)=>({...line,description:'Synthetic line '+i+' '+ 'Detailed synthetic description '.repeat(8)}))
 const multi=Buffer.from(renderBillingPdfV1({...invoice,lines,totals:calculateBillingV1(lines)})).toString('latin1')
 assert.ok(multi.includes('Synthetic line 49'));assert.ok((multi.match(/\/Type \/Page\b/g)||[]).length>1)
 for(const patch of [{totals:{...invoice.totals,total_minor:999}},{issuer:{...invoice.issuer,logo_url:'https://foreign.invalid'}}])assert.equal(renderBillingPdfV1({...invoice,...patch}),null)
})
test('PDF route resolves protected server record, refuses caller content and denies member without DB access',async()=>{
 const req=input=>new Request('http://localhost/api/billing/v1/pdf',{method:'POST',headers:{host:'localhost',origin:'http://localhost','content-type':'application/json'},body:JSON.stringify({operation:'invoice.pdf',input})})
 let calls=0
 const factory=role=>async()=>new BillingServiceV1({resolve:async()=>({workspaceId:id,role}),rpc:async()=>{calls++;return {error:null,data:{contract_version:'billing.v1',operation:'invoice.get',invoice}}}})
 const r=await billingPdfHttpV1(req({id}),factory('owner'),'http://localhost');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('content-type'),'application/pdf')
 assert.equal((await billingPdfHttpV1(req({id,invoice}),factory('owner'),'http://localhost')).status,400)
 assert.equal((await billingPdfHttpV1(req({id}),factory('member'),'http://localhost')).status,403);assert.equal(calls,1)
})
export {invoice,line}
