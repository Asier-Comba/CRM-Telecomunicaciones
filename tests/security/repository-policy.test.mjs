import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateRepositoryPolicy,prepareDisabledRuleset} from '../../scripts/ci/repository-policy.mjs'
const fixture=()=>JSON.parse(readFileSync(new URL('../../.github/security/default-branch-policy.json',import.meta.url),'utf8'))
test('proposal is inert and cannot turn successful local tests into live administrative protection',()=>{
 const p=fixture(),r=validateRepositoryPolicy(p);assert.equal(r.live_protection_verified,false);assert.equal(r.admin_activation_authorized,false)
 assert.throws(()=>prepareDisabledRuleset(p,{scope:'LOCAL_PREPARATORY',actions_app_id:1}),/VERIFIED_CHECK_APP_REQUIRED/)
 p.trusted_actions_app_id=1 // synthetic API identity, never a claimed live app
 const rules=prepareDisabledRuleset(p,{scope:'LOCAL_PREPARATORY',actions_app_id:1})
 assert.equal(rules.enforcement,'disabled');assert.deepEqual(rules.bypass_actors,[]);assert.deepEqual(rules.conditions.ref_name,{include:['~DEFAULT_BRANCH'],exclude:[]})
 assert.ok(rules.rules.at(-1).parameters.required_status_checks.every(c=>c.integration_id===1))
 assert.throws(()=>prepareDisabledRuleset(p,{scope:'PROD',actions_app_id:1}),/VERIFIED_CHECK_APP_REQUIRED/)
})
test('missing/duplicate checks, stale/self approval and fabricated live protection fail closed',()=>{
 for(const mutate of [p=>p.required_contexts.pop(),p=>p.required_contexts[1]='reachable-history',p=>p.required_independent_approvals=1,p=>p.last_push_independent_approval=false,p=>p.dismiss_stale_reviews=false,p=>p.admin_activation_authorized=true,p=>p.live_protection_verified=true]){const p=fixture();mutate(p);assert.throws(()=>validateRepositoryPolicy(p))}
})
