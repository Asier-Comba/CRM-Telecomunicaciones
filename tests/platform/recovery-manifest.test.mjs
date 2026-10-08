import {test} from 'node:test'
import assert from 'node:assert/strict'
import {recoveryManifest,verifyRecoveryManifest} from '../../scripts/platform/recovery-manifest.mjs'
test('archive binds every canonical migration, public configuration, software and secret reference before restore',()=>{
 const manifest=recoveryManifest();assert.equal(verifyRecoveryManifest(manifest,manifest).configuration_files,11);assert.equal(manifest.migrations.length,71)
 assert.equal(manifest.secret_references.length,26);for(const name of ['N8N_DATABASE_PASSWORD_FILE','N8N_ENCRYPTION_SECRET_FILE'])assert.ok(manifest.secret_references.some(r=>r.name===name))
 const mutations=[m=>m.source_sha='a'.repeat(40),m=>m.package_lock_sha256='b'.repeat(64),m=>m.migrations.push({name:'20990101000000_unknown.sql'}),m=>m.migrations[0].sha256='c'.repeat(64),m=>m.configuration.pop(),m=>m.configuration[0].bytes=Buffer.from('corrupt').toString('base64'),m=>m.configuration[0].path='../unsafe',m=>m.secret_references[0].destination='personal',m=>m.workflow_activation='ENABLED',m=>m.private_secret_values_included=true]
 for(const mutation of mutations){const actual=structuredClone(manifest);mutation(actual);assert.throws(()=>verifyRecoveryManifest(actual,manifest))}
})
