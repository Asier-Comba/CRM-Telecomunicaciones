import test from 'node:test'
import assert from 'node:assert/strict'
import {parseSensitiveInputV1,parseSensitiveResultV1}from '../../src/lib/server/sensitive-runtime-v1.ts'
import {SensitiveServiceV1}from '../../src/lib/server/sensitive-service-v1.ts'
const id='10000000-0000-4000-8000-000000000001',input={entity_kind:'contact',entity_id:id,fields:['email']}
test('reveal is requested-field only and rejects arbitrary table/actor/field selection',()=>{
 assert.ok(parseSensitiveInputV1(input));for(const v of [{...input,fields:['password']},{...input,fields:['email','email']},{...input,actor_id:id},{...input,entity_kind:'table'},{...input,fields:[]}])assert.equal(parseSensitiveInputV1(v),null)
 const result={contract_version:'sensitive.v1',operation:'sensitive.get',entity_kind:'contact',entity_id:id,values:{email:'synthetic@example.invalid'}};assert.ok(parseSensitiveResultV1(input,result));assert.equal(parseSensitiveResultV1(input,{...result,values:{...result.values,phone:'000000000'}}),null)
})
test('reveal role matrix rejects viewer/contact and member/fiscal before RPC',async()=>{
 for(const [role,request]of [['viewer',input],['member',{entity_kind:'customer',entity_id:id,fields:['fiscal_id']}]]){const s=new SensitiveServiceV1({resolve:async()=>({workspaceId:id,role}),rpc:async()=>{throw Error('must not run')}});assert.equal((await s.get(request)).error,'access_denied')}
})
test('reveal rechecks current membership and never trusts extra upstream fields',async()=>{
 let active=true;const s=new SensitiveServiceV1({resolve:async()=>active?{workspaceId:id,role:'member'}:null,rpc:async()=>({data:{contract_version:'sensitive.v1',operation:'sensitive.get',entity_kind:'contact',entity_id:id,values:{email:'synthetic@example.invalid',phone:'forbidden'}},error:null})});assert.equal((await s.get(input)).error,'internal_safe');active=false;assert.equal((await s.get(input)).error,'access_denied')
})
