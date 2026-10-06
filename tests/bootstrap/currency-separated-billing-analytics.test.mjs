import test from'node:test'
import assert from'node:assert/strict'
import{parseBillingAnalyticsInputV1 as input,parseBillingAnalyticsResultV1 as result}from'../../src/lib/server/billing-analytics-runtime-v1.ts'
import{BillingAnalyticsServiceV1}from'../../src/lib/server/billing-analytics-service-v1.ts'
import{billingAnalyticsHttpV1}from'../../src/lib/server/billing-analytics-http-v1.ts'
const id='a1000000-0000-4000-8000-000000000001',other='a1000000-0000-4000-8000-000000000002',op='billing.monthly_series',top='billing.top_customers',i={currency:'EUR',from_month:'2026-01-01',to_month:'2026-01-01'}
const amounts={issued_minor:'350',paid_minor:'100',outstanding_minor:'250',overdue_minor:'250'}
const page=(operation=op,items=[{month:'2026-01-01',...amounts}],patch={})=>({contract_version:'billing.analytics.v1',operation,basis:'issue_month_cohort_current_status',as_of:'2026-10-06',...i,items,...patch})
test('billing cohorts require one registered currency explicit bounded months and top limits',()=>{
 assert.ok(input(op,i));assert.ok(input(top,{...i,limit:25}))
 for(const patch of[{currency:'ALL'},{currency:null},{currency:undefined},{workspace_id:id},{sql:'arbitrary'},{from_month:'2026-01-02'},{from_month:'2026-02-31'},{to_month:'2028-01-01'},{to_month:'2025-01-01'},{limit:1}])assert.equal(input(op,{...i,...patch}),null)
 assert.equal(input(top,{...i,limit:26}),null);assert.equal(input(op,{from_month:i.from_month,to_month:i.to_month}),null)
})
test('money aggregation preserves integers beyond JS safe range and exact issued/paid/outstanding equations',()=>{
 const huge={issued_minor:'9007199254740993123',paid_minor:'123',outstanding_minor:'9007199254740993000',overdue_minor:'9007199254740993000'}
 assert.ok(result(op,i,page(op,[{month:i.from_month,...huge}])))
 for(const patch of[{issued_minor:'9007199254740993124'},{paid_minor:123},{issued_minor:'01'},{issued_minor:'-1'},{overdue_minor:'9007199254740993001'},{outstanding_minor:'1e18'},{issued_minor:'1'.repeat(41)}])assert.equal(result(op,i,page(op,[{month:i.from_month,...huge,...patch}])),null)
})
test('series requires dense ordered calendar rows and explicit basis/currency without fiscal or identity extras',()=>{
 assert.ok(result(op,i,page()));for(const patch of[{currency:'USD'},{basis:'historical_balance'},{tax_id:'private'}])assert.equal(result(op,i,page(op,undefined,patch)),null)
 assert.equal(result(op,{...i,to_month:'2026-02-01'},page(op,undefined,{to_month:'2026-02-01'})),null)
 assert.equal(result(op,i,page(op,[{month:i.from_month,...amounts,customer_id:id}])),null)
})
test('top rows are bounded distinct safe IDs ordered by numeric issued amount then UUID',()=>{
 const rows=[{customer_id:id,...amounts},{customer_id:other,...amounts}]
 assert.ok(result(top,i,page(top,rows)));assert.equal(result(top,i,page(top,[...rows].reverse())),null)
 assert.equal(result(top,{...i,limit:1},page(top,rows)),null);assert.equal(result(top,{...i,customer_id:other},page(top,rows)),null)
 assert.equal(result(top,i,page(top,[...rows,rows[0]])),null)
 assert.equal(result(top,i,page(top,[{...rows[0],legal_name:'private'}])),null)
})
test('billing analytics preserves owner/admin scope and denies member/viewer before RPC and valid-session revocation',async()=>{
 let calls=0,active=true;const port={resolve:async()=>active?{workspaceId:id,role:'admin'}:null,rpc:async()=>{calls++;return{data:page(),error:null}}}
 const s=new BillingAnalyticsServiceV1(port);assert.equal((await s.execute(op,i)).ok,true);active=false;assert.equal((await s.execute(op,i)).error,'access_denied');assert.equal(calls,1)
 for(const role of['member','viewer']){const otherService=new BillingAnalyticsServiceV1({...port,resolve:async()=>({workspaceId:id,role})});assert.equal((await otherService.execute(op,i)).error,'access_denied')}
 assert.equal(calls,1);assert.equal((await s.execute('billing.arbitrary_sql',i)).error,'validation')
})
test('billing analytics HTTP is private no-store and suppresses raw database error detail',async()=>{
 const s=new BillingAnalyticsServiceV1({resolve:async()=>({workspaceId:id,role:'owner'}),rpc:async()=>({data:null,error:{code:'P0002',message:'private',details:'fiscal'}})})
 const origin='https://synthetic.example.invalid',r=await billingAnalyticsHttpV1(new Request(origin+'/api/billing/analytics/v1',{method:'POST',headers:{host:'synthetic.example.invalid',origin,'content-type':'application/json'},body:JSON.stringify({operation:op,input:i})}),async()=>s,origin)
 assert.equal(r.status,404);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{ok:false,error:'not_found'})
})
