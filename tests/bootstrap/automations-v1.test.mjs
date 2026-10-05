import test from 'node:test'
import assert from 'node:assert/strict'
import {parseAutomationInputV1,parseAutomationReceiptV1,parseAutomationReadInputV1}from '../../src/lib/server/automations-runtime-v1.ts'
import {AutomationServiceV1}from '../../src/lib/server/automations-service-v1.ts'
const id='10000000-0000-4000-8000-000000000001',d={command_id:id,name:'Synthetic',trigger_id:'customer.created',condition:{account_kind:null},action:{action_id:'notification.create',recipient_user_id:id}}
test('automation registry rejects arbitrary code/SQL/URL/unregistered events and actions',()=>{
 assert.ok(parseAutomationInputV1('automation.create',d));for(const v of [{...d,trigger_id:'timer'},{...d,condition:{sql:'select 1'}},{...d,action:{action_id:'n8n.execute',recipient_user_id:id}},{...d,url:'https://example.invalid'},{...d,condition:{account_kind:'individual'}}])assert.equal(parseAutomationInputV1('automation.create',v),null)
 assert.equal(parseAutomationReadInputV1('automation.list',{limit:101}),null)
})
test('automation cannot falsely claim success or upgrade member authority',async()=>{
 const i={command_id:id},r={contract_version:'automations.v1',operation:'automation.process_pending',command_id:id,processed:2,succeeded:1,failed:1,skipped:0,has_more:false};assert.ok(parseAutomationReceiptV1('automation.process_pending',i,r));assert.equal(parseAutomationReceiptV1('automation.process_pending',i,{...r,succeeded:2}),null)
 const s=new AutomationServiceV1({resolve:async()=>({workspaceId:id,role:'member'}),rpc:async()=>{throw Error('must not run')}});assert.equal((await s.execute('automation.create',d)).error,'access_denied')
})
test('future workflow intent is server-registered and rejects browser URLs/secrets',async()=>{
 const {parseFutureWorkflowIntentV1}=await import('../../src/lib/server/registered-integration-adapters-v1.ts')
 const v={integration_id:'n8n.primary',workflow_id:'crm.customer-created.v1',event:{kind:'customer.created',customer_id:id},idempotency_key:id};assert.ok(parseFutureWorkflowIntentV1(v));assert.equal(parseFutureWorkflowIntentV1({...v,url:'https://example.invalid'}),null);assert.equal(parseFutureWorkflowIntentV1({...v,workflow_id:'arbitrary'}),null)
})
