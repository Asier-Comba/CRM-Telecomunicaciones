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

import {attentionBucket,attentionHref} from '../../src/features/attention/presentation.ts'
import {minorAmount,amountBarPercent} from '../../src/features/billing/analytics-presentation.ts'
test('attention uses published reason/date facts and real supported normal destinations',()=>{
 const base={kind:'task',id,customer_id:id,owner_user_id:null,sort_on:'2026-10-07',due_on:'2026-10-07',status:'pending',reason_code:'task_overdue',priority:'normal'}
 assert.equal(attentionBucket(base,'2026-10-07'),'Requiere atención');assert.equal(attentionHref(base),'/calendar?task='+id)
 assert.equal(attentionBucket({...base,kind:'meeting',reason_code:'meeting_upcoming',sort_on:'2026-10-08'},'2026-10-07'),'Próximos días')
 assert.equal(attentionBucket({...base,kind:'opportunity',reason_code:'opportunity_missing_next_action',due_on:null},'2026-10-07'),'Hoy')
 assert.equal(attentionHref({...base,kind:'case',reason_code:'case_urgent'}),'/clients/'+id)
})
test('financial presentation preserves amounts beyond IEEE precision and bounded graph scale',()=>{
 assert.equal(minorAmount('900719925474099399','EUR'),'9.007.199.254.740.993,99 EUR')
 assert.equal(amountBarPercent('900719925474099399','900719925474099399'),100)
 assert.equal(amountBarPercent('450359962737049699','900719925474099399'),49.99)
 assert.equal(amountBarPercent('0','0'),0)
})

import {assigneeCollectionIdentity,stageCollectionIdentity} from '../../src/features/customers/customer-identity.ts'
test('ordinary commercial and stage names beyond first page use one exact bounded read, never foreign identity',async()=>{
 let calls=0;const row={user_id:id,display_name:'Commercial identity',role:'member'}
 const repository={collection:async(op,input)=>{calls++;assert.equal(op,'assignee.list');assert.deepEqual(input,{limit:1,sort:'id_asc',after_id:'10000000-0000-4000-8000-000000000000'});return{items:[row]}}}
 assert.equal((await assigneeCollectionIdentity(repository,id)).display_name,'Commercial identity');assert.equal(calls,1)
 await assert.rejects(assigneeCollectionIdentity({collection:async()=>({items:[{...row,user_id:'10000000-0000-4000-8000-000000000002'}]})},id),e=>e.code==='not_found')
 let stageCalls=0;assert.equal((await stageCollectionIdentity({stages:async input=>{stageCalls++;assert.deepEqual(input,{limit:1,after_id:'10000000-0000-4000-8000-000000000000'});return{items:[{id,display_name:'Scoped stage'}]}}},id)).display_name,'Scoped stage');assert.equal(stageCalls,1)
})

import {loadCollectionLabels} from '../../src/features/product/integration/collection-labels.ts'
test('page identity labels deduplicate repeated references and never cache authority across refresh',async()=>{
 let calls=0;const rows=Array.from({length:20},()=>({customer_id:id,operator_id:id,plan_version_id:id})),repository={collection:async(op)=>{calls++;return op==='customer.list'?{items:[{id,display_name:'Current customer'}]}:op==='operator.get'?{record:{display_name:'Current operator'}}:{record:{version_number:1,recurring_amount_minor:'1200',currency:'EUR',valid_from:'2026-01-01',valid_until:null}}}}
 const labels=await loadCollectionLabels(repository,rows);assert.equal(calls,3);assert.equal(labels.customer[id],'Current customer');assert.match(labels.plan_version[id],/12,00 EUR/)
 const revoked=await loadCollectionLabels({collection:async()=>{calls++;throw Error('authority revoked')}},rows);assert.equal(calls,6);assert.equal(revoked.customer[id],'Cliente no disponible');assert.equal(revoked.operator[id],'Operador no disponible')
})
test('page label loader bounds concurrency and stops queued reads after the page is disposed',async()=>{
 let inFlight=0,max=0,calls=0,active=true;const ids=Array.from({length:12},(_,i)=>'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0'))
 const repository={collection:async()=>{calls++;inFlight++;max=Math.max(max,inFlight);await new Promise(r=>setTimeout(r,2));active=false;inFlight--;return{record:{display_name:'Scoped operator'}}}}
 await loadCollectionLabels(repository,ids.map(operator_id=>({operator_id})),()=>active);assert.equal(max,4);assert.equal(calls,4)
})

