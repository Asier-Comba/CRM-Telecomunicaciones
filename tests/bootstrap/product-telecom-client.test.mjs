import test from 'node:test'
import assert from 'node:assert/strict'
import {IntegratedLocalProductRepository,SyntheticProductRepository} from '../../src/features/product/integration/repository.ts'
const id='10000000-0000-4000-8000-000000000001'
const counts={customer_id:id,contacts:1,contracts:2,services:3,lines:4,renewals:5,permanences:6,opportunities:7,tasks:8,meetings:9,cases:10,documents:null,billing:null,activity:11,portabilities:12,sims:13}
test('Customer360 uses exact summary with null restricted counts and cookie endpoint',async()=>{
 const repository=new IntegratedLocalProductRepository(async(path,init)=>{assert.equal(path,'/api/telecom/reads/v1');assert.equal(init.credentials,'same-origin');assert.equal(init.cache,'no-store');assert.deepEqual(JSON.parse(init.body),{operation:'customer360.summary',input:{customer_id:id}});return Response.json({ok:true,data:{contract_version:'telecom.reads.v1',operation:'customer360.summary',as_of:'2026-10-06',record:counts}})})
 const r=await repository.telecom('customer360.summary',{customer_id:id});assert.equal(r.record.lines,4);assert.equal(r.record.billing,null)
})
test('human SIM writes validate the data envelope and exact command receipt',async()=>{
 const input={command_id:id,customer_id:id,operator_id:id,kind:'physical',display_label:'Synthetic SIM'},receipt={contract_version:'sim.v1',operation:'sim.create',command_id:id,id,version:1,status:'prepared',source:'manual',association_id:null,replacement_id:null,replacement_version:null,replacement_status:null,replacement_association_id:null}
 let requests=0;const repository=new IntegratedLocalProductRepository(async(path,init)=>{requests++;assert.equal(path,'/api/sims/v1');assert.deepEqual(JSON.parse(init.body).input,input);return Response.json({ok:true,data:receipt})})
 assert.equal((await repository.telecom('sim.create',input)).id,id);assert.equal(requests,1)
 const wrong=new IntegratedLocalProductRepository(async()=>Response.json({ok:true,receipt}));await assert.rejects(wrong.telecom('sim.create',input),e=>e.code==='internal_safe')
})
test('telecom DTO boundary rejects extra private data, wrong identity and invalid input before HTTP',async()=>{
 for(const record of [{...counts,email:'private@example.invalid'},{...counts,customer_id:'10000000-0000-4000-8000-000000000002'}]){const r=new IntegratedLocalProductRepository(async()=>Response.json({ok:true,data:{contract_version:'telecom.reads.v1',operation:'customer360.summary',as_of:'2026-10-06',record}}));await assert.rejects(r.telecom('customer360.summary',{customer_id:id}),e=>e.code==='internal_safe')}
 let called=false;const r=new IntegratedLocalProductRepository(async()=>{called=true;return Response.json({})});await assert.rejects(r.telecom('case.list',{after_id:null}),e=>e.code==='validation');assert.equal(called,false)
})
test('revoked authority and unavailable synthetic domains never become empty data',async()=>{
 const r=new IntegratedLocalProductRepository(async()=>Response.json({ok:false,error:'access_denied'},{status:403}));await assert.rejects(r.telecom('sim.list',{}),e=>e.code==='access_denied');await assert.rejects(new SyntheticProductRepository().telecom('sim.list',{}),e=>e.code==='unavailable')
})

import {customerCollectionIdentity} from '../../src/features/customers/customer-identity.ts'
test('read-only exact customer identity is bounded, verifies ID and never calls privileged editor',async()=>{
 const row={id,version:1,display_name:'Visible identity',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null};let calls=0
 const repository={collection:async(op,input)=>{calls++;assert.equal(op,'customer.list');assert.deepEqual(input,{limit:1,sort:'id_asc',after_id:'10000000-0000-4000-8000-000000000000'});return{items:[row]}}}
 assert.equal((await customerCollectionIdentity(repository,id)).display_name,'Visible identity');assert.equal(calls,1)
 await assert.rejects(customerCollectionIdentity({collection:async()=>({items:[{...row,id:'10000000-0000-4000-8000-000000000002'}]})},id),e=>e.code==='not_found')
 await assert.rejects(customerCollectionIdentity(repository,'invalid'),e=>e.code==='validation');assert.equal(calls,1)
})

const equipment={id,version:1,customer_id:id,contract_id:null,service_id:null,line_id:null,commitment_id:null,kind:'router',manufacturer:'Synthetic',model:'Router 1',commercial_description:null,status:'prepared',purchased_on:null,assigned_on:null,returned_on:null,replaced_on:null,cancelled_on:null,replaces_equipment_id:null,replaced_by_id:null,source:'manual'}
test('equipment reads use normal cookies and closed scoped rows; private fields and foreign rows fail',async()=>{
 const input={customer_id:id,limit:20};let calls=0
 const r=new IntegratedLocalProductRepository(async(path,init)=>{calls++;assert.equal(path,'/api/telecom/equipment/v1');assert.equal(init.credentials,'same-origin');assert.equal(init.cache,'no-store');assert.deepEqual(JSON.parse(init.body),{operation:'equipment.list',input});return Response.json({ok:true,data:{contract_version:'equipment.v1',operation:'equipment.list',items:[equipment],next_id:null}})})
 assert.equal((await r.telecom('equipment.list',input)).items[0].model,'Router 1')
 for(const row of [{...equipment,imei:'private'},{...equipment,customer_id:'10000000-0000-4000-8000-000000000002'}]){const wrong=new IntegratedLocalProductRepository(async()=>Response.json({ok:true,data:{contract_version:'equipment.v1',operation:'equipment.list',items:[row],next_id:null}}));await assert.rejects(wrong.telecom('equipment.list',input),e=>e.code==='internal_safe')}
 await assert.rejects(r.telecom('equipment.list',{workspace_id:id}),e=>e.code==='validation');assert.equal(calls,1)
})
test('equipment write checks exact CAS receipt, current denial and uncertain same-intent retry',async()=>{
 const input={command_id:id,id,expected_version:1,event_on:'2026-10-01'},receipt={contract_version:'equipment.v1',operation:'equipment.assign',command_id:id,id,version:2,status:'assigned',source:'manual',replacement_id:null,replacement_version:null},bodies=[]
 const r=new IntegratedLocalProductRepository(async(path,init)=>{assert.equal(path,'/api/telecom/equipment/v1');bodies.push(init.body);if(bodies.length===1)throw Error('lost response');return Response.json({ok:true,data:receipt})})
 await assert.rejects(r.telecom('equipment.assign',input),e=>e.code==='transport_uncertain');assert.equal((await r.telecom('equipment.assign',input)).version,2);assert.equal(bodies[0],bodies[1])
 const wrong=new IntegratedLocalProductRepository(async()=>Response.json({ok:true,data:{...receipt,version:3}}));await assert.rejects(wrong.telecom('equipment.assign',input),e=>e.code==='internal_safe')
 const denied=new IntegratedLocalProductRepository(async()=>Response.json({ok:false,error:'access_denied'},{status:403}));await assert.rejects(denied.telecom('equipment.assign',input),e=>e.code==='access_denied')
})
