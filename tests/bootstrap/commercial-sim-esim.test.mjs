import test from 'node:test'
import assert from 'node:assert/strict'
import {parseSimInputV1 as input,parseSimResultV1 as result}from '../../src/lib/server/sim-runtime-v1.ts'
import {parseIdentifierInputV1}from '../../src/lib/server/identifiers-runtime-v1.ts'
import {SimServiceV1}from '../../src/lib/server/sim-service-v1.ts'
import {simHttpV1}from '../../src/lib/server/sim-http-v1.ts'
const id='a1000000-0000-4000-8000-000000000001',other='a1000000-0000-4000-8000-000000000002',third='a1000000-0000-4000-8000-000000000003'
const replace={command_id:id,id,expected_version:3,replacement_sim_id:other,expected_replacement_version:1,expected_line_version:1,replacement_status:'active',evidence_source:'manual',provider_confirmation:'confirmed_active'}
const receipt={contract_version:'sim.v1',operation:'sim.replace',command_id:id,id,version:4,status:'replaced',source:'manual',association_id:third,replacement_id:other,replacement_version:2,replacement_status:'active',replacement_association_id:other}
const row={id,version:1,customer_id:id,operator_id:id,kind:'physical',display_label:'Synthetic SIM',status:'prepared',source:'manual',masked_iccid:null,masked_eid:null,assigned_line_id:null,activated_at:null,replaced_at:null,deactivated_at:null,cancelled_at:null,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'}
const page=items=>({contract_version:'sim.v1',operation:'sim.list',items,next_id:null})
test('SIM identifiers use the normalized protected namespace and refuse formatted ICCID/EID or PIN',()=>{
 const i={command_id:id,entity_kind:'sim',entity_id:id,identifier_kind:'iccid',canonical_value:'8900000000000000180'};assert.ok(parseIdentifierInputV1('identifier.create_manual',i))
 for(const patch of [{canonical_value:'89 00000000000000180'},{canonical_value:'1900000000000000180'},{identifier_kind:'pin'},{identifier_kind:'eid',canonical_value:'123'}])assert.equal(parseIdentifierInputV1('identifier.create_manual',{...i,...patch}),null)
 assert.ok(parseIdentifierInputV1('identifier.create_manual',{...i,identifier_kind:'eid',canonical_value:'89'+'0'.repeat(27)+'180'}))
})
test('SIM replacement requires explicit paired manual activation acknowledgement and both CAS versions',()=>{
 assert.ok(input('sim.replace',replace));for(const patch of [{provider_confirmation:'not_recorded'},{evidence_source:'integration'},{replacement_sim_id:id},{expected_replacement_version:0},{expected_line_version:null},{iccid:'private'},{pin:'1234'}])assert.equal(input('sim.replace',{...replace,...patch}),null)
 assert.ok(input('sim.replace',{...replace,replacement_status:'assigned',provider_confirmation:'not_recorded'}))
 assert.equal(input('sim.activate',{command_id:id,id,expected_version:1,expected_line_version:1,evidence_source:'manual',provider_confirmation:'not_recorded'}),null)
})
test('SIM normal records are mask-only and retain a coherent resource/association state',()=>{
 assert.ok(result('sim.list',{},page([row])));for(const r of [{...row,iccid:'private'},{...row,masked_iccid:'8900000000000000180'},{...row,status:'active'},{...row,masked_eid:'••••180'},{...row,assigned_line_id:other}])assert.equal(result('sim.list',{},page([r])),null)
 assert.equal(result('sim.list',{customer_id:other},page([row])),null);assert.equal(result('sim.list',{},page([row,row])),null)
})
test('replacement receipt preserves old resource and explicit new resource CAS without guessed identities',()=>{
 assert.ok(result('sim.replace',replace,receipt));for(const r of [{...receipt,replacement_version:3},{...receipt,replacement_status:'assigned'},{...receipt,source:'integration'},{...receipt,association_id:null},{...receipt,iccid:'private'}])assert.equal(result('sim.replace',replace,r),null)
})
test('SIM history remains masked, closed and ordered under keyset pagination',()=>{
 const h={contract_version:'sim.v1',operation:'sim.history',line_id:third,items:[{id,sim_id:id,line_id:third,kind:'physical',masked_iccid:'••••180',masked_eid:null,status:'replaced',assigned_at:'2026-01-01T00:00:00Z',activated_at:'2026-01-02T00:00:00Z',ended_at:'2026-01-03T00:00:00Z',replacement_sim_id:other}],next_id:null}
 assert.ok(result('sim.history',{line_id:third},h));assert.equal(result('sim.history',{line_id:third,after_id:id},h),null);assert.equal(result('sim.history',{line_id:third},{...h,items:[{...h.items[0],canonical_value:'private'}]}),null)
 assert.equal(input('sim.history',{line_id:third,offset:1}),null);assert.equal(input('sim.list',{limit:101}),null)
})
test('SIM member role uses current user RPC; viewer mutations and revoked scope fail before RPC',async()=>{
 let active=true,calls=0;const s=new SimServiceV1({resolve:async()=>active?{workspaceId:third,role:'member'}:null,rpc:async(name,args)=>{calls++;assert.equal(name,'sim_v1_command');assert.equal(args.p_workspace_id,third);return{data:receipt,error:null}}})
 assert.equal((await s.execute('sim.replace',replace)).ok,true);active=false;assert.equal((await s.execute('sim.replace',replace)).error,'access_denied');assert.equal(calls,1)
 const viewer=new SimServiceV1({resolve:async()=>({workspaceId:third,role:'viewer'}),rpc:async()=>{throw Error('must not call')}});assert.equal((await viewer.execute('sim.replace',replace)).error,'access_denied')
})
test('SIM HTTP is no-store, rejects caller tenant and never echoes a provider error payload',async()=>{
 const origin='https://synthetic.example.invalid',s=new SimServiceV1({resolve:async()=>({workspaceId:third,role:'member'}),rpc:async()=>({data:null,error:{code:'40001',message:'private iccid',details:'private'}})})
 const req=(i=replace,o=origin)=>new Request(origin+'/api/sims/v1',{method:'POST',headers:{host:'synthetic.example.invalid',origin:o,'content-type':'application/json'},body:JSON.stringify({operation:'sim.replace',input:i})})
 const r=await simHttpV1(req(),async()=>s,origin);assert.equal(r.status,409);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{ok:false,error:'conflict'})
 assert.equal((await simHttpV1(req({...replace,workspace_id:id}),async()=>s,origin)).status,400);assert.equal((await simHttpV1(req(replace,'https://foreign.example.invalid'),async()=>s,origin)).status,403)
})
