import assert from 'node:assert/strict'
import {spawn,spawnSync} from 'node:child_process'
import {existsSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname,join,resolve} from 'node:path'
import test from 'node:test'
import {DatabaseSync} from 'node:sqlite'
import {createEvaluationBudgetLedgerV1 as createRaw,openEvaluationBudgetLedgerV1 as openRaw} from '../../scripts/assistant/eval-budget-ledger-v1.mjs'

const owned=new Map()
function createEvaluationBudgetLedgerV1(path){const l=createRaw(path);owned.get(path).ledgers.push(l);return l}
function openEvaluationBudgetLedgerV1(path){const l=openRaw(path);owned.get(path).ledgers.push(l);return l}

function fixture(t){
  const root=resolve(tmpdir()),dir=mkdtempSync(join(root,'telecom-eval-budget-'))
  const path=join(dir,'budget.sqlite'),resources={ledgers:[],children:[]};owned.set(path,resources)
  t.after(async()=>{
    for(const p of resources.children)if(p.exitCode===null&&p.signalCode===null){const ended=exit(p);p.kill('SIGKILL');await ended}
    for(const l of resources.ledgers)l.close()
    assert.equal(dirname(dir),root);assert.ok(dir.startsWith(join(root,'telecom-eval-budget-')))
    rmSync(dir,{recursive:true});owned.delete(path)
  })
  return path
}
const reservation=(callRef='call-a',maxCostMicrousd=400000,batchRef='batch-a')=>({callRef,maxCostMicrousd,batchRef})

