import {test} from 'node:test'
import assert from 'node:assert/strict'
import {recoveryPoint} from '../../scripts/platform/recovery-point.mjs'
import {createAlertSink} from '../../scripts/platform/monitor-contract.mjs'
const now_ms=2_000_000,source_sha='a'.repeat(40),restore_set_digest='b'.repeat(64)
function input(age=900,n8n_enabled=false){return {scope:'DISPOSABLE_SIMULATION',source_sha,now_ms,n8n_enabled,points:['database','auth','storage_objects','storage_metadata','configuration','secret_references',...(n8n_enabled?['n8n_database','n8n_configuration']:[])].map(component=>({component,source_sha,restore_set_digest,recoverable_at_ms:now_ms-age*1000,authenticated_readback:true,empty_restore_verified:true,offsite_readback_verified:true,key_custody_verified:true}))}}
test('15 minute objective uses the oldest complete recoverable component, not last job completion',()=>{
 assert.equal(recoveryPoint(input()).status,'SIMULATED_WITHIN_OBJECTIVE')
 const late=input(1);late.points.find(p=>p.component==='storage_objects').recoverable_at_ms=now_ms-900001
 const result=recoveryPoint(late);assert.equal(result.age_seconds,901);assert.equal(result.status,'BLOCKED');assert.equal(result.sample.status,'DEGRADED')
 assert.equal(result.production_rpo_verified,false);assert.equal(result.provider_adapter_accepted,false)
})
test('PITR/database alone, missing Storage bytes and unverified restore/readback/custody remain blocked',()=>{
 const missing=input();missing.points=missing.points.filter(p=>p.component!=='storage_objects');assert.ok(recoveryPoint(missing).errors.includes('MISSING_STORAGE_OBJECTS'))
 const databaseOnly=input();databaseOnly.points=databaseOnly.points.slice(0,1);assert.equal(recoveryPoint(databaseOnly).status,'BLOCKED')
 for(const proof of ['authenticated_readback','empty_restore_verified','offsite_readback_verified','key_custody_verified']){const bad=input();bad.points[0][proof]=false;assert.equal(recoveryPoint(bad).status,'BLOCKED')}
})
test('future clocks, mixed restore sets, stale software, duplicates and unknown components cannot award a healthy point',()=>{
 for(const mutate of [p=>p.recoverable_at_ms=now_ms+1,p=>p.recoverable_at_ms=NaN,p=>p.restore_set_digest='c'.repeat(64),p=>p.source_sha='d'.repeat(40)]){const bad=input();mutate(bad.points[1]);assert.equal(recoveryPoint(bad).status,'BLOCKED')}
 const duplicated=input();duplicated.points.push(duplicated.points[0]);assert.throws(()=>recoveryPoint(duplicated),/COMPONENT_INVALID/)
 const unknown=input();unknown.points[0].component='private@example.invalid';assert.throws(()=>recoveryPoint(unknown),/COMPONENT_INVALID/)
 assert.throws(()=>recoveryPoint({...input(),scope:'PROD'}),/CONTRACT_INVALID/)
})
test('enabled n8n requires its DB and configuration; alert capture is metadata only and never external delivery',()=>{
 const complete=input(1,true);assert.equal(recoveryPoint(complete).status,'SIMULATED_WITHIN_OBJECTIVE')
 complete.points.pop();const result=recoveryPoint(complete);assert.equal(result.status,'BLOCKED')
 const sink=createAlertSink({scope:'DISPOSABLE_SIMULATION'});assert.equal(sink.evaluate(result.sample,1).status,'CAPTURED');assert.equal(sink.evaluate(result.sample,2).status,'DEDUPLICATED')
 const withPrivate=input();withPrivate.points[0].password='private-canary';withPrivate.points[0].customer='private@example.invalid'
 assert.equal(JSON.stringify(recoveryPoint(withPrivate)).includes('private'),false)
 assert.equal(result.external_delivery_proven,false)
})
