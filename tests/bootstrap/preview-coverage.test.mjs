import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {manifest,shard,union} from '../../scripts/ci/preview-coverage.mjs'

const source='a'.repeat(40),run='100',attempt='1'
const config={workers:1,projects:['desktop','mobile'].map(name=>({name,retries:0,timeout:180000,repeatEach:1}))}
function report(projects=['desktop','mobile'],execute=false){
 const rows=projects.flatMap(project=>['case-one','case-two'].map(id=>({id,tests:[{projectName:project,expectedStatus:'passed',status:execute?'expected':'skipped',results:execute?[{status:'passed',retry:0}]:[]}]})))
 return {config:structuredClone(config),errors:[],suites:[{title:'file',specs:rows}],stats:{expected:rows.length,unexpected:0,flaky:0,skipped:0}}
}
function evidence(){const m=manifest(report(),source,run,attempt);return ['desktop','mobile'].map(project=>({manifest:structuredClone(m),proof:shard(report([project],true),m,project,source,run,attempt)}))}
test('independent project reports close exactly their complete collected union',()=>{
 const result=union(evidence(),source,run,attempt,'success')
 assert.equal(result.case_count,4);assert.deepEqual(result.project_counts,{desktop:2,mobile:2})
 assert.equal(result.scope,'SYNTHETIC_PREVIEW_ONLY_NOT_AUTH_STAGING_OR_RELEASE')
})
test('collection rejects missing projects, duplicate ids and discovery errors',()=>{
 assert.throws(()=>manifest(report(['desktop']),source,run,attempt),/PROJECT_MISSING/)
 for(const mutate of [r=>r.suites[0].specs.push(r.suites[0].specs[0]),r=>r.errors.push({message:'untrusted-private-error'}),r=>r.suites=[],r=>r.suites[0].specs[0].tests[0].expectedStatus='skipped']){
  const r=report();mutate(r);assert.throws(()=>manifest(r,source,run,attempt),/PREVIEW_/)
 }
})
test('execution rejects omitted, extra, duplicate and wrong-project cases',()=>{
 const m=manifest(report(),source,run,attempt)
 for(const mutate of [r=>r.suites[0].specs.pop(),r=>r.suites[0].specs.push({id:'extra',tests:r.suites[0].specs[0].tests}),r=>r.suites[0].specs.push(r.suites[0].specs[0]),r=>r.suites[0].specs[0].tests[0].projectName='mobile']){
  const r=report(['desktop'],true);mutate(r);assert.throws(()=>shard(r,m,'desktop',source,run,attempt),/PREVIEW_/)
 }
})
test('no failed, skipped, unexpected, flaky, retried or incomplete result becomes PASS',()=>{
 const m=manifest(report(),source,run,attempt)
 for(const mutate of [r=>r.suites[0].specs[0].tests[0].results[0].status='failed',r=>r.suites[0].specs[0].tests[0].results[0].status='skipped',r=>r.suites[0].specs[0].tests[0].status='unexpected',r=>r.stats.flaky=1,r=>r.stats.expected--,r=>r.suites[0].specs[0].tests[0].results.push({status:'passed',retry:1}),r=>r.suites[0].specs[0].tests[0].results[0].retry=1,r=>r.errors.push({})]){
  const r=report(['desktop'],true);mutate(r);assert.throws(()=>shard(r,m,'desktop',source,run,attempt),/PREVIEW_/)
 }
})
test('source, workflow run and attempt reject inherited or stale proofs',()=>{
 const entries=evidence()
 for(const [sha,id,n] of [['b'.repeat(40),run,attempt],[source,'101',attempt],[source,run,'2']])assert.throws(()=>union(entries,sha,id,n,'success'),/BINDING/)
 for(const field of ['source_sha','run_id','run_attempt']){const e=evidence();e[0].proof[field]='stale';assert.throws(()=>union(e,source,run,attempt,'success'),/BINDING/)}
})
test('terminal success of both jobs includes fixture and launcher, not just browser proof',()=>{
 for(const result of ['failure','cancelled','skipped',undefined])assert.throws(()=>union(evidence(),source,run,attempt,result),/ALL_JOBS_SUCCESS/)
 assert.throws(()=>union(evidence().slice(0,1),source,run,attempt,'success'),/ALL_JOBS_SUCCESS/)
 const duplicate=evidence();duplicate[1]=duplicate[0];assert.throws(()=>union(duplicate,source,run,attempt,'success'),/BINDING_OR_COVERAGE/)
})
test('inventory mismatch or tampered aggregate cannot replace missing coverage',()=>{
 const e=evidence();e[0].manifest.inventory_sha256='b'.repeat(64);assert.throws(()=>union(e,source,run,attempt,'success'),/BINDING/)
 const dropped=evidence();dropped[0].proof.tests.pop();assert.throws(()=>union(dropped,source,run,attempt,'success'),/COVERAGE/)
})
test('policy preserves one worker, no retry and original test timeout',()=>{
 for(const mutate of [r=>r.config.workers=2,r=>r.config.projects[0].timeout=180001,r=>r.config.projects[0].retries=1,r=>r.config.projects[0].repeatEach=2]){const r=report();mutate(r);assert.throws(()=>manifest(r,source,run,attempt),/POLICY/)}
})
test('workflow isolates projects, retains per-project artifacts and closes union after all jobs',()=>{
 const ci=readFileSync('.github/workflows/ci.yml','utf8'),preview=ci.split('  preview-browser:')[1].split('  preview-windows:')[0]
 assert.match(preview,/timeout-minutes: 20/);assert.match(preview,/fail-fast: false/);assert.match(preview,/project: \[desktop, mobile\]/)
 assert.match(preview,/--project=\$\{\{ matrix.project \}\}/)
 assert.match(preview,/Production fixture closure/);assert.match(preview,/Local launcher and child cleanup/)
 assert.match(preview,/name: preview-coverage-\$\{\{ matrix.project \}\}/)
 assert.match(preview,/needs: preview-browser\s+if: always\(\)/)
 assert.match(preview,/PREVIEW_JOBS_RESULT: \$\{\{ needs.preview-browser.result \}\}/)
 assert.doesNotMatch(preview,/continue-on-error|--grep|--retries|--workers|--timeout/)
})
