import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {parseExternalIdentityInputV1 as input,parseExternalIdentityReadV1 as read,parseExternalIdentityReceiptV1 as receipt} from '../../src/lib/server/external-identity-runtime-v1.ts'
import {ExternalIdentityServiceV1} from '../../src/lib/server/external-identity-service-v1.ts'
import {externalIdentityHttpV1} from '../../src/lib/server/external-identity-http-v1.ts'
const id=randomUUID(),integration=randomUUID(),command=randomUUID(),workspace=randomUUID()
const bind={command_id:command,integration_id:integration,external_kind:'subscriber',external_id:'SYNTHETIC-001',local_entity_kind:'customer',local_entity_id:id}
test('external identities accept registered metadata only and normalize scoped UUIDs without mutating caller input',()=>{
 const upper={...bind,local_entity_id:id.toUpperCase()};assert.equal(input('external_identity.bind',upper).local_entity_id,id);assert.equal(upper.local_entity_id,id.toUpperCase())
 for(const patch of [{url:'https://invalid'},{workspace_id:workspace},{password:'private'},{source:'manual'},{external_id:'https://invalid'},{local_entity_kind:'property'},{external_kind:'free code'},{integration_id:'other'}])assert.equal(input('external_identity.bind',{...bind,...patch}),null)
 const registration={command_id:command,integration_key:'synthetic.carrier',provider_code:'generic.telecom.v1',display_name:'Synthetic Carrier',source:'integration'}
 assert.ok(input('external_identity.integration_register',registration));assert.equal(input('external_identity.integration_register',{...registration,provider_code:'unregistered'}),null)
 assert.equal(input('external_identity.list',{local_entity_kind:'customer',local_entity_id:id,limit:101}),null)
 let getters=0;assert.equal(input('external_identity.bind',{...bind,get external_id(){getters++;return 'SYNTHETIC'}}),null);assert.equal(getters,0)
})
test('receipts bind exact commands and CAS, reject provider activation and private metadata extras',()=>{
 const r={contract_version:'external_identity.v1',operation:'external_identity.bind',command_id:command,id,version:1,status:'active',external_effect:'disabled'}
 assert.ok(receipt('external_identity.bind',bind,r));for(const patch of [{command_id:randomUUID()},{external_effect:'enabled'},{external_id:'private'},{status:'retired'}])assert.equal(receipt('external_identity.bind',bind,{...r,...patch}),null)
 const retirement={command_id:command,id,expected_version:1},retired={...r,operation:'external_identity.retire',version:2,status:'retired'}
 assert.ok(receipt('external_identity.retire',retirement,retired));assert.equal(receipt('external_identity.retire',retirement,{...retired,version:3}),null)
})
test('closed bounded read pages preserve exact entity/scope/filter and reject timestamps or cursors that do not fit',()=>{
 const row={id,integration_id:integration,external_kind:'subscriber',external_id:'SYNTHETIC-001',local_entity_kind:'customer',local_entity_id:id,source:'integration',status:'active',version:1,created_at:'2026-10-06T00:00:00+00:00',updated_at:'2026-10-06T00:00:00+00:00',retired_at:null}
 const i={local_entity_kind:'customer',local_entity_id:id,limit:1},page={contract_version:'external_identity.v1',operation:'external_identity.list',items:[row],next_id:id}
 assert.ok(read('external_identity.list',i,page));for(const patch of [{local_entity_id:randomUUID()},{source:'manual'},{retired_at:row.created_at},{updated_at:'2025-01-01T00:00:00Z'},{secret:'private'}])assert.equal(read('external_identity.list',i,{...page,items:[{...row,...patch}]}),null)
 assert.equal(read('external_identity.list',{...i,after_id:id},page),null);assert.equal(read('external_identity.list',{...i,limit:2},page),null)
})
test('only current owner/admin may execute even read/replay, and RPC failures remain coded',async()=>{
 let role='member',calls=0;const service=new ExternalIdentityServiceV1({resolve:async()=>role?{workspaceId:workspace,role}:null,rpc:async()=>{calls++;return {data:null,error:{code:'40001'}}}})
 assert.equal((await service.execute('external_identity.bind',bind)).error,'access_denied');role='viewer';assert.equal((await service.execute('external_identity.integration_list',{})).error,'access_denied');assert.equal(calls,0)
 role='admin';assert.equal((await service.execute('external_identity.bind',bind)).error,'conflict');role=null;assert.equal((await service.execute('external_identity.bind',bind)).error,'access_denied');assert.equal(calls,1)
})
test('Origin and JSON envelope gates reject browser authority before constructing the scoped service',async()=>{
 const origin='http://127.0.0.1:3108';let constructed=0;const factory=async()=>{constructed++;return null}
 const request=(headers,body)=>new Request(origin+'/api/telecom/external-identities/v1',{method:'POST',headers:{host:new URL(origin).host,...headers},body:JSON.stringify(body)})
 const envelope={operation:'external_identity.bind',input:bind}
 assert.equal((await externalIdentityHttpV1(request({'content-type':'application/json',origin:'https://invalid'},envelope),factory,origin)).status,403)
 assert.equal((await externalIdentityHttpV1(request({'content-type':'application/json',origin},{...envelope,workspace_id:workspace}),factory,origin)).status,400)
 assert.equal(constructed,0)
})
