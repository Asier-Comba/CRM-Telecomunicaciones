import test from'node:test'
import assert from'node:assert/strict'
import{parseTelecomAttentionInputV1 as input,parseTelecomAttentionResultV1 as result}from'../../src/lib/server/telecom-attention-runtime-v1.ts'
import{TelecomAttentionServiceV1}from'../../src/lib/server/telecom-attention-service-v1.ts'
import{telecomAttentionHttpV1}from'../../src/lib/server/telecom-attention-http-v1.ts'
const id='a1000000-0000-4000-8000-000000000001',other='a1000000-0000-4000-8000-000000000002',i={window_from:'2026-10-01',window_to:'2026-11-01'}
const row=(patch={})=>({kind:'renewal',id,customer_id:id,owner_user_id:null,sort_on:'2026-10-10',due_on:'2026-10-10',status:'open',reason_code:'renewal_upcoming',priority:'normal',...patch})
const page=(rows=[row()],patch={})=>({contract_version:'telecom.attention.v1',operation:'telecom.attention',as_of:'2026-10-06',fallback_on:'2026-10-06',items:rows,next_cursor:null,...patch})
test('attention input closes caller scope SQL and bounds complete canonical date windows/cursors',()=>{
 assert.ok(input(i));assert.ok(input({...i,limit:100,kind:'case'}))
 for(const patch of[{workspace_id:id},{sql:'select private'},{kind:'arbitrary'},{limit:101},{window_from:'2026-02-31'},{window_to:'2028-01-01'},{window_to:'2026-09-30'},{after_id:id},{after_sort_on:'2026-10-10',after_kind:'case',after_id:id},{fallback_on:null}])assert.equal(input({...i,...patch}),null)
 assert.ok(input({...i,after_sort_on:'2026-10-10',after_kind:'case',after_id:id,fallback_on:'2026-10-06'}))
})
test('attention DTO rejects raw identity private body arbitrary statuses and corrupted filter scope',()=>{
 assert.ok(result(i,page()))
 for(const patch of[{canonical_value:'+12025550187'},{body:'private'},{status:'invented'},{customer_id:null},{due_on:null},{priority:'urgent'},{reason_code:'renewal_overdue'}])assert.equal(result(i,page([row(patch)])),null)
 assert.equal(result({...i,customer_id:other},page()),null);assert.equal(result({...i,owner_user_id:other},page()),null);assert.equal(result({...i,kind:'case'},page()),null)
})
test('undated urgent cases keep genuine null due dates and pinned fallback ordering across midnight',()=>{
 const r=row({kind:'case',sort_on:'2026-10-06',due_on:null,status:'waiting_operator',reason_code:'case_urgent',priority:'urgent'})
 assert.ok(result(i,page([r],{as_of:'2026-10-07'})));assert.equal(result(i,page([{...r,sort_on:'2026-10-07'}],{as_of:'2026-10-07'})),null)
 assert.equal(result(i,page([r],{as_of:'2026-10-14'})),null);assert.equal(result({...i,fallback_on:'2026-10-05'},page([r])),null)
})
test('attention keyset cursor must be exact last tuple and complete; duplicate or reversed rows rejected',()=>{
 const r=row(),c={after_sort_on:r.sort_on,after_kind:r.kind,after_id:r.id,fallback_on:'2026-10-06'}
 assert.ok(result({...i,limit:1},page([r],{next_cursor:c})))
 assert.equal(result(i,page([r],{next_cursor:c})),null);assert.equal(result({...i,limit:1},page([r],{next_cursor:{...c,after_id:other}})),null)
 assert.equal(result(i,page([r,r])),null);assert.equal(result({...i,...c},page([r])),null)
 assert.ok(result(i,page([r,row({id:other})])))
})
test('attention reason rules distinguish blocked porting and temporal renewals permanence tasks and meetings',()=>{
 const p=row({kind:'portability',status:'rejected',reason_code:'portability_blocked',priority:'high'})
 assert.ok(result(i,page([p])));for(const patch of[{status:'draft'},{priority:'normal'},{reason_code:'portability_pending'}])assert.equal(result(i,page([{...p,...patch}])),null)
 for(const patch of[{kind:'permanence',reason_code:'permanence_ending',due_on:'2026-10-05',sort_on:'2026-10-05'},{kind:'task',status:'pending',reason_code:'task_overdue'},{kind:'meeting',status:'scheduled',reason_code:'meeting_upcoming',due_on:'2026-10-05',sort_on:'2026-10-05'}])assert.equal(result(i,page([row(patch)])),null)
})
test('attention ordinary viewer read rechecks live membership and never registers writes',async()=>{
 let active=true,calls=0;const port={resolve:async()=>active?{workspaceId:id,role:'viewer'}:null,rpc:async(name,args)=>{calls++;assert.equal(name,'telecom_attention_v1_query');assert.equal(args.p_workspace_id,id);return{data:page(),error:null}}},s=new TelecomAttentionServiceV1(port)
 assert.equal((await s.execute('telecom.attention',i)).ok,true);assert.equal((await s.execute('telecom.attention.create',i)).error,'validation');active=false;assert.equal((await s.execute('telecom.attention',i)).error,'access_denied');assert.equal(calls,1)
})
test('attention HTTP redacts database details and uses no-store and explicit same origin',async()=>{
 const s=new TelecomAttentionServiceV1({resolve:async()=>({workspaceId:id,role:'member'}),rpc:async()=>({data:null,error:{code:'42501',message:'private',details:'raw'}})})
 const origin='https://synthetic.example.invalid',make=o=>new Request(origin+'/api/telecom/attention/v1',{method:'POST',headers:{host:'synthetic.example.invalid',origin:o,'content-type':'application/json'},body:JSON.stringify({operation:'telecom.attention',input:i})})
 const r=await telecomAttentionHttpV1(make(origin),async()=>s,origin);assert.equal(r.status,403);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{ok:false,error:'access_denied'});assert.equal((await telecomAttentionHttpV1(make('https://other.example.invalid'),async()=>s,origin)).status,403)
})
