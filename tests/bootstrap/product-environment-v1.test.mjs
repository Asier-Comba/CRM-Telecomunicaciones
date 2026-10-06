import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync}from 'node:fs'
import {validateProductEnvironmentV1,mailProductionReadinessV1}from '../../src/lib/server/product-environment-v1.ts'
const manifest=JSON.parse(readFileSync('docs/master/contracts/product-environment.json','utf8'))
const jwt=role=>Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.syntheticSignature'
const local={NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:jwt('anon')}
test('environment inventory is value-free and never places a secret in a public binding',()=>{
 assert.equal(manifest.values_included,false);assert.equal(new Set(manifest.entries.map(r=>r.name)).size,manifest.entries.length)
 for(const row of manifest.entries){assert.deepEqual(Object.keys(row.required).sort(),['LOCALDEV','PROD','STAGING','TEST']);assert.equal('value'in row,false);assert.equal(row.secret&&row.name.startsWith('NEXT_PUBLIC_'),false);assert.ok(row.purpose)}
})
test('environment validation rejects unsafe production/test bindings and returns only names/codes',()=>{
 assert.equal(validateProductEnvironmentV1(manifest,local,'TEST').status,'valid')
 const secret='never-print-synthetic-secret';const bad=validateProductEnvironmentV1(manifest,{...local,PRODUCT_DOCUMENT_VERIFY_KEY_HEX:secret,PRODUCT_V1_ENABLED:'true'},'PROD');assert.equal(bad.status,'invalid');assert.equal(JSON.stringify(bad).includes(secret),false);assert.ok(bad.errors.some(e=>e.name==='PRODUCT_V1_ORIGIN'))
 assert.equal(validateProductEnvironmentV1(manifest,{...local,NEXT_PUBLIC_SUPABASE_ANON_KEY:jwt('service_role')},'TEST').status,'invalid')
 assert.equal(validateProductEnvironmentV1(manifest,{...local,NODE_ENV:'production',IMPORT_STAGING_ADAPTER:'disposable-local',IMPORT_STAGING_TEST_KEY:'a'.repeat(64)},'PROD').status,'invalid')
 assert.equal(validateProductEnvironmentV1(manifest,{...local,N8N_BASE_URL:'http://unsafe.invalid'},'TEST').status,'invalid')
})
test('Auth SMTP and CRM mail stay separate and configured credentials alone cannot prove delivery',()=>{
 const r=mailProductionReadinessV1();assert.equal(r.auth_mail.channel,'platform_auth_smtp');assert.equal(r.crm_mail.channel,'separate_crm_delivery_adapter');assert.equal(r.auth_mail.status,'not_configured');assert.equal(r.crm_mail.status,'not_configured');assert.equal(r.configured_flag_is_connection_proof,false)
 const ready=validateProductEnvironmentV1(manifest,{...local,SMTP_PASSWORD:'synthetic-private-reference',CRM_MAIL_PROVIDER_REF:'synthetic-other-reference'},'TEST');assert.equal(ready.status,'valid');assert.equal(ready.production_mail_verified,false);assert.equal(ready.provider_connections_verified,false)
})
