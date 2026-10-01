import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthorizedTelecomReadServiceV1 } from '../../src/lib/server/telecom-read-service-v1.ts'
const context={actor_id:'synthetic-actor-A',workspace_id:'synthetic-workspace-A',principal_kind:'user',scope_epoch:'scope-epoch-synthetic-A'}
const envelope=()=>({contract_version:'telecom.v1',scope_epoch:'scope-epoch-synthetic-A',source_state:'available',permission:'authorized',items:[],completeness:{kind:'complete'},continuation:null,freshness:{kind:'fresh',as_of:'2026-09-27T14:00:00Z'},error:null})
const customer=()=>({contract_version:'telecom.v1',scope_epoch:'scope-epoch-synthetic-A',id:'customer_synthetic_A',account_kind:'legal_entity',legal_name:'Synthetic Customer',trade_name:null,tax_identifier:{field_class:'tax_identifier',visibility:'hidden'},lifecycle:'customer',status:'active',assigned_user:null,primary_contact:null,capabilities:[]})
function fixture(value){let calls=0;const repository=new Proxy({}, {get:()=>async()=>{calls++;return value}});return {service:new AuthorizedTelecomReadServiceV1(repository,{authorize:async()=>true,authorizeReference:async()=>true,authorizeCapability:async()=>true,isCurrent:()=>true,now:()=> '2026-09-27T14:00:00Z'}),calls:()=>calls}}
for(const date of ['2026-02-30','2025-02-29','2026-04-31','2026-13-01','2026-99-99'])test(`W4 acceptance: reject invalid calendar ${date}`,async()=>{const f=fixture(envelope());const r=await f.service.taskList(context,{limit:20,continuation:null,from:date,to:date});assert.equal(r.error?.code,'validation');assert.equal(f.calls(),0)})
test('W4 control: valid leap date accepted',async()=>{const f=fixture(envelope());assert.equal((await f.service.taskList(context,{limit:20,continuation:null,from:'2024-02-29',to:'2024-02-29'})).source_state,'available');assert.equal(f.calls(),1)})
const cases={
 nestedScope:{...envelope(),items:[{...customer(),scope_epoch:'scope-epoch-synthetic-B'}]},
 privateField:{...envelope(),private_internal_field:'SYNTHETIC_PRIVATE'},
 invalidStructure:{contract_version:'telecom.v1',scope_epoch:'scope-epoch-synthetic-A',items:42},
 oversized:{...envelope(),items:Array.from({length:101},customer)},
 wrongEpoch:{...envelope(),scope_epoch:'scope-epoch-synthetic-B'},
 wrongCapability:{...envelope(),items:[{...customer(),capabilities:[{ref:'capability_synthetic',action:'delete',target:{kind:'customer',id:'customer_synthetic_A'},expires_at:'2026-09-27T14:10:00Z'}]}]},
}
for(const [name,value] of Object.entries(cases))test(`W4 acceptance: fail closed ${name}`,async()=>{const f=fixture(value);const r=await f.service.customerSearch(context,{query:'Synthetic',limit:20,continuation:null});assert.equal(r.source_state,'error');assert.equal(r.items,null)})
test('W4 acceptance: provider detail never escapes',async()=>{const f=fixture({...envelope(),source_state:'error',items:null,error:{code:'internal_safe',retryable:false,message:'SYNTHETIC_PRIVATE_PROVIDER_DETAIL'}});const r=await f.service.customerSearch(context,{query:'Synthetic',limit:20,continuation:null});assert.equal(JSON.stringify(r).includes('SYNTHETIC_PRIVATE_PROVIDER_DETAIL'),false)})
test('W4 control: valid collection accepted',async()=>{const f=fixture({...envelope(),items:[customer()]});assert.equal((await f.service.customerSearch(context,{query:'Synthetic',limit:20,continuation:null})).source_state,'available')})