test('location normal masked reads are closed and reject foreign customers and private address values',async()=>{
 const input={customer_id:id,limit:20},row={id,customer_id:id,version:1,label:'Synthetic site',country:'ES',source:'manual'}
 const run=value=>new IntegratedLocalProductRepository(async(path,init)=>{assert.equal(path,'/api/telecom/locations/v1');assert.equal(init.cache,'no-store');assert.equal(init.credentials,'same-origin');return Response.json({ok:true,data:{contract_version:'service_location.v1',operation:'service_location.list',items:[value],next_id:null}})})
 assert.equal((await run(row).telecom('service_location.list',input)).items[0].label,row.label)
 for(const bad of [{...row,address_line1:'Private Synthetic Street'},{...row,customer_id:'10000000-0000-4000-8000-000000000002'}])await assert.rejects(run(bad).telecom('service_location.list',input),e=>e.code==='internal_safe')
 let calls=0;const r=new IntegratedLocalProductRepository(async()=>{calls++;return Response.json({})});await assert.rejects(r.telecom('service_location.list',{...input,workspace_id:id}),e=>e.code==='validation');assert.equal(calls,0)
})
test('installation metadata excludes location assignment and preserves exact uncertain intent with live denial',async()=>{
 const input={command_id:id,service_id:id,expected_service_version:1,expected_details_version:0,site_label:'Synthetic Site',installation_contact_id:null,activation_target_on:'2026-10-09'},receipt={contract_version:'telecom.service_commercial.v1',operation:'service.installation_set',command_id:id,id,service_id:id,service_version:2,version:1,status:'recorded'},bodies=[]
 const r=new IntegratedLocalProductRepository(async(path,init)=>{assert.equal(path,'/api/telecom/services/v1');bodies.push(init.body);if(bodies.length===1)throw Error('lost response');return Response.json({ok:true,data:receipt})})
 await assert.rejects(r.telecom('service.installation_set',input),e=>e.code==='transport_uncertain');assert.equal((await r.telecom('service.installation_set',input)).service_version,2);assert.equal(bodies[0],bodies[1]);await assert.rejects(r.telecom('service.installation_set',{...input,location_id:null}),e=>e.code==='validation');assert.equal(bodies.length,2)
 const denied=new IntegratedLocalProductRepository(async()=>Response.json({ok:false,error:'access_denied'},{status:403}));await assert.rejects(denied.telecom('service_location.assign',{command_id:id,service_id:id,location_id:null,expected_service_version:2,expected_details_version:1}),e=>e.code==='access_denied')
})
test('sold addon read uses authoritative civil as-of and rejects invented timing or sensitive fields',async()=>{
 const row={id,version:1,service_id:id,plan_version_id:id,component_position:3,addon_code:'static_ip',quantity:1,valid_from:'2026-10-01',valid_until:null,ended_on:null,source:'manual',timing_state:'current'},read=items=>new IntegratedLocalProductRepository(async(path)=>{assert.equal(path,'/api/telecom/services/v1');return Response.json({ok:true,data:{contract_version:'telecom.service_commercial.v1',operation:'service.addon_list',service_id:id,as_of:'2026-10-08',items,next_id:null}})})
 assert.equal((await read([row]).telecom('service.addon_list',{service_id:id,limit:20})).items[0].plan_version_id,id)
 for(const bad of [{...row,timing_state:'planned'},{...row,canonical_value:'PRIVATE-SYNTHETIC'},{...row,service_id:'10000000-0000-4000-8000-000000000002'}])await assert.rejects(read([bad]).telecom('service.addon_list',{service_id:id,limit:20}),e=>e.code==='internal_safe')
})
