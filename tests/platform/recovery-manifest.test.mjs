import {test} from 'node:test'
import assert from 'node:assert/strict'
import {recoveryManifest,verifyRecoveryManifest} from '../../scripts/platform/recovery-manifest.mjs'
test('archive binds every canonical migration, public configuration, software and secret reference before restore',()=>{
 const manifest=recoveryManifest();assert.equal(verifyRecoveryManifest(manifest,manifest).configuration_files,11);assert.equal(manifest.migrations.length,74)
 for(const name of ['20261006221429_assistant_conversations_v2.sql','20261006224734_assistant_history_rpc_only.sql','20261007214224_assistant_turn_single_clock.sql','20261008010000_align_provider_rpc_execution_grants.sql'])assert.ok(manifest.migrations.some(m=>m.name===name))
 assert.equal(manifest.secret_references.length,26);for(const name of ['N8N_DATABASE_PASSWORD_FILE','N8N_ENCRYPTION_SECRET_FILE'])assert.ok(manifest.secret_references.some(r=>r.name===name))
 const mutations=[m=>m.source_sha='a'.repeat(40),m=>m.package_lock_sha256='b'.repeat(64),m=>m.migrations.push({name:'20990101000000_unknown.sql'}),m=>m.migrations[0].sha256='c'.repeat(64),m=>m.configuration.pop(),m=>m.configuration[0].bytes=Buffer.from('corrupt').toString('base64'),m=>m.configuration[0].path='../unsafe',m=>m.secret_references[0].destination='personal',m=>m.workflow_activation='ENABLED',m=>m.private_secret_values_included=true]
 for(const mutation of mutations){const actual=structuredClone(manifest);mutation(actual);assert.throws(()=>verifyRecoveryManifest(actual,manifest))}
})

test('public-only recovery manifest rejects undeclared fields at every inventory boundary',()=>{
 const manifest=recoveryManifest()
 for(const mutate of [m=>m.undeclared='synthetic-only',m=>m.configuration[0].undeclared='synthetic-only',m=>m.migrations[0].undeclared='synthetic-only',m=>m.secret_references[0].undeclared='synthetic-only']){
  const bad=structuredClone(manifest);mutate(bad)
  assert.throws(()=>verifyRecoveryManifest(bad,manifest))
 }
})

test('public configuration must retain the exact canonical captured encoding',()=>{
 const manifest=recoveryManifest()
 for(const mutate of [m=>m.configuration[0].bytes+='!',m=>m.configuration[0].bytes+='\n',m=>{const entry=m.configuration.find(e=>/=+$/.test(e.bytes));assert.ok(entry,'capture includes a padded encoding fixture');entry.bytes=entry.bytes.replace(/=+$/,'')}]){
  const bad=structuredClone(manifest);mutate(bad)
  assert.throws(()=>verifyRecoveryManifest(bad,manifest))
 }
})
