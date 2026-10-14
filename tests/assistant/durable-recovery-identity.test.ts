import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {mkdtemp, writeFile, readFile, access, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {resolve, join, dirname, basename} from 'node:path'

test('native acceptance runner rejects a reused recovery backend before dispatch and accepts a distinct protocol identity', async()=>{
 // Process protocol regression only. These backend IDs are synthetic Node PIDs,
 // not PostgreSQL connections. This deliberately incomplete adapter stops after
 // reserve_race and cannot claim native persistence or Full23 acceptance.
 const root=resolve(tmpdir()),directory=await mkdtemp(join(root,'w3-recovery-identity-'))
 try{
  for(const reused of [true,false]){
   const fixture=join(directory,reused?'reused':'distinct')
   const adapter=fixture+'.mjs',connections=fixture+'.connections',winner=fixture+'.winner',recovery=fixture+'.recovery',cleanup=fixture+'.cleanup'
   const source=`import {readFileSync,appendFileSync,openSync,closeSync,writeFileSync} from 'node:fs';
export const metadata={contract:'assistant.durable-process.v3',backend:'native_postgres',disposable:true};
export function setupScenario(id){if(id!=='reserve_race')throw Error('private synthetic stop');return 'owned_protocol_fixture'}
export function connectWorker(){
 let ids=[];try{ids=readFileSync(${JSON.stringify(connections)},'utf8').trim().split('\\n').map(Number)}catch{}
 const backend=${reused}&&ids.length===20?ids[0]:process.pid;
 appendFileSync(${JSON.stringify(connections)},String(backend)+'\\n');return backend;
}
export function execute(job){
 if(job.action==='recover_and_drain'){writeFileSync(${JSON.stringify(recovery)},'synthetic recovery executed');return {}}
 try{const fd=openSync(${JSON.stringify(winner)},'wx');closeSync(fd);return {authorization:'granted'}}catch{return {authorization:'denied'}}
}
export function inspectBoundary(){throw Error('unexpected boundary')}
export function inspectScenario(){return {operationCount:1,executionAuthorizations:1,effectCount:1,originalAuditIntents:2,deliveredOriginalEvents:2,pendingOriginalEvents:0,
 unauthorizedRows:0,forbiddenTransitions:0,unregisteredDispatches:0,automaticRedispatches:0,state:'completed',reservationAuditIntents:1,outcomeAuditIntents:1,otherAuditIntents:0,
 outcomeDeliveredEvents:1,outcomePendingEvents:0,baselineOriginalAuditIntents:0,baselineDeliveredOriginalEvents:0,baselinePendingOriginalEvents:0,
 baselineAuditContentDigest:'a'.repeat(64),persistedBaselineAuditContentDigest:'a'.repeat(64)}}
export function cleanupScenario(){writeFileSync(${JSON.stringify(cleanup)},'owned cleanup executed')}
`
   await writeFile(adapter,source)
   const result=spawnSync(process.execPath,['--max-old-space-size=96','scripts/durable-process-acceptance.mjs',adapter],{encoding:'utf8',timeout:20000,maxBuffer:1024*1024})
   assert.equal(result.status,1);assert.equal(result.signal,null);assert.equal(result.stdout,'')
   assert.doesNotMatch(result.stderr,/private synthetic stop|unexpected boundary|UV_HANDLE_CLOSING/)
   const line=result.stderr.split('\n').find(value=>value.startsWith('{"code":"durable_acceptance_failed"'))
   assert.ok(line)
   const report=JSON.parse(line)
   assert.equal(report.completed.length,reused?0:1)
   const ids=(await readFile(connections,'utf8')).trim().split('\n').map(Number)
   const stage=typeof report.stage==='string'&&/^(setup|worker_ready|worker_identity|worker_start|worker_results|worker_outcome_constraints|recovery_ready|recovery_identity|recovery_start|recovery_result|scenario_observation)$/.test(report.stage)?report.stage:'NOT_OBSERVED'
   assert.equal(ids.length,21,'runner_stage='+stage+'; synthetic_connection_rows');assert.equal(new Set(ids.slice(0,20)).size,20)
   assert.equal(ids.slice(0,20).includes(ids[20]!),reused)
   assert.equal(await readFile(cleanup,'utf8'),'owned cleanup executed')
   if(reused)await assert.rejects(access(recovery),{code:'ENOENT'})
   else{
    assert.equal(await readFile(recovery,'utf8'),'synthetic recovery executed')
    assert.equal(report.completed[0].scenario,'reserve_race')
    assert.equal(report.completed[0].passed,true)
    assert.equal(new Set(report.completed[0].identities.map((identity:{backendPid:number})=>identity.backendPid)).size,21)
   }
  }
 }finally{
  assert.equal(dirname(resolve(directory)),root);assert.match(basename(directory),/^w3-recovery-identity-/)
  await rm(directory,{recursive:true,force:true})
 }
})
