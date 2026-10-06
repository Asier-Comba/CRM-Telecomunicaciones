import test from'node:test'
import assert from'node:assert/strict'
import{parseTelecomReadInputV1 as input,parseTelecomReadResultV1 as result}from'../../src/lib/server/telecom-reads-runtime-v1.ts'
import{TelecomReadsServiceV1}from'../../src/lib/server/telecom-reads-service-v1.ts'
import{telecomReadsHttpV1}from'../../src/lib/server/telecom-reads-http-v1.ts'
const id='a1000000-0000-4000-8000-000000000001',other='a1000000-0000-4000-8000-000000000002'
const page=(op,items,extra={})=>({contract_version:'telecom.reads.v1',operation:op,as_of:'2026-10-06',items,next_id:null,...extra})
const summary=(privateCounts=null)=>({contract_version:'telecom.reads.v1',operation:'customer360.summary',as_of:'2026-10-06',record:{customer_id:id,contacts:2,contracts:1,services:2,lines:3,renewals:1,permanences:2,opportunities:1,tasks:4,meetings:2,cases:1,documents:privateCounts,billing:privateCounts,activity:8,portabilities:1,sims:2}})
test('commercial report inputs reject caller SQL/tenant/arbitrary grouping and bound complete calendar months',()=>{
 assert.ok(input('report.renewals_by_month',{from_month:'2026-01-01',to_month:'2027-12-01'}));for(const p of [{to_month:'2028-01-01'},{from_month:'2026-02-31'},{from_month:'2026-01-02'},{to_month:'2025-12-01'},{group_by:'raw'},{workspace_id:id}])assert.equal(input('report.renewals_by_month',{from_month:'2026-01-01',to_month:'2026-12-01',...p}),null)
 assert.equal(input('customer360.summary',{}),null);assert.equal(input('report.lines_by_status',{limit:1}),null);assert.equal(input('report.operator_portfolio',{limit:101}),null)
 const getter={};Object.defineProperty(getter,'customer_id',{enumerable:true,get(){throw Error('must not invoke')}});assert.equal(input('customer360.summary',getter),null)
})
test('Customer360 has exact minimal counters and no fiscal identity/note/value payload',()=>{
 assert.ok(result('customer360.summary',{customer_id:id},summary()));for(const p of [{customer_id:other},{contacts:-1},{sims:1.5},{phone:'private'},{documents:'0'},{activity:1e15}])assert.equal(result('customer360.summary',{customer_id:id},{...summary(),record:{...summary().record,...p}}),null)
})
test('status distributions require every closed category exactly once including zero counts',()=>{
 const rows=['active','cancelled','ended','pending','suspended'].map(status=>({status,count:0}));assert.ok(result('report.lines_by_status',{},page('report.lines_by_status',rows)))
 for(const r of [rows.slice(1),[...rows,rows[0]],rows.map((v,i)=>i? v:{...v,msisdn:'private'}),rows.map((v,i)=>i? v:{...v,status:'unknown'})])assert.equal(result('report.lines_by_status',{},page('report.lines_by_status',r)),null)
})
test('monthly cohort counts are dense bounded calendar rows rather than inferred missing months',()=>{
 const i={from_month:'2026-01-01',to_month:'2026-03-01'},rows=['2026-01-01','2026-02-01','2026-03-01'].map(month=>({month,open:0,cancelled:0}));assert.ok(result('report.permanences_by_month',i,page('report.permanences_by_month',rows)))
 assert.equal(result('report.permanences_by_month',i,page('report.permanences_by_month',rows.slice(1))),null);assert.equal(result('report.permanences_by_month',i,page('report.permanences_by_month',[...rows].reverse())),null)
})
test('catalog and pipeline aggregate pages validate exact keyset cursor and filtered identity',()=>{
 const op='report.operator_portfolio',row={id,customers:2,contracts:3,services:4,lines:6};assert.ok(result(op,{limit:1},{...page(op,[row]),next_id:id}));assert.equal(result(op,{limit:1},{...page(op,[row]),next_id:other}),null);assert.equal(result(op,{after_id:id},page(op,[row])),null);assert.equal(result(op,{operator_id:other},page(op,[row])),null)
})
test('member and viewer cannot receive protected document/billing counters from a corrupted summary response',async()=>{
 for(const role of['member','viewer']){const s=new TelecomReadsServiceV1({resolve:async()=>({workspaceId:id,role}),rpc:async()=>({data:summary(1),error:null})});assert.equal((await s.execute('customer360.summary',{customer_id:id})).error,'internal_safe')}
 const owner=new TelecomReadsServiceV1({resolve:async()=>({workspaceId:id,role:'owner'}),rpc:async()=>({data:summary(1),error:null})});assert.equal((await owner.execute('customer360.summary',{customer_id:id})).ok,true)
})
test('current scope is rechecked for reads and report HTTP redacts database errors with no-store',async()=>{
 let active=true,calls=0;const port={resolve:async()=>active?{workspaceId:id,role:'viewer'}:null,rpc:async()=>{calls++;return{data:summary(),error:null}}};const s=new TelecomReadsServiceV1(port);assert.equal((await s.execute('customer360.summary',{customer_id:id})).ok,true);active=false;assert.equal((await s.execute('customer360.summary',{customer_id:id})).error,'access_denied');assert.equal(calls,1)
 active=true;port.rpc=async()=>({data:null,error:{code:'P0002',message:'private',details:'raw'}})
 const origin='https://synthetic.example.invalid',r=await telecomReadsHttpV1(new Request(origin+'/api/telecom/reads/v1',{method:'POST',headers:{host:'synthetic.example.invalid',origin,'content-type':'application/json'},body:JSON.stringify({operation:'customer360.summary',input:{customer_id:id}})}),async()=>s,origin);assert.equal(r.status,404);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{ok:false,error:'not_found'})
})
