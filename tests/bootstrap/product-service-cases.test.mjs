import test from 'node:test'
import assert from 'node:assert/strict'
import {CaseServiceV1}from '../../src/lib/server/case-service-v1.ts'
import {caseHttpV1}from '../../src/lib/server/case-http-v1.ts'
import {parseCaseInputV1 as input,parseCaseResultV1 as result}from '../../src/lib/server/case-runtime-v1.ts'
const id='a1000000-0000-4000-8000-000000000001',other='a1000000-0000-4000-8000-000000000002'
const note={command_id:id,id,expected_version:3,body:'Private synthetic note'}
const receipt={contract_version:'case.v1',operation:'case.note_create',command_id:id,id,version:4,status:'open',source:'manual',resolution_code:null,cancellation_code:null,note_id:other,note_seq:1}
const row={id,version:1,customer_id:id,contract_id:null,service_id:null,line_id:null,case_type:'technical',title:'Synthetic Incident',priority:'normal',due_on:null,assigned_user_id:null,status:'open',source:'manual',resolved_at:null,closed_at:null,resolution_code:null,cancellation_code:null,internal_note_count:0,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',overdue:false}
const page=items=>({contract_version:'case.v1',operation:'case.list',items,next_id:null})
test('case creation freezes explicit ancestry and rejects caller authority or arbitrary state',()=>{
 const create={command_id:id,customer_id:id,contract_id:null,service_id:null,line_id:null,case_type:'technical',title:'Synthetic',priority:'normal',due_on:null,assigned_user_id:null}
 assert.ok(input('case.create',create));for(const patch of [{service_id:id},{line_id:id},{case_type:'carrier_provision'},{title:'\u0001private'},{source:'manual'},{actor_id:id}])assert.equal(input('case.create',{...create,...patch}),null)
 assert.equal(input('case.change_status',{command_id:id,id,expected_version:1,status:'resolved'}),null)
})
test('case note text and pagination are bounded and accessors never execute',()=>{
 assert.ok(input('case.note_create',note));for(const body of ['', 'x'.repeat(4001),'x\u0001'])assert.equal(input('case.note_create',{...note,body}),null)
 for(const v of [{limit:101},{assigned_user_id:null},{due_from:'2026-01-01'},{due_from:'2026-01-01',due_to:'2028-01-01'},{overdue:'true'},{offset:10}])assert.equal(input('case.list',v),null)
 assert.equal(input('case.note_list',{id,after_seq:-1}),null);assert.ok(input('case.note_list',{id,after_seq:0,limit:100}))
 let accessed=false;assert.equal(input('case.note_create',{...note,get body(){accessed=true;return 'secret'}}),null);assert.equal(accessed,false)
})
test('case summaries and receipts reject note body, fiscal PII, duplicate records and invalid lifecycle',()=>{
 assert.ok(result('case.list',{},page([row])));for(const r of [{...row,body:'private'},{...row,msisdn:'private'},{...row,status:'resolved'},{...row,overdue:true},{...row,customer_id:other}])assert.equal(result('case.list',{customer_id:id},page([r])),null)
 assert.equal(result('case.list',{},page([row,row])),null);assert.ok(result('case.note_create',note,receipt));assert.equal(result('case.note_create',note,{...receipt,body:note.body}),null)
})
test('private note reader preserves monotonic sequence and rejects extra fields',()=>{
 const data={contract_version:'case.v1',operation:'case.note_list',case_id:id,items:[{id:other,seq:1,body:'Private synthetic note',actor_user_id:id,created_at:'2026-01-01T00:00:00Z'}],next_seq:null}
 assert.ok(result('case.note_list',{id},data));assert.equal(result('case.note_list',{id,after_seq:1},data),null);assert.equal(result('case.note_list',{id},{...data,items:[{...data.items[0],email:'private'}]}),null)
})
test('case viewer reads summaries but cannot read internal notes or mutate; suspended scope makes no RPC',async()=>{
 let calls=0;const s=new CaseServiceV1({resolve:async()=>({workspaceId:other,role:'viewer'}),rpc:async()=>{calls++;return{data:page([row]),error:null}}})
 assert.equal((await s.execute('case.list',{})).ok,true);assert.equal((await s.execute('case.note_list',{id})).error,'access_denied');assert.equal((await s.execute('case.note_create',note)).error,'access_denied');assert.equal(calls,1)
 const absent=new CaseServiceV1({resolve:async()=>null,rpc:async()=>{throw Error('must not call')}});assert.equal((await absent.execute('case.list',{})).error,'access_denied')
 const fail=new CaseServiceV1({resolve:async()=>({workspaceId:other,role:'member'}),rpc:async()=>({data:null,error:{code:'40001',message:note.body}})});assert.deepEqual(await fail.execute('case.note_create',note),{ok:false,error:'conflict'})
})
test('case transport uses exact same-origin no-store envelope and rejects tenant spoofing',async()=>{
 const origin='https://synthetic.example.invalid',s=new CaseServiceV1({resolve:async()=>({workspaceId:other,role:'member'}),rpc:async()=>({data:receipt,error:null})})
 const req=(i=note,o=origin)=>new Request(origin+'/api/cases/v1',{method:'POST',headers:{host:'synthetic.example.invalid',origin:o,'content-type':'application/json'},body:JSON.stringify({operation:'case.note_create',input:i})})
 const good=await caseHttpV1(req(),async()=>s,origin);assert.equal(good.status,200);assert.equal(good.headers.get('cache-control'),'no-store');assert.equal((await caseHttpV1(req(note,'https://foreign.example.invalid'),async()=>s,origin)).status,403);assert.equal((await caseHttpV1(req({...note,workspace_id:id}),async()=>s,origin)).status,400)
})
