import test from 'node:test'
import assert from 'node:assert/strict'
import {parseCatalogInputV1 as input,parseCatalogResultV1 as result}from '../../src/lib/server/catalog-runtime-v1.ts'
import {CatalogServiceV1}from '../../src/lib/server/catalog-service-v1.ts'
const id='91000000-0000-4000-8000-000000000001',plan='92000000-0000-4000-8000-000000000001'
const components=[{component_kind:'base',service_kind:'mobile',addon_code:null,quantity:1},{component_kind:'base',service_kind:'fiber',addon_code:null,quantity:1}]
const entitlements=[{code:'unlimited_voice',component_position:1,integer_value:null,boolean_value:true,text_value:null},{code:'download_mbps',component_position:2,integer_value:'600',boolean_value:null,text_value:null},{code:'promotion_months',component_position:null,integer_value:'6',boolean_value:null,text_value:null}]
const create={command_id:id,plan_id:plan,expected_version:1,valid_from:'2026-01-01',valid_until:'2026-12-31',currency:'EUR',recurring_amount_minor:'9007199254740993',one_time_amount_minor:'9900',is_bundle:true,components,entitlements}
test('typed commercial input preserves exact bigint and rejects arbitrary facts',()=>{
 assert.ok(input('plan_version.create',create));assert.equal(input('plan_version.create',{...create,recurring_amount_minor:9007199254740993}),null)
 for(const extra of [{code:'unknown',integer_value:'1'}, {code:'promotion_months',integer_value:'61'},{code:'access_technology',integer_value:null,text_value:'custom'},{component_position:3}])assert.equal(input('plan_version.create',{...create,entitlements:[{...entitlements[2],...extra}]}),null)
 assert.equal(input('plan_version.create',{...create,components:[components[0]]}),null)
 assert.equal(input('plan_version.create',{...create,valid_from:'2026-02-30'}),null)
 assert.equal(input('plan_version.create',{...create,entitlements:[entitlements[0],entitlements[0]]}),null)
})
test('unlimited entitlements cannot also specify a capped allowance',()=>{
 const cap={code:'voice_minutes',component_position:1,integer_value:'600',boolean_value:null,text_value:null}
 assert.equal(input('plan_version.create',{...create,entitlements:[entitlements[0],cap]}),null)
 assert.ok(input('plan_version.create',{...create,entitlements:[{...entitlements[0],boolean_value:false},cap]}))
})
test('hostile getters are not read and identity/version inputs remain closed',()=>{
 let used=false;const v={...create};Object.defineProperty(v,'components',{enumerable:true,get(){used=true;return components}});assert.equal(input('plan_version.create',v),null);assert.equal(used,false)
 assert.equal(input('operator.update',{command_id:id,id,expected_version:0,display_name:'Safe'}),null)
 assert.equal(input('operator.create',{command_id:id,code:'synthetic',display_name:'Safe',source:'integration'}),null)
})
test('immutable publication receipt has exact parent CAS and bounded safe fields',()=>{
 const v={contract_version:'catalog.v1',operation:'plan_version.create',command_id:id,id,version:1,status:'published',plan_id:plan,parent_version:2,version_number:1}
 assert.ok(result('plan_version.create',create,v));assert.equal(result('plan_version.create',create,{...v,parent_version:3}),null);assert.equal(result('plan_version.create',create,{...v,notes:'secret'}),null)
})
test('commercial output validates registered units/types and frozen components',()=>{
 const record={id,plan_id:plan,version_number:1,terms_status:'published',recurring_period:'month',currency:'EUR',valid_from:'2026-01-01',valid_until:'2026-12-31',recurring_amount_minor:'9007199254740993',one_time_amount_minor:'9900',is_bundle:true,components:components.map((c,i)=>({...c,position:i+1})),entitlements:entitlements.map((e,i)=>({...e,value_kind:i===0?'boolean':'integer',unit:i===0?null:i===1?'Mbps':'months'}))},v={contract_version:'catalog.v1',operation:'plan_version.terms_get',record}
 assert.ok(result('plan_version.terms_get',{id},v));assert.equal(result('plan_version.terms_get',{id},{...v,record:{...record,entitlements:[{...record.entitlements[1],unit:'made_up'}]}}),null)
 assert.equal(result('plan_version.terms_get',{id},{...v,record:{...record,provider_payload:{raw:true}}}),null)
})
test('legacy facts remain unrecorded rather than fabricated',()=>{
 const record={id,plan_id:plan,version_number:1,terms_status:'unrecorded',recurring_period:null,currency:'EUR',valid_from:'2026-01-01',valid_until:null,recurring_amount_minor:null,one_time_amount_minor:null,is_bundle:null,components:[],entitlements:[]},v={contract_version:'catalog.v1',operation:'plan_version.terms_get',record}
 assert.ok(result('plan_version.terms_get',{id},v));assert.equal(result('plan_version.terms_get',{id},{...v,record:{...record,is_bundle:false}}),null)
})
test('members consume commercial terms but cannot manage catalogue; revoked DB denial stays safe',async()=>{
 let calls=0;const s=new CatalogServiceV1({resolve:async()=>({workspaceId:plan,role:'member'}),rpc:async()=>{calls++;return{data:null,error:{code:'42501',details:'private'}}}})
 assert.deepEqual(await s.execute('plan_version.create',create),{ok:false,error:'access_denied'});assert.equal(calls,0)
 assert.deepEqual(await s.execute('plan_version.terms_get',{id}),{ok:false,error:'access_denied'});assert.equal(calls,1)
})
