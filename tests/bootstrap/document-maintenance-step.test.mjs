import test from 'node:test'
import assert from 'node:assert/strict'
import {observeDocumentMaintenanceStep} from '../../scripts/security/supabase-local/document-maintenance-step.mjs'
import {observeDocumentMaintenanceRoute} from '../../scripts/security/supabase-local/observed-document-route.mjs'
const operations=['document.verify_content','document.cleanup_finish']

test('original result and exactly one action are preserved without successful evidence rows',async()=>{
 for(const operation of operations){const report={},value=Symbol('result');let calls=0
  assert.equal(await observeDocumentMaintenanceStep(report,operation,'lost_response_fetch',()=>{calls++;return value}),value)
  assert.equal(calls,1);assert.deepEqual(report,{})
 }
})
test('the original exception is propagated with closed operation and step only, never private message/headers/stack/cause',async()=>{
 for(const operation of operations)for(const step of ['request_body','other_continue','lost_response_fetch','commit_status','intentional_abort','exact_retry_continue']){
  const report={},error=new Error('route.fetch synthetic-private-cookie body url error details',{cause:{private:'synthetic'}});let calls=0
  await assert.rejects(observeDocumentMaintenanceStep(report,operation,step,()=>{calls++;throw error}),e=>e===error)
  assert.equal(calls,1);assert.deepEqual(report,{w2_document_maintenance_step_failures:[{operation,step,kind:'ACTION_FAILED'}]})
  assert.equal(JSON.stringify(report).includes('synthetic'),false)
 }
})
test('only the existing exact non-200 commit assertions are classified as HTTP refusal',async()=>{
 for(const [operation,message] of [['document.verify_content','INTEGRITY_UI_NOT_COMMITTED'],['document.cleanup_finish','CLEANUP_UI_NOT_COMMITTED']]){
  const report={},error=Error(message)
  await assert.rejects(observeDocumentMaintenanceStep(report,operation,'commit_status',()=>{throw error}),e=>e===error)
  assert.deepEqual(report.w2_document_maintenance_step_failures,[{operation,step:'commit_status',kind:'HTTP_REFUSED'}])
  const other={};await assert.rejects(observeDocumentMaintenanceStep(other,operation,'lost_response_fetch',()=>{throw error}),e=>e===error)
  assert.equal(other.w2_document_maintenance_step_failures[0].kind,'ACTION_FAILED')
 }
})
test('message/stack/cause accessors are never evaluated and inherited messages are not classified',async()=>{
 for(const error of [Object.create({message:'CLEANUP_UI_NOT_COMMITTED'}),{}]){
  let gets=0
  for(const key of ['stack','cause'])Object.defineProperty(error,key,{get(){gets++;throw Error('private')}})
  if(Object.getPrototypeOf(error)===Object.prototype)Object.defineProperty(error,'message',{get(){gets++;throw Error('private')}})
  const report={};await assert.rejects(observeDocumentMaintenanceStep(report,operations[0],'lost_response_fetch',()=>{throw error}),e=>e===error)
  assert.equal(gets,0);assert.equal(report.w2_document_maintenance_step_failures[0].kind,'ACTION_FAILED')
 }
})
test('first failure is retained per operation with at most two rows, regardless of later callbacks',async()=>{
 const report={}
 for(let i=0;i<100;i++)for(const operation of operations)await assert.rejects(observeDocumentMaintenanceStep(report,operation,i===0?'request_body':'exact_retry_continue',()=>{throw Error('synthetic')}))
 assert.deepEqual(report.w2_document_maintenance_step_failures,operations.map(operation=>({operation,step:'request_body',kind:'ACTION_FAILED'})))
})
test('absent report still runs exactly once and propagates original refusal',async()=>{
 const error=Error('synthetic');let calls=0
 await assert.rejects(observeDocumentMaintenanceStep(undefined,operations[0],'intentional_abort',()=>{calls++;throw error}),e=>e===error);assert.equal(calls,1)
})
test('invalid context fails before any action or report mutation',async()=>{
 for(const [operation,step] of [['document.private','lost_response_fetch'],[operations[0],'private-step']]){
  const report={};let calls=0
  await assert.rejects(observeDocumentMaintenanceStep(report,operation,step,()=>{calls++}),/CONTEXT_INVALID/);assert.equal(calls,0);assert.deepEqual(report,{})
 }
})
test('existing route observer continues blocking uncertain retry after an observed fetch refusal and disposes safely',async()=>{
 let handler,removed;const page={route:async(pattern,fn)=>{handler=fn},unroute:async(pattern,fn)=>{removed=fn}}
 const report={};let fetches=0,aborts=0,retries=0
 const observer=await observeDocumentMaintenanceRoute(page,route=>observeDocumentMaintenanceStep(report,operations[1],'lost_response_fetch',()=>route.fetch()))
 const route={fetch:async()=>{fetches++;throw Error('private-cookie synthetic')},abort:async()=>{aborts++}}
 await handler(route);await assert.rejects(async()=>{await observer.assertHealthy();retries++},/DOCUMENT_ROUTE_INTERCEPTION_FAILED/)
 await handler(route);await assert.rejects(observer.dispose(),/DOCUMENT_ROUTE_INTERCEPTION_FAILED/)
 assert.equal(fetches,1);assert.equal(aborts,2);assert.equal(retries,0);assert.equal(handler,removed)
 assert.deepEqual(report.w2_document_maintenance_step_failures,[{operation:operations[1],step:'lost_response_fetch',kind:'ACTION_FAILED'}])
})
