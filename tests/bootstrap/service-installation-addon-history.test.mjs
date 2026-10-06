import test from'node:test'
import assert from'node:assert/strict'
import{parseServiceCommercialInputV1 as input,parseServiceCommercialReceiptV1 as receipt,parseServiceCommercialReadV1 as read}from'../../src/lib/server/telecom-service-commercial-runtime-v1.ts'
import{ServiceCommercialServiceV1}from'../../src/lib/server/telecom-service-commercial-service-v1.ts'
import{serviceCommercialHttpV1}from'../../src/lib/server/telecom-service-commercial-http-v1.ts'
const id='a1000000-0000-4000-8000-000000000001',other='a1000000-0000-4000-8000-000000000002',key='71000000-0000-4000-8000-000000000001'
const installation={command_id:key,service_id:id,expected_service_version:1,expected_details_version:0,site_label:'Synthetic Site',installation_contact_id:null,activation_target_on:'2026-10-20'}
const assigned={command_id:key,service_id:id,expected_service_version:1,component_position:2,quantity:1,valid_from:'2026-01-01',valid_until:null}
const r=(operation='service.installation_set',patch={})=>({contract_version:'telecom.service_commercial.v1',operation,command_id:key,id:operation==='service.installation_set'?id:other,service_id:id,service_version:2,version:1,status:operation==='service.installation_set'?'recorded':'assigned',...patch})
const row=(patch={})=>({id:other,version:1,service_id:id,plan_version_id:id,component_position:2,addon_code:'static_ip',quantity:1,valid_from:'2026-01-01',valid_until:null,ended_on:null,source:'manual',timing_state:'current',...patch})
const list=(rows=[row()],patch={})=>({contract_version:'telecom.service_commercial.v1',operation:'service.addon_list',service_id:id,as_of:'2026-10-06',items:rows,next_id:null,...patch})
const get=(patch={})=>({contract_version:'telecom.service_commercial.v1',operation:'service.installation_get',service_id:id,service_version:2,service_kind:'fiber',source:'manual',plan_version_id:id,activated_on:null,ended_on:null,installation:{version:1,site_label:'Synthetic Site',installation_contact_id:null,activation_target_on:'2026-10-20',source:'manual'},...patch})
test('commercial service inputs require explicit CAS and closed bounded fields without provider credentials or fabricated activation',()=>{
 assert.ok(input('service.installation_set',installation));assert.ok(input('service.addon_assign',assigned))
 for(const patch of[{expected_service_version:0},{expected_details_version:-1},{site_label:'x'.repeat(101)},{activation_target_on:'2026-02-31'},{source:'integration'},{activated_on:'2026-10-20'},{circuit_reference:'private'},{credentials:'private'}])assert.equal(input('service.installation_set',{...installation,...patch}),null)
 assert.equal(input('service.addon_assign',{...assigned,component_position:9}),null);assert.equal(input('service.addon_assign',{...assigned,quantity:101}),null);assert.equal(input('service.addon_assign',{...assigned,valid_until:'2025-12-31'}),null)
})
test('service receipts recover exact historical versions and reject fabricated identity or raw labels',()=>{
 assert.ok(receipt('service.installation_set',installation,r()))
 for(const patch of[{service_id:other},{service_version:3},{version:2},{id:other},{site_label:'private'},{status:'active'}])assert.equal(receipt('service.installation_set',installation,r('service.installation_set',patch)),null)
 assert.ok(receipt('service.addon_assign',assigned,r('service.addon_assign')))
 const ended={command_id:key,service_id:id,id:other,expected_service_version:2,expected_version:1,ended_on:'2026-10-05'}
 assert.ok(receipt('service.addon_end',ended,r('service.addon_end',{service_version:3,version:2,status:'ended'})))
})
test('installation reader separates planned facts from confirmed activation and keeps precise addresses and identifiers out',()=>{
 assert.ok(read('service.installation_get',{service_id:id},get()));assert.ok(read('service.installation_get',{service_id:id},get({installation:null})))
 for(const patch of[{circuit_reference:'private'},{service_id:other},{service_kind:'mobile'}])assert.equal(read('service.installation_get',{service_id:id},get(patch)),null)
 assert.equal(read('service.installation_get',{service_id:id},get({installation:{...get().installation,source:'integration'}})),null)
 assert.equal(read('service.installation_get',{service_id:id},get({installation:{...get().installation,address:'private'}})),null)
 assert.ok(read('service.installation_get',{service_id:id},get({activated_on:'1999-01-01'})))
})
test('addon history timing is derived and old versions validity quantity and registered component identity stay exact',()=>{
 assert.ok(read('service.addon_list',{service_id:id},list()));assert.ok(read('service.addon_list',{service_id:id},list([row({version:2,ended_on:'2026-10-05',timing_state:'ended'})])))
 for(const patch of[{addon_code:'arbitrary'},{component_position:9},{quantity:101},{valid_from:'2026-02-31'},{ended_on:'2025-12-31'},{timing_state:'active'},{source:'provider'},{canonical_value:'private'}])assert.equal(read('service.addon_list',{service_id:id},list([row(patch)])),null)
 assert.equal(read('service.addon_list',{service_id:id},list([row({valid_from:'2026-10-20'})])),null)
})
test('addon pagination requires exact final cursor and stable distinct UUIDs',()=>{
 assert.ok(read('service.addon_list',{service_id:id,limit:1},list(undefined,{next_id:other})))
 assert.equal(read('service.addon_list',{service_id:id,limit:1},list(undefined,{next_id:id})),null)
 assert.equal(read('service.addon_list',{service_id:id,after_id:other},list()),null)
 assert.equal(read('service.addon_list',{service_id:id},list([row(),row()])),null)
})
test('commercial member writes viewer only reads and current membership is rechecked before exact replay',async()=>{
 let active=true,calls=0;const port={resolve:async()=>active?{workspaceId:id,role:'member'}:null,rpc:async(name,args)=>{calls++;assert.equal(name,'service_commercial_v1_command');assert.equal(args.p_workspace_id,id);return{data:r(),error:null}}}
 const s=new ServiceCommercialServiceV1(port);assert.equal((await s.execute('service.installation_set',installation)).ok,true);active=false;assert.equal((await s.execute('service.installation_set',installation)).error,'access_denied');assert.equal(calls,1)
 const viewer=new ServiceCommercialServiceV1({resolve:async()=>({workspaceId:id,role:'viewer'}),rpc:async(name)=>{assert.equal(name,'service_commercial_v1_query');return{data:get(),error:null}}});assert.equal((await viewer.execute('service.installation_set',installation)).error,'access_denied');assert.equal((await viewer.execute('service.installation_get',{service_id:id})).ok,true)
})
test('commercial HTTP redacts raw backend payloads and returns no-store scoped conflict',async()=>{
 const s=new ServiceCommercialServiceV1({resolve:async()=>({workspaceId:id,role:'member'}),rpc:async()=>({data:null,error:{code:'40001',message:'private',details:'site'}})})
 const origin='https://synthetic.example.invalid',r=await serviceCommercialHttpV1(new Request(origin+'/api/telecom/services/v1',{method:'POST',headers:{host:'synthetic.example.invalid',origin,'content-type':'application/json'},body:JSON.stringify({operation:'service.installation_set',input:installation})}),async()=>s,origin);assert.equal(r.status,409);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{ok:false,error:'conflict'})
})
