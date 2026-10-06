import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
const read=p=>JSON.parse(readFileSync(p,'utf8'))
const providers=read('docs/master/contracts/provider-requirements.json'),bootstrap=read('docs/master/contracts/backend-bootstrap-requirements.json'),environment=read('docs/master/contracts/product-environment.json')
test('provider contracts separate all three mail planes and cannot activate a provider',()=>{
 const mail=providers.email_plane_separation
 assert.equal(new Set([mail.human_business_mail,mail.auth_transactional_email,mail.crm_customer_outbound_email]).size,3)
 assert.equal(mail.same_identity_implicit_reuse_allowed,false)
 assert.equal(providers.values_included,false);assert.equal(providers.provider_activation_authorized,false)
 const ids=new Set();for(const p of providers.providers){assert.ok(!ids.has(p.id));ids.add(p.id);assert.equal(p.enabled_by_default,false);assert.equal(p.concrete_provider_implemented,false);assert.equal(p.activation_authorized,false);assert.deepEqual(p.health_status_contract.states,['not_configured','configured','degraded','unavailable']);assert.ok(p.secret_reference_fields.length>0);assert.equal(p.health_status_contract.no_secret_values,true)}
 for(const name of ['human_business_mail','auth_mail','crm_mail','n8n','ai_provider','telecom_sync','import_staging','document_scanner'])assert.ok(providers.providers.some(p=>p.class===name))
})
test('bootstrap is value-free, exact-schema reconstructable and fails closed for production encrypted processing',()=>{
 assert.deepEqual(bootstrap.database.migrations,readdirSync('supabase/migrations').filter(p=>p.endsWith('.sql')).sort())
 assert.deepEqual(bootstrap.database.extensions,[{name:'pgcrypto',schema:'extensions'},{name:'btree_gist',schema:'extensions'}])
 assert.equal(bootstrap.values_included,false);assert.equal(bootstrap.production_ready,false);assert.equal(bootstrap.no_hidden_dashboard_ddl,true);assert.equal(bootstrap.database.browser_raw_domain_crud_allowed,false)
 assert.ok(bootstrap.supabase.storage_buckets.every(b=>b.public===false))
 assert.equal(bootstrap.synthetic_seed_profile.automatic_reset_seed_enabled,false);assert.equal(bootstrap.synthetic_seed_profile.marker_required,true)
 assert.match(bootstrap.production_encrypted_processing,/FAIL_CLOSED/)
 for(const names of Object.values(bootstrap.required_environment_names.always))for(const name of names)assert.ok(environment.entries.some(e=>e.name===name))
})
test('registered provider prerequisites cannot authorize browser workflow URLs or equate syntax with health',()=>{
 for(const p of providers.providers){for(const name of p.environment_variable_names)assert.ok(environment.entries.some(e=>e.name===name));assert.match(p.health_status_contract.configured_requires,/syntax alone is insufficient/)}
 for(const workflow of providers.registered_workflows){assert.equal(workflow.browser_url_allowed,false);assert.ok(workflow.durable_idempotency_key.includes('workspace'))}
 const auth=providers.providers.find(p=>p.class==='auth_mail'),crm=providers.providers.find(p=>p.class==='crm_mail'),ai=providers.providers.find(p=>p.class==='ai_provider')
 assert.ok(auth.secret_reference_fields.includes('SMTP_PASSWORD'));assert.ok(!crm.secret_reference_fields.includes('SMTP_PASSWORD'));assert.ok(ai.secret_reference_fields.includes('OPENAI_API_KEY'))
 assert.deepEqual(auth.domain_dns_requirements,['verified_sender_domain','SPF','DKIM','DMARC']);assert.ok(ai.configuration_fields.includes('model_policy_reference'))
})
