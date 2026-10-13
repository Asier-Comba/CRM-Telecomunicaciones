import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import test from 'node:test'

const cwd=fileURLToPath(new URL('../../',import.meta.url))
const entry=new URL('../../scripts/assistant/eval-live-v2.ts',import.meta.url).href
function probe({configured=true,live=true,waiver=false}={}){
  // Replace the transport BEFORE importing the executable: even regression to
  // the old 220-call loop cannot contact a provider or consume any money.
  const code=`let calls=0,report=null;globalThis.fetch=async()=>{calls++;throw Error('inert_synthetic_transport')};console.log=value=>{report=JSON.parse(value)};await import(${JSON.stringify(entry)});process.stdout.write(JSON.stringify({calls,report})+'\\n');`
  const env={...process.env,OPENAI_MODEL:'budget-probe',OPENAI_API_KEY:configured?'synthetic-inert-key':undefined}
  delete env.OPENAI_PROJECT_ID
  if(waiver){env.AI_BUDGET_APPROVED='true';env.OPENAI_EVAL_BUDGET_USD='999';env.OPENAI_EVAL_MAX_CASES='220'}
  const child=spawnSync(process.execPath,['--experimental-transform-types','--input-type=module','--eval',code,'--',...(live?['--live']:[])],{cwd,env,encoding:'utf8',timeout:30000})
  assert.equal(child.error,undefined)
  assert.equal(child.signal,null)
  assert.equal(child.stdout.includes('synthetic-inert-key'),false)
  assert.equal(child.stderr.includes('synthetic-inert-key'),false)
  return {...JSON.parse(child.stdout),exit:child.status}
}
test('a ready provider and explicit live flag cannot spend before durable shared budget admission',()=>{
  const p=probe()
  assert.equal(p.calls,0);assert.equal(p.exit,2)
  assert.equal(p.report.status,'NOT_RUN');assert.equal(p.report.reason,'durable_shared_budget_controller_not_installed')
  assert.equal(p.report.liveModelEvidence,false);assert.equal(p.report.providerRequests,0)
  assert.equal(p.report.sharedLimitMicrousd,1500000);assert.equal(p.report.firstBatchLimitMicrousd,500000)
  assert.equal(p.report.budgetEnforcement,'NOT_IMPLEMENTED');assert.equal(p.report.cost,'NOT_INCURRED')
  assert.ok(p.report.scenarios>0)
})
test('absent provider or absent explicit flag preserves the separate NOT_RUN reasons without calls',()=>{
  for(const [options,reason] of [[{configured:false},'provider_not_configured'],[{live:false},'explicit_live_flag_required']]){
    const p=probe(options);assert.equal(p.calls,0);assert.equal(p.exit,0)
    assert.equal(p.report.reason,reason);assert.equal(p.report.liveModelEvidence,false)
  }
})
test('invented environment approvals or inflated budgets cannot waive the missing controller',()=>{
  const p=probe({waiver:true})
  assert.equal(p.calls,0);assert.equal(p.exit,2)
  assert.equal(p.report.reason,'durable_shared_budget_controller_not_installed')
})
