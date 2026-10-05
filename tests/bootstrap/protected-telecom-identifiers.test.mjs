import test from 'node:test'
import assert from 'node:assert/strict'
import {parseIdentifierInputV1 as input,parseIdentifierResultV1 as result}from '../../src/lib/server/identifiers-runtime-v1.ts'
import {IdentifierServiceV1}from '../../src/lib/server/identifiers-service-v1.ts'
import {parseSensitiveInputV1,parseSensitiveResultV1}from '../../src/lib/server/sensitive-runtime-v1.ts'
const id='81000000-0000-4000-8000-000000000001',entity='82000000-0000-4000-8000-000000000001',w='83000000-0000-4000-8000-000000000001'
const create={command_id:id,entity_kind:'line',entity_id:entity,identifier_kind:'msisdn',canonical_value:'+12025550123'}
const record={id,entity_kind:'line',entity_id:entity,identifier_kind:'msisdn',masked_display:'••••123',status:'active',source:'manual',valid_from:'2026-10-05T20:00:00Z',valid_until:null,version:1}
test('canonical number is explicit; ambiguous formats and cross-kind inputs rejected',()=>{
 assert.deepEqual(input('identifier.create_manual',create),create)
 for(const canonical_value of ['2025550123','+1 202 555 0123','0012025550123','+012025550123','+12025550123\n'])assert.equal(input('identifier.create_manual',{...create,canonical_value}),null)
 assert.equal(input('identifier.create_manual',{...create,identifier_kind:'circuit_reference'}),null)
 assert.equal(input('identifier.create_manual',{...create,source:'integration'}),null)
 const access={...create};let used=false;Object.defineProperty(access,'canonical_value',{enumerable:true,get(){used=true;return create.canonical_value}});assert.equal(input('identifier.create_manual',access),null);assert.equal(used,false)
})
test('safe masked DTO is closed and pagination ordered',()=>{
 const i={entity_kind:'line',entity_id:entity,limit:1},v={contract_version:'identifiers.v1',operation:'identifier.list',items:[record],next_id:id}
 assert.ok(result('identifier.list',i,v))
 assert.equal(result('identifier.list',i,{...v,items:[{...record,canonical_value:create.canonical_value}]}),null)
 assert.equal(result('identifier.list',i,{...v,items:[{...record,masked_display:create.canonical_value}]}),null)
 assert.equal(result('identifier.list',{...i,after_id:id},v),null)
 assert.equal(result('identifier.list',i,{...v,next_id:entity}),null)
})
test('receipt cannot leak a value and retirement requires exact version',()=>{
 const receipt={contract_version:'identifiers.v1',operation:'identifier.create_manual',command_id:id,id,version:1,status:'active'}
 assert.ok(result('identifier.create_manual',create,receipt))
 assert.equal(result('identifier.create_manual',create,{...receipt,canonical_value:create.canonical_value}),null)
 assert.equal(result('identifier.retire',{id,command_id:id,expected_version:1},{...receipt,operation:'identifier.retire',version:3,status:'retired'}),null)
})
test('requested reveal returns only canonical field; viewer cannot invoke write',async()=>{
 const reveal={entity_kind:'telecom_identifier',entity_id:id,fields:['canonical_value']}
 assert.ok(parseSensitiveInputV1(reveal));assert.equal(parseSensitiveInputV1({...reveal,fields:['canonical_value','phone']}),null)
 assert.ok(parseSensitiveResultV1(reveal,{contract_version:'sensitive.v1',operation:'sensitive.get',...reveal,values:{canonical_value:create.canonical_value},fields:undefined})===null)
 const valid={contract_version:'sensitive.v1',operation:'sensitive.get',entity_kind:'telecom_identifier',entity_id:id,values:{canonical_value:create.canonical_value}}
 assert.ok(parseSensitiveResultV1(reveal,valid));assert.equal(parseSensitiveResultV1(reveal,{...valid,values:{canonical_value:create.canonical_value,phone:'raw'}}),null)
 let calls=0;const s=new IdentifierServiceV1({resolve:async()=>({workspaceId:w,role:'viewer'}),rpc:async()=>{calls++;return{data:null,error:null}}})
 assert.equal((await s.execute('identifier.create_manual',create)).error,'access_denied');assert.equal(calls,0)
})
test('current DB denial and provider errors are bounded codes',async()=>{
 let code='42501';const s=new IdentifierServiceV1({resolve:async()=>({workspaceId:w,role:'member'}),rpc:async()=>({data:null,error:{code,details:create.canonical_value}})})
 assert.deepEqual(await s.execute('identifier.create_manual',create),{ok:false,error:'access_denied'})
 code='40001';assert.deepEqual(await s.execute('identifier.create_manual',create),{ok:false,error:'conflict'})
 code='XX000';assert.deepEqual(await s.execute('identifier.create_manual',create),{ok:false,error:'internal_safe'})
})
