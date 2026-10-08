import test from 'node:test'
import assert from 'node:assert/strict'
import {parseEquipmentInputV1 as input,parseEquipmentReceiptV1 as receipt,parseEquipmentReadV1 as read,validEquipmentRowV1 as valid}from '../../src/lib/server/equipment-runtime-v1.ts'
import {EquipmentServiceV1}from '../../src/lib/server/equipment-service-v1.ts'
const id='10000000-0000-0000-0000-000000000001',other='20000000-0000-0000-0000-000000000002',key='30000000-0000-0000-0000-000000000003'
const create={command_id:key,customer_id:id,contract_id:null,service_id:null,line_id:null,commitment_id:null,kind:'router',manufacturer:'Synthetic Maker',model:'Synthetic Model',commercial_description:null,purchased_on:'2026-01-01',assigned_on:null}
const replace={command_id:key,id,expected_version:2,event_on:'2026-01-03',manufacturer:'Synthetic New Maker',model:'Synthetic New Model',commercial_description:null,purchased_on:'2026-01-02',commitment_id:null}
const row={id,version:2,customer_id:other,contract_id:null,service_id:null,line_id:null,commitment_id:null,kind:'router',manufacturer:'Synthetic Maker',model:'Synthetic Model',commercial_description:null,status:'assigned',purchased_on:'2026-01-01',assigned_on:'2026-01-01',returned_on:null,replaced_on:null,cancelled_on:null,replaces_equipment_id:null,replaced_by_id:null,source:'manual'}
test('equipment normal inputs are bounded and reject secrets, serials, authority and impossible ancestry/date',()=>{
 assert.ok(input('equipment.create',create));assert.ok(input('equipment.replace',replace));for(const patch of[{serial:'private'},{imei:'private'},{password:'private'},{source:'integration'},{manufacturer:''},{kind:'network_core'},{assigned_on:'2100-01-01'},{service_id:id},{line_id:id},{commitment_id:id}])assert.equal(input('equipment.create',{...create,...patch}),null)
 assert.equal(input('equipment.replace',{...replace,purchased_on:'2026-01-04'}),null);assert.equal(input('equipment.list',{limit:101}),null);assert.equal(input('equipment.history',{id,after_version:0}),null)
})
test('replacement receipt binds exact old resource CAS and fresh successor identity without metadata echo',()=>{
 const r={contract_version:'equipment.v1',operation:'equipment.replace',command_id:key,id,version:3,status:'replaced',source:'manual',replacement_id:other,replacement_version:1};assert.ok(receipt('equipment.replace',replace,r));for(const patch of[{version:4},{id:other},{replacement_id:id},{replacement_version:2},{source:'integration'},{manufacturer:'private'}])assert.equal(receipt('equipment.replace',replace,{...r,...patch}),null)
})
test('equipment rows preserve lifecycle dates and historical pointers; generic raw identifiers are rejected',()=>{
 assert.ok(valid(row));assert.ok(valid({...row,status:'returned',returned_on:'2026-01-02'}));assert.ok(valid({...row,status:'replaced',replaced_on:'2026-01-02',replaced_by_id:other}));for(const patch of[{status:'returned',returned_on:null},{status:'replaced',replaced_on:'2026-01-02',replaced_by_id:null},{assigned_on:'2025-12-31'},{replaces_equipment_id:id},{serial:'private'},{status:'active'}])assert.equal(valid({...row,...patch}),false)
})
test('equipment collections and append-only event pages have coherent closed stable keysets',()=>{
 const page={contract_version:'equipment.v1',operation:'equipment.list',items:[row],next_id:id};assert.ok(read('equipment.list',{customer_id:other,limit:1},page));assert.equal(read('equipment.list',{customer_id:id,limit:1},page),null);assert.equal(read('equipment.list',{customer_id:other,after_id:id,limit:1},page),null)
 const event={version:1,operation:'equipment.create',status:'assigned',event_on:'2026-01-01',related_equipment_id:null,actor_user_id:other,created_at:'2026-01-01T10:00:00+00:00'},history={contract_version:'equipment.v1',operation:'equipment.history',id,items:[event],next_version:1};assert.ok(read('equipment.history',{id,limit:1},history));assert.equal(read('equipment.history',{id,after_version:1,limit:1},history),null);assert.equal(read('equipment.history',{id,limit:1},{...history,items:[{...event,operation:'equipment.return',status:'prepared'}]}),null)
})
test('equipment viewer is read-only and current revoked scope prevents replay before RPC',async()=>{
 let active=true,calls=0;const viewer=new EquipmentServiceV1({resolve:async()=>active?{workspaceId:id,role:'viewer'}:null,rpc:async()=>{calls++;return{data:{contract_version:'equipment.v1',operation:'equipment.get',record:row},error:null}}});assert.equal((await viewer.execute('equipment.create',create)).error,'access_denied');assert.equal((await viewer.execute('equipment.get',{id})).ok,true);active=false;assert.equal((await viewer.execute('equipment.get',{id})).error,'access_denied');assert.equal(calls,1)
})
