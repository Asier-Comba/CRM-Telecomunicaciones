import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createNativeDatabaseRestartInspectorV3} from '../../scripts/security/native-postgres/durable-database-restart-inspection-v3.mjs'
import {validateDatabaseRestartEvidence} from '../../src/assistant/durable-process-spec-v3.ts'
const scope={actorId:'a1000000-0000-4000-8000-000000000001',workspaceId:'b2000000-0000-4000-8000-000000000001',capability:'fixture.restart',argumentsDigest:'a'.repeat(64),operationRef:'operation_fixture_restart_001'}
const row=()=>({...scope,state:'completed'})
const snapshot=(patch={})=>({database:'telecom_test',system:'1234567890123456789',started:1000,rows:[row()],...patch})
test('restart inspector measures later postmaster on same system with unchanged actual persisted binding',async()=>{
 let calls=0;const inspector=createNativeDatabaseRestartInspectorV3(async sql=>{assert.ok(sql.includes('pg_control_system()'));assert.ok(sql.includes('assistant_operations'));calls++;return JSON.stringify(snapshot({started:calls===1?1000:2000}))},scope)
 await inspector.capture();const measured=await inspector.inspect();assert.equal(validateDatabaseRestartEvidence(measured),true);assert.equal(measured.originalBindingDigest,measured.persistedBindingDigest);assert.equal(calls,2)
 await assert.rejects(inspector.inspect());await assert.rejects(inspector.capture())
})
test('connection-only timing or foreign cluster cannot qualify database restart',async()=>{
 for(const after of [snapshot(),snapshot({started:999}),snapshot({system:'9876543210123456789',started:2000})]){
  let calls=0;const inspector=createNativeDatabaseRestartInspectorV3(async()=>JSON.stringify(++calls===1?snapshot():after),scope)
  await inspector.capture();await assert.rejects(inspector.inspect(),{message:'NATIVE_DATABASE_RESTART_INSPECTION_UNAVAILABLE'})
 }
})
test('missing duplicate foreign changed or payload-bearing operation rows cannot become persistence evidence',async()=>{
 for(const rows of [[],[row(),row()],[{...row(),actorId:'a1000000-0000-4000-8000-000000000002'}],[{...row(),argumentsDigest:'b'.repeat(64)}],[{...row(),state:'executing'}],[{...row(),private_body:'synthetic private'}]]){
  const inspector=createNativeDatabaseRestartInspectorV3(async()=>JSON.stringify(snapshot({rows})),scope)
  await assert.rejects(inspector.capture(),{message:'NATIVE_DATABASE_RESTART_INSPECTION_UNAVAILABLE'})
 }
})
test('restart baseline pins admitted scope before awaiting and discards private errors without retry',async()=>{
 const selected={...scope};let calls=0;const inspector=createNativeDatabaseRestartInspectorV3(async()=>{calls++;return JSON.stringify(snapshot({started:calls===1?1000:2000}))},selected)
 await inspector.capture();selected.operationRef='foreign_reference';assert.equal(validateDatabaseRestartEvidence(await inspector.inspect()),true)
 const failed=createNativeDatabaseRestartInspectorV3(async()=>{throw Error('synthetic private row detail')},scope)
 await assert.rejects(failed.capture(),{message:'NATIVE_DATABASE_RESTART_INSPECTION_UNAVAILABLE'});await assert.rejects(failed.inspect())
})
