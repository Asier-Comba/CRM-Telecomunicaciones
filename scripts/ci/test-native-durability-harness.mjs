import assert from 'node:assert/strict'
import { DURABILITY_CASES, runNativeDurabilitySuite } from '../security/native-durability-harness.mjs'
const base=()=>({environment:async()=>({engine:'native-postgresql',environment:'test',synthetic:true,isolated:true,productionReachable:false}),run:async id=>({caseId:id,passed:true,crossWorkspaceAccess:false,crossActorAccess:false,automaticSecondEffect:false,effectCount:id.startsWith('cross-')?0:1,backendPids:Array.from({length:20},(_,i)=>i+1),clientPids:Array.from({length:20},(_,i)=>i+101),winners:1,processRestartObserved:true,persistedStateRecovered:true,killSignalObserved:true,finalState:'reconciliation_required',atomicCommitVerified:true,orphanOutboxCount:0,originalAuditIntentCount:1,originalAuditDeliveredCount:1,sinkOutageInjected:true,denied:true})})
assert.equal((await runNativeDurabilitySuite(base())).results.length,DURABILITY_CASES.length)
await assert.rejects(runNativeDurabilitySuite(null))
for(const environment of [{engine:'pglite'},{engine:'map'},{productionReachable:true},{synthetic:false},{environment:'production'}]) {
 const a=base(), original=a.environment;a.environment=async()=>({...await original(),...environment});await assert.rejects(runNativeDurabilitySuite(a))
}
for(const patch of [{effectCount:2},{effectCount:-1},{backendPids:[1]},{clientPids:[1]},{winners:2},{automaticSecondEffect:true},{crossWorkspaceAccess:true},{crossActorAccess:true},{processRestartObserved:false},{persistedStateRecovered:false},{killSignalObserved:false},{atomicCommitVerified:false},{orphanOutboxCount:1},{originalAuditIntentCount:0},{originalAuditDeliveredCount:0},{sinkOutageInjected:false},{errorCode:'raw provider detail'}]) {
 const a=base(), original=a.run;a.run=async id=>({...await original(id),...patch});await assert.rejects(runNativeDurabilitySuite(a))
}
console.log('Native durability report validator self-test PASS; synthetic reports only, NO native database evidence')
