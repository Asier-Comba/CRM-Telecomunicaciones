import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateBenchmark, runBenchmark, type BenchmarkCandidate } from '../../src/assistant/provider-benchmark.ts'
const candidate: BenchmarkCandidate = { id: 'reference_v1', mode: 'reference', inputMicrousdPerMillion: 2_000_000, outputMicrousdPerMillion: 4_000_000, async generate() { return { output: { capability: 'crm.customer.search' }, inputTokens: 10, outputTokens: 5 } } }
const cases = [{ id: 'lookup', prompt: 'Busca ACME', context: {} }]
const judge = () => ({ capability: true, arguments: true, policy: true, grounding: true })

test('benchmark refuses judgment accessors without reading or upgrading variable scores',async()=>{
 let reads=0
 const changing=Object.fromEntries(['capability','arguments','policy','grounding'].map(key=>[key,false]))
 for(const key of Object.keys(changing))Object.defineProperty(changing,key,{enumerable:true,get(){reads++;return reads>4}})
 const rows=await runBenchmark(candidate,cases,()=>changing as ReturnType<typeof judge>)
 assert.equal(reads,0);assert.equal(rows[0]!.status,'judge_failure');assert.equal(rows[0]!.judgment,null)
 assert.equal(rows[0]!.costMicrousd,40);assert.equal(aggregateBenchmark(rows)?.fullPassRate,0)
})

test('benchmark records judgment descriptors rather than substituted Proxy reads',async()=>{
 let reads=0
 const score={capability:false,arguments:false,policy:false,grounding:false}
 const rows=await runBenchmark(candidate,cases,()=>new Proxy(score,{get(){reads++;return true}}))
 assert.equal(reads,0);assert.deepEqual(rows[0]!.judgment,score)
 assert.equal(rows[0]!.status,'scored');assert.equal(aggregateBenchmark(rows)?.fullPassRate,0)
})
test('direct benchmark keeps original case membership and denominator across adapter mutation',async()=>{
 const selected=[{id:'first_original',prompt:'Consulta original',context:{}},{id:'second_original',prompt:'Otra consulta original',context:{}}]
 let calls=0
 const changing:BenchmarkCandidate={...candidate,async generate(){calls++;if(calls===1)selected.pop();return {output:{},inputTokens:10,outputTokens:5}}}
 const rows=await runBenchmark(changing,selected,judge)
 assert.deepEqual(rows.map(r=>r.caseId),['first_original','second_original']);assert.equal(calls,2)
 assert.equal(aggregateBenchmark(rows)?.cases,2);assert.equal(aggregateBenchmark(rows)?.observedCostMicrousd,80)
})
test('direct benchmark pins later prompts and nested context before waiting for a provider',async()=>{
 const selected=[{id:'first_original',prompt:'Primera consulta',context:{record:{label:'Primero'}}},{id:'second_original',prompt:'Segunda original',context:{record:{label:'Segundo'}}}]
 const seen:string[]=[],changing:BenchmarkCandidate={...candidate,async generate(input){
  seen.push(JSON.stringify(input))
  if(seen.length===1){selected[1]!.id='substituted_case';selected[1]!.prompt='Texto sustituido';selected[1]!.context.record.label='Hecho sustituido'}
  return {output:{},inputTokens:10,outputTokens:5}
 }}
 const rows=await runBenchmark(changing,selected,judge)
 assert.equal(rows[1]!.caseId,'second_original');assert.ok(seen[1]!.includes('Segunda original'));assert.ok(seen[1]!.includes('Segundo'))
 assert.ok(!seen[1]!.includes('sustituido'));assert.equal(JSON.stringify(rows).includes('original'),true)
})
test('direct benchmark refuses accessor case material before evaluating it or calling a provider',async()=>{
 let read=false,calls=0
 const accessor={id:'accessor_case',get prompt(){read=true;return 'Texto inestable'},context:{}}
 await assert.rejects(runBenchmark({...candidate,async generate(){calls++;return {output:{},inputTokens:0,outputTokens:0}}},[accessor],judge),/invalid_benchmark_case/)
 assert.equal(read,false);assert.equal(calls,0)
})
test('benchmark refuses provider usage accessors without invoking them or inventing a cost',async()=>{
 let read=false
 const rows=await runBenchmark({...candidate,async generate(){return {output:{},get inputTokens(){read=true;return 10},outputTokens:5}}},cases,judge)
 assert.equal(read,false);assert.equal(rows[0]!.status,'invalid_observation');assert.equal(rows[0]!.costMicrousd,null)
 assert.equal(aggregateBenchmark(rows)?.usageComplete,false)
})
test('benchmark counts admitted usage descriptor values rather than substituted Proxy get values',async()=>{
 let substituted=0
 const rows=await runBenchmark({...candidate,async generate(){return new Proxy({output:{},inputTokens:10,outputTokens:5},{get(target,key,receiver){
  if(key==='inputTokens'||key==='outputTokens'){substituted++;return 0}return Reflect.get(target,key,receiver)
 }})}},cases,judge)
 assert.equal(substituted,0);assert.equal(rows[0]!.inputTokens,10);assert.equal(rows[0]!.outputTokens,5);assert.equal(rows[0]!.costMicrousd,40)
})

