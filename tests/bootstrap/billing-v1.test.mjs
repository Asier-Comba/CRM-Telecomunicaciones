import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateBillingV1,parseBillingInputV1,parseBillingReceiptV1,parseBillingLinesV1 } from '../../src/lib/server/billing-runtime-v1.ts'
import { parseBillingQueryV1,parseBillingReadV1 } from '../../src/lib/server/billing-query-runtime-v1.ts'
import { BillingServiceV1 } from '../../src/lib/server/billing-service-v1.ts'
import { billingHttpV1 as http } from '../../src/lib/server/billing-http-v1.ts'
const billingHttpV1=(request,kind,factory)=>http(request,kind,factory,'http://localhost')
const id='10000000-0000-4000-8000-000000000001'
const line={description:'Synthetic',quantity_milli:1500,unit_price_minor:101,discount_bps:500,tax_bps:2100,withholding_bps:1500}
const draft={command_id:id,customer_id:id,issue_on:'2026-10-04',due_on:null,series:'A',currency:'EUR',lines:[line]}
test('exact line rounding: gross152 discount8 base144 VAT30 withholding22 total152',()=>{
 assert.deepEqual(calculateBillingV1([line]),{subtotal_minor:144,tax_minor:30,withholding_minor:22,total_minor:152})
 assert.deepEqual(calculateBillingV1([{...line,quantity_milli:500,unit_price_minor:1,discount_bps:0,tax_bps:5000,withholding_bps:0}]),{subtotal_minor:1,tax_minor:1,withholding_minor:0,total_minor:2})
 assert.equal(calculateBillingV1([{...line,quantity_milli:100000000,unit_price_minor:1000000000}]),null)
})
test('billing schema refuses derived totals, authority, float units and malformed fiscal dates',()=>{
 assert.ok(parseBillingInputV1('invoice.create_draft',draft))
 for(const patch of [{total_minor:0},{issuer_snapshot:{}},{workspace_id:id},{customer_id:'foreign'},{due_on:'2026-02-30'},{due_on:'2026-10-01'},{currency:'USD'},{lines:[{...line,unit_price_minor:-1}]},{lines:[{...line,quantity_milli:1.5}]},{lines:[{...line,tax_bps:10001}]}])assert.equal(parseBillingInputV1('invoice.create_draft',{...draft,...patch}),null)
 assert.ok(parseBillingInputV1('invoice.create_draft',{...draft,currency:'USD',fx_rate_micros:920000,fx_on:'2026-10-04',fx_source:'Synthetic manual'}))
})
test('billing rejects hostile arrays/accessors without reading getter and binds fiscal receipt',()=>{
 let reads=0;const array=[];Object.defineProperty(array,'0',{enumerable:true,get(){reads++;return line}})
 assert.equal(parseBillingLinesV1(array),null);assert.equal(reads,0)
 const input={command_id:id,id,expected_version:1};const receipt={contract_version:'billing.v1',command_id:id,operation:'invoice.issue',id,version:2,status:'issued',number:{series:'A',year:2026,sequence:1}}
 assert.ok(parseBillingReceiptV1('invoice.issue',input,receipt))
 for(const patch of [{status:'draft'},{version:1},{tax_id:'private'},{number:null}])assert.equal(parseBillingReceiptV1('invoice.issue',input,{...receipt,...patch}),null)
})
test('billing protected role and errors are minimized before calling DB',async()=>{
 for(const role of ['member','viewer']){let calls=0;const service=new BillingServiceV1({resolve:async()=>({workspaceId:id,role}),rpc:async()=>{calls++;throw Error('private')}});assert.deepEqual(await service.execute('invoice.create_draft',draft),{ok:false,error:'access_denied'});assert.equal(calls,0)}
 const service=new BillingServiceV1({resolve:async()=>({workspaceId:id,role:'owner'}),rpc:async()=>({error:{code:'40001',message:'private'},data:null})});assert.deepEqual(await service.execute('invoice.create_draft',draft),{ok:false,error:'conflict'})
})
test('billing query bounds and actual-source aggregate identities reject inconsistent money',()=>{
 assert.ok(parseBillingQueryV1('invoice.list',{from:'2026-01-01',to:'2027-01-01',limit:100}))
 for(const v of [{limit:101},{from:'2026-01-01'},{id},{status:'fake'},{from:'2026-01-01',to:'2028-01-01'}])assert.equal(parseBillingQueryV1('invoice.list',v),null)
 const data={contract_version:'billing.v1',operation:'invoice.financial_summary',period:'all',from:null,to:null,as_of:'2026-10-04',currencies:[{currency:'EUR',issued_minor:1000,paid_minor:400,outstanding_minor:600,overdue_minor:200,issued_count:3,paid_count:1,outstanding_count:2,overdue_count:1}]}
 assert.ok(parseBillingReadV1('invoice.financial_summary',{period:'all'},data))
 assert.equal(parseBillingReadV1('invoice.financial_summary',{period:'all'},{...data,currencies:[{...data.currencies[0],issued_minor:999}]}),null)
})
test('billing HTTP shares CSRF guard and bigger streaming cap but refuses generic product authority',async()=>{
 let calls=0;const factory=async()=>{calls++;return new BillingServiceV1({resolve:async()=>({workspaceId:id,role:'owner'}),rpc:async()=>({error:null,data:{contract_version:'billing.v1',command_id:id,operation:'invoice.create_draft',id,version:1,status:'draft',number:null}})})}
 const req=(body,origin='http://localhost')=>new Request('http://localhost/api/billing/v1/commands',{method:'POST',headers:{host:'localhost',origin,'content-type':'application/json'},body:JSON.stringify(body)})
 assert.equal((await billingHttpV1(req({operation:'invoice.create_draft',input:draft}),'commands',factory)).status,200)
 assert.equal((await billingHttpV1(req({operation:'invoice.create_draft',input:draft},'https://foreign.invalid'),'commands',factory)).status,403)
 assert.equal((await billingHttpV1(req({operation:'customer.create',input:draft}),'commands',factory)).status,400)
 assert.equal(calls,1)
})

test('issued protected read accepts PostgreSQL microseconds and rejects snapshot/totals injection',()=>{
 const profile={legal_name:'Synthetic',tax_id:'SYNTHETIC',address:'Synthetic 1',postal_code:'00000',city:'Synthetic',region:'Synthetic',country:'ES'}
 const invoice={id,version:2,status:'issued',customer_id:id,issue_on:'2026-10-04',due_on:null,series:'A',currency:'EUR',number:{series:'A',year:2026,sequence:1},totals:calculateBillingV1([line]),overdue:false,lines:[line],notes:null,contract_id:null,service_id:null,opportunity_id:null,issuer:{...profile,currency:'EUR',default_series:'A'},customer_fiscal:profile,issued_at:'2026-10-04T16:00:00.123456+00:00',paid_at:null,fx:null}
 const response={contract_version:'billing.v1',operation:'invoice.get',invoice}
 assert.ok(parseBillingReadV1('invoice.get',{id},response))
 for(const patch of [{issuer:{...invoice.issuer,logo_url:'https://foreign.invalid'}},{lines:[{...line,total_minor:1}]},{issued_at:'2026-02-30T16:00:00.123456+00:00'}])assert.equal(parseBillingReadV1('invoice.get',{id},{...response,invoice:{...invoice,...patch}}),null)
})
