import test from 'node:test'
import assert from 'node:assert/strict'
import {parseDashboardInputV2,parseDashboardV2,parseGlobalSearchInputV1,parseGlobalSearchV1} from '../../src/lib/server/product-dashboard-runtime-v2.ts'
import {ProductServiceV1} from '../../src/lib/server/product-service-v1.ts'
test('search is literal bounded typed and does not expose contact identifiers',()=>{
 for(const query of ['', 'x', 'x'.repeat(101), 'x\n'])assert.equal(parseGlobalSearchInputV1({query}),null)
 assert.ok(parseGlobalSearchInputV1({query:'__'}))
 const r={kind:'customer',id:'10000000-0000-4000-8000-000000000001',customer_id:'10000000-0000-4000-8000-000000000001',label:'Synthetic Company',status:'active'}
 assert.ok(parseGlobalSearchV1({query:'synthetic'},{contract_version:'product.v1',items:[r]}))
 for(const bad of [{...r,email:'secret@example.invalid'},{...r,kind:'raw_table'},{...r,label:'Unmatched'},{...r,status:'unknown'}])assert.equal(parseGlobalSearchV1({query:'synthetic'},{contract_version:'product.v1',items:[bad]}),null)
 assert.equal(parseGlobalSearchV1({query:'synthetic'},{contract_version:'product.v1',items:Array(6).fill(r)}),null)
})
test('dashboard separates snapshot and period counts; malformed/unknown finances rejected',()=>{
 assert.ok(parseDashboardInputV2({audience:'my',period:'semester',anchor_date:'2026-10-25'}))
 for(const bad of [{workspace_id:'foreign'},{period:'yesterday'},{anchor_date:'2026-02-30'},{audience:'admin'},{period:5}])assert.equal(parseDashboardInputV2(bad),null)
 const r={contract_version:'product.dashboard.v2',audience:'my',period:{kind:'all',start:null,end_exclusive:null},snapshot_counts:Object.fromEntries(['customers','contracts','services','lines','opportunities','tasks','meetings','renewals','permanences'].map(k=>[k,0])),period_counts:Object.fromEntries(['customers_created','tasks_due','meetings_scheduled','renewals_due','permanences_due','opportunities_closed'].map(k=>[k,0])),recent_activity:[],financial:null,financial_status:'unavailable'}
 assert.ok(parseDashboardV2({period:'all'},r))
 const currency={currency:'EUR',issued_minor:152,paid_minor:0,outstanding_minor:152,overdue_minor:0,issued_count:1,paid_count:0,outstanding_count:1,overdue_count:0}
 assert.ok(parseDashboardV2({period:'all'},{...r,financial_status:'available',financial:{currencies:[currency]}}))
 assert.equal(parseDashboardV2({period:'all'},{...r,financial_status:'available',financial:{currencies:[{...currency,issued_minor:153}]}}),null)
 for(const patch of [{financial:{revenue:0}},{snapshot_counts:{...r.snapshot_counts,customers:-1}},{period:{kind:'all',start:'2026-01-01',end_exclusive:null}},{audience:'workspace'}])assert.equal(parseDashboardV2({period:'all'},{...r,...patch}),null)
})
test('team absence maps to explicit unavailable and provider detail remains hidden',async()=>{
 const service=new ProductServiceV1({resolve:async()=>({workspaceId:'10000000-0000-4000-8000-000000000001',role:'member'}),rpc:async()=>({data:null,error:{code:'0A000',message:'private'}})})
 assert.deepEqual(await service.dashboard({audience:'team'}),{ok:false,error:'unavailable'})
})
test('invoice search accepts canonical numbered/draft labels and rejects fiscal fields and fabricated labels',()=>{
 const r={kind:'invoice',id:'10000000-0000-4000-8000-000000000001',customer_id:'10000000-0000-4000-8000-000000000002',label:'Factura A/2026/000001',status:'paid'}
 assert.ok(parseGlobalSearchV1({query:'a/2026'},{contract_version:'product.v1',items:[r]}))
 assert.ok(parseGlobalSearchV1({query:'factura'},{contract_version:'product.v1',items:[{...r,label:'Factura A/2026/1000000'}]}))
 assert.ok(parseGlobalSearchV1({query:'borrador'},{contract_version:'product.v1',items:[{...r,status:'draft',label:'Factura borrador A 2026-10-04'}]}))
 for(const patch of [{tax_id:'secret'},{total_minor:100},{label:'Factura fiscal secret'},{status:'trashed'},{status:'draft'}])assert.equal(parseGlobalSearchV1({query:'factura'},{contract_version:'product.v1',items:[{...r,...patch}]}),null)
})
test('search service fails closed if a port returns invoice rows to a non-fiscal member',async()=>{
 const invoice={kind:'invoice',id:'10000000-0000-4000-8000-000000000001',customer_id:'10000000-0000-4000-8000-000000000002',label:'Factura A/2026/000001',status:'issued'}
 let role='member'
 const service=new ProductServiceV1({resolve:async()=>({workspaceId:invoice.customer_id,role}),rpc:async()=>({data:{contract_version:'product.v1',items:[invoice]},error:null})})
 assert.deepEqual(await service.globalSearch({query:'factura'}),{ok:false,error:'internal_safe'})
 role='owner';assert.equal((await service.globalSearch({query:'factura'})).ok,true)
})