test('a running benchmark keeps its admitted identity, evidence mode, tariffs and transport across adapter mutation',async()=>{
 let originalCalls=0,replacementCalls=0
 const changing:BenchmarkCandidate={...candidate,async generate(){
  assert.equal(this,changing);originalCalls++
  changing.id='mutable_adapter_label';changing.mode='llm'
  changing.inputMicrousdPerMillion=0;changing.outputMicrousdPerMillion=0
  changing.generate=async()=>{replacementCalls++;return {output:{},inputTokens:10,outputTokens:5}}
  return {output:{},inputTokens:10,outputTokens:5}
 }}
 const records=await runBenchmark(changing,[...cases,{...cases[0]!,id:'second_lookup'}],judge)
 assert.deepEqual(records.map(r=>({id:r.candidateId,mode:r.mode,cost:r.costMicrousd})),[
  {id:'reference_v1',mode:'reference',cost:40},{id:'reference_v1',mode:'reference',cost:40},
 ])
 assert.equal(originalCalls,2);assert.equal(replacementCalls,0)
 assert.equal(aggregateBenchmark(records)?.mode,'reference');assert.equal(aggregateBenchmark(records)?.costMicrousd,80)
})

test('unknown provider usage has an unknown total cost and a separately labelled measured subtotal',async()=>{
 const unknown=await runBenchmark({...candidate,async generate(){throw Error('private provider body')}},cases,judge)
 assert.equal(aggregateBenchmark(unknown)?.costMicrousd,null)
 assert.equal(aggregateBenchmark(unknown)?.observedCostMicrousd,0)
 const known=await runBenchmark(candidate,cases,judge),mixed=aggregateBenchmark([...known,{...unknown[0]!,caseId:'failed_lookup'}])!
 assert.equal(mixed.costMicrousd,null);assert.equal(mixed.observedCostMicrousd,40);assert.equal(mixed.usageComplete,false)
 assert.equal(JSON.stringify(mixed).includes('private'),false)
})

test('complete measured usage distinguishes a genuinely zero synthetic cost from missing usage',async()=>{
 const measured=await runBenchmark({...candidate,inputMicrousdPerMillion:0,outputMicrousdPerMillion:0},cases,judge)
 const summary=aggregateBenchmark(measured)!
 assert.equal(summary.costMicrousd,0);assert.equal(summary.observedCostMicrousd,0);assert.equal(summary.usageComplete,true)
 const known=aggregateBenchmark(await runBenchmark(candidate,cases,judge))!
 assert.equal(known.costMicrousd,40);assert.equal(known.observedCostMicrousd,40)
})

test('invalid or overflowing cost observations cannot produce an apparently usable evaluation total',async()=>{
 const row=(await runBenchmark(candidate,cases,judge))[0]!
 for(const costMicrousd of [-1,NaN,Infinity,0.5])assert.equal(aggregateBenchmark([{...row,costMicrousd}]),null)
 assert.equal(aggregateBenchmark([{...row,costMicrousd:Number.MAX_SAFE_INTEGER},{...row,caseId:'second_lookup',costMicrousd:1}]),null)
})
test('reference benchmark records precise usage without claiming an LLM run or exposing payload', async () => {
  const rows = await runBenchmark(candidate, cases, judge)
  assert.equal(rows[0]?.costMicrousd, 40)
  assert.equal(rows[0]?.mode, 'reference')
  assert.equal(rows[0]?.status, 'scored')
  assert.equal(JSON.stringify(rows).includes('ACME'), false)
  assert.equal(JSON.stringify(rows).includes('crm.customer'), false)
  assert.equal(aggregateBenchmark(rows)?.fullPassRate, 1)
  assert.equal(aggregateBenchmark([...rows, { ...rows[0]!, mode: 'llm' }]), null)
})
test('failures, invalid output usage and judge failure cannot inflate scores or leak errors', async () => {
  for (const variant of [
    { generate: async () => { throw new Error('private provider body') } },
    { generate: async () => ({ output: null, inputTokens: NaN, outputTokens: 5 }) },
  ]) {
    const rows = await runBenchmark({ ...candidate, ...variant }, cases, judge)
    assert.equal(aggregateBenchmark(rows)?.fullPassRate, 0)
    assert.equal(aggregateBenchmark(rows)?.usageComplete, false)
    assert.equal(JSON.stringify(rows).includes('private'), false)
  }
  const rows = await runBenchmark(candidate, cases, () => { throw new Error('judge') })
  assert.equal(rows[0]?.status, 'judge_failure')
  assert.equal(aggregateBenchmark(rows)?.fullPassRate, 0)
})
test('benchmark timeout aborts candidate and reports missing usage honestly', async () => {
  let aborted = false
  const rows = await runBenchmark({ ...candidate, generate: (_input, signal) => new Promise(() => { signal.addEventListener('abort', () => { aborted = true }) }) }, cases, judge, 5)
  assert.equal(aborted, true)
  assert.equal(rows[0]?.status, 'timeout')
  assert.equal(rows[0]?.inputTokens, null)
})
test('fallback reporting is measured separately and never includes prompts or provider text', async () => {
  const rows = await runBenchmark({ ...candidate, async generate() { return { output: {}, inputTokens: 20, outputTokens: 7, fallbackUsed: true } } }, cases, judge)
  assert.equal(aggregateBenchmark(rows)?.fallbackRate, 1)
  assert.equal(aggregateBenchmark(rows)?.fallbackReportingComplete, true)
})
