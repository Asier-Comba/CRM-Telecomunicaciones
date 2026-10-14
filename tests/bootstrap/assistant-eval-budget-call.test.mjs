import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,dirname} from 'node:path'
import test from 'node:test'
import {createEvaluationBudgetLedgerV1,openEvaluationBudgetLedgerV1} from '../../scripts/assistant/eval-budget-ledger-v1.mjs'
import {runBudgetedEvaluationCallV1 as run} from '../../scripts/assistant/eval-budget-call-v1.mjs'

const body=JSON.stringify({model:'synthetic-model',store:false,stream:false,service_tier:'default',max_output_tokens:256,input:'synthetic'})
const quote=()=>({model:'synthetic-model',bodySha256:createHash('sha256').update(body).digest('hex'),inputTokenBound:1000,prices:{input:1000000,cachedInput:100000,output:2000000}})
const response=(status='completed')=>({model:'synthetic-model',service_tier:'default',status,usage:{input_tokens:100,output_tokens:20,total_tokens:120,input_tokens_details:{cached_tokens:40}},output:[]})
function fixture(t){
 const root=resolve(tmpdir()),dir=mkdtempSync(join(root,'telecom-eval-call-')),path=join(dir,'budget.sqlite')
 const handles=[createEvaluationBudgetLedgerV1(path)]
 t.after(()=>{for(const ledger of handles)ledger.close();assert.equal(dirname(dir),root);assert.ok(dir.startsWith(join(root,'telecom-eval-call-')));rmSync(dir,{recursive:true})})
 return {ledger:handles[0],reopen(){const ledger=openEvaluationBudgetLedgerV1(path);handles.push(ledger);return ledger}}
}
const call=(ledger,send,overrides={})=>run({ledger,batchRef:'first-batch',callRef:'first-call',body,quote:quote(),send,...overrides})

test('real SQLite hold precedes transport; measured cached usage settles even incomplete output and survives reopen',async t=>{
 const f=fixture(t)
 const result=await call(f.ledger,async bytes=>{assert.equal(bytes,body);assert.equal(f.reopen().inspect().reservedMicrousd,1512);return response('incomplete')})
 assert.equal(result.status,'settled');assert.equal(result.costMicrousd,104);assert.equal(result.response.status,'incomplete')
 assert.equal(f.reopen().inspect().knownSpentMicrousd,104)
 assert.equal((await call(f.ledger,()=>assert.fail('duplicate transport'))).status,'duplicate')
})
test('lost, unpriced or out-of-bound usage retains the complete durable hold and forbids redispatch after reopen',async t=>{
 for(const send of [()=>{throw Error('private transport failure')},()=>({...response(),usage:null}),()=>({...response(),service_tier:'priority'}),()=>({...response(),usage:{...response().usage,input_tokens:1001,total_tokens:1021}})]){
  const f=fixture(t),result=await call(f.ledger,send)
  assert.equal(result.status,'unresolved');assert.equal(result.costMicrousd,null)
  const reopened=f.reopen();assert.equal(reopened.inspect().reservedMicrousd,1512)
  assert.equal((await call(reopened,()=>assert.fail('unknown replay'),{callRef:'next-call'})).status,'unresolved')
 }
})
test('exact request binding, ceilings, cancellation and concurrent requests admit at most one inert transport',async t=>{
 const f=fixture(t);let calls=0,release
 const pending=call(f.ledger,()=>{calls++;return new Promise(r=>{release=r})})
 assert.equal((await call(f.reopen(),()=>{calls++;return response()},{callRef:'parallel-call'})).status,'unresolved')
 release(response());await pending;assert.equal(calls,1)
 await assert.rejects(call(f.ledger,()=>assert.fail('changed body'),{body:body+' '}),/EVAL_BUDGET_CALL_UNAVAILABLE/)
 await assert.rejects(call(f.ledger,()=>assert.fail('over budget'),{quote:{...quote(),prices:{input:1000000000,cachedInput:0,output:2000000000}}}),/EVAL_BUDGET_CALL_UNAVAILABLE/)
 const c=new AbortController();c.abort()
 assert.equal((await call(f.ledger,()=>assert.fail('cancelled'),{signal:c.signal,callRef:'cancelled'})).providerRequests,0)
 assert.equal(f.ledger.inspect().unresolvedCalls,0)
})
