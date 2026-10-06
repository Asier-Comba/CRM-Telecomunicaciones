import test from 'node:test'
import assert from 'node:assert/strict'
import {PortabilityServiceV1}from '../../src/lib/server/portability-service-v1.ts'
import {portabilityHttpV1}from '../../src/lib/server/portability-http-v1.ts'
import {parsePortabilityInputV1 as input,parsePortabilityResultV1 as result}from '../../src/lib/server/portability-runtime-v1.ts'
const id='a1000000-0000-4000-8000-000000000001',other='a1000000-0000-4000-8000-000000000002'
const complete={command_id:id,id,expected_version:3,completed_on:'2026-02-04',evidence_source:'manual',provider_outcome:'confirmed_completed',line_action:'activate',expected_line_version:1}
const receipt={contract_version:'portability.v1',operation:'portability.complete',command_id:id,id,version:4,status:'completed',source:'manual',line_effect:{line_id:other,version:2,status:'active'}}
const row={id,version:1,customer_id:id,contract_id:id,service_id:id,line_id:id,number_identifier_id:id,masked_display:'••••123',direction:'inbound',donor_operator_id:id,target_operator_id:other,requested_on:'2026-02-01',submitted_on:null,scheduled_on:null,started_on:null,completed_on:null,closed_on:null,status:'draft',reason_code:null,owner_user_id:null,source:'manual',created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'}
const page=items=>({contract_version:'portability.v1',operation:'portability.list',items,next_id:null})
test('portability commands require explicit manual provider evidence and paired line CAS',()=>{
 assert.ok(input('portability.complete',complete))
 for(const patch of [{evidence_source:'integration'},{provider_outcome:'guessed'},{line_action:'none'},{expected_line_version:null},{completed_on:'2026-02-30'},{canonical_value:'+12025550123'},{workspace_id:id}])assert.equal(input('portability.complete',{...complete,...patch}),null)
 assert.ok(input('portability.complete',{...complete,line_action:'none',expected_line_version:null}))
 const transition={command_id:id,id,expected_version:1,status:'cancelled',effective_on:'2026-02-01',reason_code:'customer_withdrew',evidence_source:'manual'}
 assert.ok(input('portability.transition',transition));for(const patch of [{status:'completed'},{reason_code:null},{reason_code:'technical_failure'}])assert.equal(input('portability.transition',{...transition,...patch}),null)
})
test('portability pagination and dates are bounded, canonical UUIDs normalized without executing accessors',()=>{
 assert.deepEqual(input('portability.get',{id:id.toUpperCase()}),{id})
 for(const v of [{owner_user_id:null},{limit:101},{after_id:'bad'},{offset:1},{msisdn:'+12025550123'},{window_from:'2026-01-01'},{window_from:'2026-01-01',window_to:'2028-01-01'}])assert.equal(input('portability.list',v),null)
 let read=false;assert.equal(input('portability.list',{get limit(){read=true;return 50}}),null);assert.equal(read,false)
})
test('portability DTO rejects raw number, duplicate pages, foreign filters and malformed phase history',()=>{
 assert.ok(result('portability.list',{},page([row])))
 for(const v of [{...row,msisdn:'+12025550123'},{...row,status:'completed'},{...row,masked_display:'+12025550123'},{...row,scheduled_on:'2026-01-01'}])assert.equal(result('portability.list',{},page([v])),null)
 assert.equal(result('portability.list',{},page([row,row])),null);assert.equal(result('portability.list',{customer_id:other},page([row])),null)
 assert.ok(result('portability.list',{operator_id:other},page([row])))
})
test('exact receipts validate line effects and status without recovering them from guessed data',()=>{
 assert.ok(result('portability.complete',complete,receipt))
 for(const r of [{...receipt,line_effect:null},{...receipt,version:5},{...receipt,status:'scheduled'},{...receipt,line_effect:{...receipt.line_effect,version:3}},{...receipt,line_effect:{...receipt.line_effect,msisdn:'private'}}])assert.equal(result('portability.complete',complete,r),null)
})
test('active commercial roles use only user-scoped RPC; provider errors are redacted',async()=>{
 let active=true,calls=0;const s=new PortabilityServiceV1({resolve:async()=>active?{workspaceId:other,role:'member'}:null,rpc:async(name,args)=>{calls++;assert.equal(name,'portability_v1_command');assert.equal(args.p_workspace_id,other);return{data:receipt,error:null}}})
 assert.equal((await s.execute('portability.complete',complete)).ok,true);active=false;assert.equal((await s.execute('portability.complete',complete)).error,'access_denied');assert.equal(calls,1)
 const viewer=new PortabilityServiceV1({resolve:async()=>({workspaceId:other,role:'viewer'}),rpc:async()=>{throw Error('must not call')}});assert.equal((await viewer.execute('portability.complete',complete)).error,'access_denied')
 const fail=new PortabilityServiceV1({resolve:async()=>({workspaceId:other,role:'member'}),rpc:async()=>({data:null,error:{code:'40001',message:'private',details:'+12025550123'}})});assert.deepEqual(await fail.execute('portability.complete',complete),{ok:false,error:'conflict'})
})
test('portability HTTP is no-store, same-origin, and rejects spoofed actor',async()=>{
 const origin='https://synthetic.example.invalid',service=new PortabilityServiceV1({resolve:async()=>({workspaceId:other,role:'member'}),rpc:async()=>({data:receipt,error:null})})
 const req=(value=complete,o=origin)=>new Request(origin+'/api/portability/v1',{method:'POST',headers:{host:'synthetic.example.invalid',origin:o,'content-type':'application/json'},body:JSON.stringify({operation:'portability.complete',input:value})})
 const r=await portabilityHttpV1(req(),async()=>service,origin);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store')
 assert.equal((await portabilityHttpV1(req(complete,'https://foreign.example.invalid'),async()=>service,origin)).status,403)
 assert.equal((await portabilityHttpV1(req({...complete,actor_id:id}),async()=>service,origin)).status,400)
})
