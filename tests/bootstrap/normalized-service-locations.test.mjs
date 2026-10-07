import test from 'node:test'
import assert from 'node:assert/strict'
import {parseServiceLocationInputV1 as input,parseServiceLocationReceiptV1 as receipt,parseServiceLocationReadV1 as read}from '../../src/lib/server/service-location-runtime-v1.ts'
import {parseSensitiveInputV1,parseSensitiveResultV1}from '../../src/lib/server/sensitive-runtime-v1.ts'
import {ServiceLocationServiceV1}from '../../src/lib/server/service-location-service-v1.ts'
const id='10000000-0000-0000-0000-000000000001',other='20000000-0000-0000-0000-000000000002',key='30000000-0000-0000-0000-000000000003'
const create={command_id:key,customer_id:id,label:'Synthetic Site',address_line1:'Synthetic Street 42',address_line2:null,postal_code:'00000',city:'Synthetic City',region:null,country:'ES'}
const assign={command_id:key,service_id:id,location_id:other,expected_service_version:1,expected_details_version:0}
const row={id,customer_id:other,version:1,label:'Synthetic Site',country:'ES',source:'manual'}
test('location creation is closed and bounded; address cannot enter safe reads or provider credentials',()=>{
 assert.ok(input('service_location.create',create));for(const patch of[{address_line1:'x'.repeat(301)},{country:'es'},{postal_code:''},{address_line2:'\n'},{secret:'unsafe'},{source:'integration'}])assert.equal(input('service_location.create',{...create,...patch}),null)
 assert.ok(input('service_location.assign',assign));assert.ok(input('service_location.assign',{...assign,location_id:null}));assert.equal(input('service_location.assign',{...assign,expected_service_version:0}),null)
 const r={contract_version:'service_location.v1',operation:'service_location.get',record:row};assert.ok(read('service_location.get',{id},r));assert.equal(read('service_location.get',{id},{...r,record:{...row,address_line1:'private'}}),null)
})
test('location receipts preserve exact service and details CAS without address echo',()=>{
 const r={contract_version:'service_location.v1',operation:'service_location.assign',command_id:key,id,customer_id:other,service_id:id,service_version:2,version:1,status:'assigned'};assert.ok(receipt('service_location.assign',assign,r));for(const patch of[{version:2},{service_version:3},{id:other},{location_id:other},{status:'active'}])assert.equal(receipt('service_location.assign',assign,{...r,...patch}),null)
 const page={contract_version:'service_location.v1',operation:'service_location.list',items:[row],next_id:id};assert.ok(read('service_location.list',{customer_id:other,limit:1},page));assert.equal(read('service_location.list',{customer_id:other,limit:1,after_id:id},page),null)
})
test('precise address reveal is explicit requested-field authorization and excludes safe metadata or contact fields',()=>{
 const i={entity_kind:'service_location',entity_id:id,fields:['address_line1','address_line2','postal_code','city','region','country']};assert.ok(parseSensitiveInputV1(i));assert.equal(parseSensitiveInputV1({...i,fields:['label']}),null);assert.equal(parseSensitiveInputV1({...i,fields:['email']}),null)
 const requested={entity_kind:'service_location',entity_id:id,fields:['address_line1']};assert.ok(parseSensitiveResultV1(requested,{contract_version:'sensitive.v1',operation:'sensitive.get',entity_kind:'service_location',entity_id:id,values:{address_line1:create.address_line1}}));assert.equal(parseSensitiveResultV1(requested,{contract_version:'sensitive.v1',operation:'sensitive.get',entity_kind:'service_location',entity_id:id,values:{address_line1:create.address_line1,city:create.city}}),null)
})
test('viewer only reads location masks and revoked current scope blocks old command replay',async()=>{
 let active=true,calls=0;const viewer=new ServiceLocationServiceV1({resolve:async()=>active?{workspaceId:id,role:'viewer'}:null,rpc:async()=>{calls++;return{data:{contract_version:'service_location.v1',operation:'service_location.get',record:row},error:null}}});assert.equal((await viewer.execute('service_location.create',create)).error,'access_denied');assert.equal((await viewer.execute('service_location.get',{id})).ok,true);active=false;assert.equal((await viewer.execute('service_location.get',{id})).error,'access_denied');assert.equal(calls,1)
})
