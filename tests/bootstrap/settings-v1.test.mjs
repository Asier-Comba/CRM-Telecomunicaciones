import test from 'node:test'
import assert from 'node:assert/strict'
import {parseSettingsInputV1,parseSettingsReadV1}from '../../src/lib/server/settings-runtime-v1.ts'
import {SettingsServiceV1}from '../../src/lib/server/settings-service-v1.ts'
const id='10000000-0000-4000-8000-000000000001',profile={display_name:'Synthetic',timezone:'Europe/Madrid',locale:'es-ES',notification_preferences:{in_app:true}},input={command_id:id,expected_version:0,profile}
test('settings accept only safe product preferences, not Auth/security or authority fields',()=>{
 assert.ok(parseSettingsInputV1('settings.profile_update',input));for(const extra of [{role:'owner'},{password:'forbidden'},{workspace_id:id}])assert.equal(parseSettingsInputV1('settings.profile_update',{...input,profile:{...profile,...extra}}),null)
 assert.equal(parseSettingsInputV1('settings.profile_update',{...input,profile:{...profile,timezone:'Unknown/Invalid'}}),null)
})
test('integration cards cannot expose credentials or pretend an external provider is configured',()=>{
 const classes=['google_calendar','auth_mail','crm_mail','whatsapp','n8n','ai_provider','storage'],r={contract_version:'settings.v1',operation:'settings.integrations',integrations:classes.map(c=>({class:c,status:c==='storage'?'configured':'not_configured'}))};assert.ok(parseSettingsReadV1('settings.integrations',r));assert.equal(parseSettingsReadV1('settings.integrations',{...r,integrations:r.integrations.map(x=>x.class==='n8n'?{...x,status:'configured'}:x)}),null);assert.equal(parseSettingsReadV1('settings.integrations',{...r,secret:'forbidden'}),null)
})
test('viewer may change own safe preferences but cannot modify workspace company',async()=>{
 const s=new SettingsServiceV1({resolve:async()=>({workspaceId:id,role:'viewer'}),rpc:async()=>({data:{contract_version:'settings.v1',operation:'settings.profile_update',command_id:id,version:1},error:null})});assert.equal((await s.execute('settings.profile_update',input)).ok,true)
 const company={trade_name:null,business_name:null,business_email:null,phone:null,website:null,address:null,timezone:'UTC',locale:'es-ES',description:null,logo_document_id:null};assert.equal((await s.execute('settings.company_update',{...input,profile:company})).error,'access_denied')
})