function exhaust(ledger){for(let n=0;n<3;n++){assert.equal(ledger.reserve(reservation('full-'+n,500000,'full-batch-'+n)).status,'reserved');assert.equal(ledger.settle({callRef:'full-'+n,knownCostMicrousd:500000}).status,'settled')}}
function corruptAccounting(path){
 const db=new DatabaseSync(path)
 try{db.exec("PRAGMA ignore_check_constraints=ON; INSERT INTO calls VALUES('invalid-negative','invalid-batch',500000,'settled',-1500000)")}
 finally{db.close()}
}
test('logically corrupt persisted accounting cannot cancel spent charges into a new allowance on reopen',t=>{
 const path=fixture(t),ledger=createEvaluationBudgetLedgerV1(path);exhaust(ledger);ledger.close()
 corruptAccounting(path)
 assert.throws(()=>openEvaluationBudgetLedgerV1(path),/EVAL_BUDGET_LEDGER_UNAVAILABLE/)
})
test('accounting corruption after admission is rejected inside every new transaction',t=>{
 const path=fixture(t),ledger=createEvaluationBudgetLedgerV1(path);exhaust(ledger)
 corruptAccounting(path)
 assert.throws(()=>ledger.reserve(reservation('new-call',1,'new-batch')),/EVAL_BUDGET_LEDGER_UNAVAILABLE/)
 assert.throws(()=>ledger.inspect(),/EVAL_BUDGET_LEDGER_UNAVAILABLE/)
})
test('real persisted shared and batch ceilings survive reopening and new batch identifiers',t=>{
  const path=fixture(t);let ledger=createEvaluationBudgetLedgerV1(path)
  for(let n=0;n<3;n++){
    assert.equal(ledger.reserve(reservation('call-'+n,500000,'batch-'+n)).status,'reserved')
    assert.equal(ledger.settle({callRef:'call-'+n,knownCostMicrousd:500000}).status,'settled')
    assert.equal(ledger.reserve(reservation('same-batch-'+n,1,'batch-'+n)).status,'budget_exceeded')
    ledger.close();ledger=openEvaluationBudgetLedgerV1(path)
  }
  assert.equal(ledger.inspect().knownSpentMicrousd,1500000)
  assert.equal(ledger.reserve(reservation('new-call',1,'new-batch')).status,'budget_exceeded')
  ledger.close()
  assert.throws(()=>createEvaluationBudgetLedgerV1(path),/EVAL_BUDGET_LEDGER_UNAVAILABLE/)
})
test('unknown and over-reservation usage preserve their entire durable hold and stop subsequent calls',t=>{
  for(const amount of [null,400001]){
    const path=fixture(t);let ledger=createEvaluationBudgetLedgerV1(path)
    assert.equal(ledger.reserve(reservation()).status,'reserved')
    assert.equal(ledger.settle({callRef:'call-a',knownCostMicrousd:amount}).status,'unresolved')
    ledger.close();ledger=openEvaluationBudgetLedgerV1(path)
    assert.equal(ledger.inspect().reservedMicrousd,400000)
    assert.equal(ledger.inspect().knownSpentMicrousd,0)
    assert.equal(ledger.reserve(reservation('call-b',1,'batch-b')).status,'unresolved')
    assert.equal(ledger.settle({callRef:'call-a',knownCostMicrousd:0}).status,'unresolved')
    ledger.close()
  }
})
test('duplicate reservation and conflicting settlement cannot create reusable permission or release money',t=>{
  const ledger=createEvaluationBudgetLedgerV1(fixture(t));t.after(()=>ledger.close())
  const first=ledger.reserve(reservation());assert.equal(first.dispatchAuthorized,false)
  assert.equal(ledger.reserve(reservation()).status,'duplicate')
  assert.equal(ledger.settle({callRef:'call-a',knownCostMicrousd:100000}).status,'settled')
  assert.equal(ledger.settle({callRef:'call-a',knownCostMicrousd:100000}).status,'settled')
  assert.equal(ledger.settle({callRef:'call-a',knownCostMicrousd:0}).status,'conflict')
  assert.equal(ledger.reserve(reservation()).status,'duplicate')
  assert.equal(ledger.inspect().knownSpentMicrousd,100000)
  assert.equal(ledger.reserve(reservation('call-b',400000)).status,'reserved')
  assert.equal(ledger.settle({callRef:'call-b',knownCostMicrousd:400000}).status,'settled')
  assert.equal(ledger.reserve(reservation('call-c',1)).status,'budget_exceeded')
})
test('missing corrupt and noncanonical input fail closed without getter evaluation or allowance reset',t=>{
  const path=fixture(t)
  assert.throws(()=>openEvaluationBudgetLedgerV1(path),/EVAL_BUDGET_LEDGER_UNAVAILABLE/)
  const ledger=createEvaluationBudgetLedgerV1(path);t.after(()=>ledger.close())
  let gets=0
  assert.throws(()=>ledger.reserve(Object.defineProperty(reservation(),'maxCostMicrousd',{enumerable:true,get(){gets++;return 1}})),/EVAL_BUDGET_LEDGER_UNAVAILABLE/)
  for(const changed of [{maxCostMicrousd:0},{maxCostMicrousd:NaN},{maxCostMicrousd:500001},{batchRef:"'SQL"},{secret:'hidden'}])assert.throws(()=>ledger.reserve({...reservation(),...changed}),/EVAL_BUDGET_LEDGER_UNAVAILABLE/)
  assert.equal(gets,0)
  const bad=fixture(t);writeFileSync(bad,'invalid',{mode:0o600})
  assert.throws(()=>openEvaluationBudgetLedgerV1(bad),/EVAL_BUDGET_LEDGER_UNAVAILABLE/)
})
const moduleUrl=new URL('../../scripts/assistant/eval-budget-ledger-v1.mjs',import.meta.url).href
test('production host cannot create an evaluation allowance or write its database',t=>{
  const path=fixture(t)
  const code=`import {createEvaluationBudgetLedgerV1} from ${JSON.stringify(moduleUrl)};try{createEvaluationBudgetLedgerV1(${JSON.stringify(path)});process.exitCode=1}catch(e){console.log(e.message)}`
  const result=spawnSync(process.execPath,['--input-type=module','--eval',code],{env:{...process.env,NODE_ENV:'production'},encoding:'utf8',timeout:30000})
  assert.equal(result.error,undefined);assert.equal(result.status,0)
  assert.equal(result.stdout.trim(),'EVAL_BUDGET_LEDGER_UNAVAILABLE');assert.equal(existsSync(path),false)
})
function child(path,call,wait=false){
  const code=`import {openEvaluationBudgetLedgerV1} from ${JSON.stringify(moduleUrl)};const l=openEvaluationBudgetLedgerV1(${JSON.stringify(path)});const r=l.reserve(${JSON.stringify(reservation(call))});console.log(JSON.stringify({pid:process.pid,status:r.status}));${wait?'setInterval(()=>{},1000)':'l.close()'}`
  const p=spawn(process.execPath,['--input-type=module','--eval',code],{stdio:['ignore','pipe','ignore']})
  owned.get(path).children.push(p);return p
}
function output(process){return new Promise((yes,no)=>{
  let wire='';process.stdout.on('data',part=>{wire+=part;if(wire.length>2048){process.kill('SIGKILL');no(Error('oversized'));return}if(wire.includes('\n'))yes(JSON.parse(wire.trim()))})
  process.once('error',no);process.once('exit',()=>{if(!wire)no(Error('no result'))})
})}
const exit=p=>new Promise((yes,no)=>{p.once('error',no);p.once('exit',(code,signal)=>yes({code,signal}))})
test('eight independent processes share one atomic pending reservation',async t=>{
  const path=fixture(t),ledger=createEvaluationBudgetLedgerV1(path);ledger.close()
  const children=Array.from({length:8},(_,n)=>child(path,'race-'+n))
  t.after(()=>children.forEach(p=>{if(p.exitCode===null)p.kill('SIGKILL')}))
  const results=await Promise.all(children.map(async p=>{const end=exit(p),value=await output(p);assert.equal((await end).code,0);return value}))
  assert.equal(new Set(results.map(v=>v.pid)).size,8)
  assert.equal(results.filter(v=>v.status==='reserved').length,1)
  assert.equal(results.filter(v=>v.status==='unresolved').length,7)
  const reopened=openEvaluationBudgetLedgerV1(path);t.after(()=>reopened.close())
  assert.equal(reopened.inspect().reservedMicrousd,400000);assert.equal(reopened.inspect().unresolvedCalls,1)
})
test('termination after committed reservation leaves a hold after a fresh process opens the file',async t=>{
  const path=fixture(t),ledger=createEvaluationBudgetLedgerV1(path);ledger.close()
  const p=child(path,'lost-ack',true),ended=exit(p)
  t.after(()=>{if(p.exitCode===null)p.kill('SIGKILL')})
  assert.equal((await output(p)).status,'reserved');assert.equal(p.kill('SIGKILL'),true)
  const closed=await ended;assert.notEqual(closed.code,0)
  const recovered=openEvaluationBudgetLedgerV1(path);t.after(()=>recovered.close())
  assert.equal(recovered.inspect().reservedMicrousd,400000)
  assert.equal(recovered.reserve(reservation('retry',1,'other-batch')).status,'unresolved')
  assert.equal(recovered.reserve(reservation('lost-ack')).status,'duplicate')
})
