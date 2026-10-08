import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {companyPreflight,enterprisePlan,simulateEnterprise,saveState,phases,publicConfiguration} from '../../scripts/platform/enterprise.mjs'
const sha='a'.repeat(40)
function configuration(){return {version:3,company:{environment:'STAGING'},ownership:{organization:'synthetic-company',account_class:'COMPANY',administrators:['human-one','human-two'].map(identity=>({identity,human:true,mfa:'PASSKEY',role:'ADMIN'})),billing_owner:'human-one',security_owner:'human-one',asset_owner:'human-two',offboarding_owner:'human-two',recovery_contacts:['human-one','human-two']},choices:{environment:'STAGING',human_mail:'UNSELECTED',hosting:'UNSELECTED',backup:'UNSELECTED',n8n:'DISABLED',ai:'DISABLED'},recovery_policy:{approval:'UNAPPROVED'}}}
test('ownership rejects personal accounts, shared or missing MFA administrators and missing owners',()=>{
 assert.deepEqual(publicConfiguration(configuration()),[])
 for(const mutation of [c=>c.ownership.account_class='PERSONAL',c=>c.ownership.administrators.pop(),c=>c.ownership.administrators[1].identity='HUMAN-ONE',c=>c.ownership.administrators[0].mfa='NONE',c=>c.ownership.billing_owner='',c=>c.choices.environment='PROD',c=>c.ownership.administrators='malformed',c=>c.extra='canary-private']){const c=configuration();mutation(c);assert.ok(publicConfiguration(c).length)}
 for(const mutation of [c=>c.company.app_origin='https://user:password@example.invalid',c=>c.company.supabase_project_ref='private-canary',c=>c.company.smtp_password='private-canary',c=>c.recovery_policy.secret='private-canary']){const c=configuration();mutation(c);assert.ok(publicConfiguration(c).length);assert.throws(()=>enterprisePlan(c,sha),/PUBLIC_CONFIGURATION_INVALID/)}
})
test('read-only preflight never emits input secrets or grants provider, W4, staging acceptance',()=>{
 const r=companyPreflight(configuration(),{SMTP_PASSWORD:'canary-private',NEXT_PUBLIC_SUPABASE_URL:'https://wrong.invalid'},{w4:'APPROVED'})
 assert.equal(r.status,'CONFIGURATION_MISSING');assert.equal(r.readiness.staging,'NOT_PROVEN');assert.equal(r.mutation_performed,false);assert.equal(r.rpo_rto,'UNAPPROVED');assert.ok(r.providers.every(p=>p.status==='PROVIDER_UNAVAILABLE'));assert.ok(!JSON.stringify(r).includes('canary-private'));assert.equal(r.security,'EXACT_SOURCE_REVIEW_STILL_REQUIRED')
 assert.ok(r.errors.includes('PROVIDER_CHOICE_REQUIRED_HOSTING'))
})
test('interrupted simulation resumes with identical idempotency keys; repeats have zero effects',async()=>{
 const plan=enterprisePlan(configuration(),sha),calls=[]
 let interrupted=true
 const adapters={scope:'DISPOSABLE_SIMULATION',...Object.fromEntries(phases.map(phase=>[phase,async({idempotency_key})=>{calls.push({phase,key:idempotency_key});if(phase==='CONFIGURE'&&interrupted)throw new Error('canary-private');return {status:'SIMULATED_PASS',idempotency_key,secret:'canary-private'}}]))}
 const first=await simulateEnterprise(plan,null,adapters);assert.equal(first.status,'BLOCKED');assert.equal(first.phases.at(-1).phase,'CONFIGURE');assert.ok(!JSON.stringify(first).includes('canary-private'))
 interrupted=false;const resumed=await simulateEnterprise(plan,first,adapters);assert.equal(resumed.status,'SIMULATED_PASS');assert.equal(resumed.phases.length,7);assert.equal(calls.filter(c=>c.phase==='PROVISION').length,1);const keys=calls.filter(c=>c.phase==='CONFIGURE').map(c=>c.key);assert.equal(keys[0],keys[1]);const count=calls.length;await simulateEnterprise(plan,resumed,adapters);assert.equal(calls.length,count)
 const dir=mkdtempSync(join(tmpdir(),'w5-enterprise-'));try{saveState(join(dir,'state.json'),resumed);assert.equal(JSON.parse(readFileSync(join(dir,'state.json'))).production,'NOT_PROVEN');assert.throws(()=>saveState(join(dir,'unsafe.json'),{...resumed,source_sha:'private-canary'}),/UNSAFE_STATE/);assert.throws(()=>saveState(join(dir,'unsafe.json'),{...resumed,audit:[{phase:'private-canary',status:'BLOCKED'}]}),/UNSAFE_STATE/)}finally{rmSync(dir,{recursive:true,force:true})}
})
test('target/source/config drift, missing adapter, malformed order and hosted execution fail closed',async()=>{
 const plan=enterprisePlan(configuration(),sha)
 await assert.rejects(()=>simulateEnterprise(plan,null,{scope:'HOSTED'}),/HOSTED_EXECUTION_FORBIDDEN/)
 const state=await simulateEnterprise(plan,null,{scope:'DISPOSABLE_SIMULATION'});assert.equal(state.status,'BLOCKED')
 for(const edit of [x=>x.binding='b'.repeat(64),x=>x.source_sha='b'.repeat(40),x=>x.target='PROD',x=>x.phases=[{phase:'DEPLOY',status:'SIMULATED_PASS'}]]){const s=structuredClone(state);edit(s);await assert.rejects(()=>simulateEnterprise(plan,s,{scope:'DISPOSABLE_SIMULATION'}))}
 assert.throws(()=>enterprisePlan(configuration(),'latest'),/EXACT_SOURCE/)
})
