import {test} from 'node:test'
import assert from 'node:assert/strict'
import {companyState} from '../../scripts/platform/company-state.mjs'
test('company report emits phase/binding names without credentials or awarding live proof',()=>{
 const env={PLATFORM_TARGET:'STAGING',N8N_BASE_URL:'https://automation.example.invalid',N8N_API_KEY:'private-canary-api',N8N_WEBHOOK_SECRET:'private-canary-hook',OPENAI_API_KEY:'private-canary-ai',UNREGISTERED_SECRET:'private-canary-other'}
 const r=companyState({environment:'STAGING'},env)
 assert.equal(r.status,'BLOCKED');assert.equal(r.providers.find(p=>p.name==='n8n').status,'CONFIGURED_NOT_VERIFIED')
 assert.equal(r.bootstrap_state.staging,'NOT_PROVEN');assert.equal(r.bootstrap_state.migrations,'NOT_RUN')
 assert.equal(JSON.stringify(r).includes('private-canary'),false);assert.equal(r.mutation_performed,false)
 assert.ok(r.errors.includes('COMPANY_PROJECT_BINDING_MISMATCH'))
 assert.equal(companyState(null,{}).configuration.company,'BLOCKED')
})
