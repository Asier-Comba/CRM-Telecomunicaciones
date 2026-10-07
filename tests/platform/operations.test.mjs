import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateCompany,validateWorkflow,verifyDns,safeEvent,preflight} from '../../scripts/platform/operations.mjs'
import {readJson} from '../../scripts/platform/lib.mjs'
const company=()=>({environment:'STAGING',app_origin:'https://app.example.invalid',supabase_project_ref:'a'.repeat(20),administrators:['named-owner-a','named-owner-b'],auth:{redirect_urls:['https://app.example.invalid/auth/callback'],email_confirmation:true,mfa_required:true},dns:[{type:'TXT',name:'example.invalid',expected:['provider-supplied-value']}],backup:{retention_days:7,rpo_seconds:60,rto_seconds:3600,key_reference:'secret-store-reference',offsite_reference:'offsite-reference'}})
test('company config rejects shared admins, unsafe redirects and unapproved backup policy',()=>{
 assert.equal(validateCompany(company()).status,'VALID')
 for(const mutate of [c=>c.administrators=['same','same'],c=>c.auth.redirect_urls=['https://attacker.invalid'],c=>c.backup.retention_days=0,c=>c.secret='not-allowed',c=>c.auth.smtp_password='private',c=>c.dns[0].token='private']){const c=company();mutate(c);assert.equal(validateCompany(c).status,'BLOCKED')}
})
test('DNS is read-only and compares exact provider supplied records',async()=>{
 assert.equal((await verifyDns(company(),{TXT:async()=>[['provider-','supplied-value']]})).status,'PASS')
 assert.equal((await verifyDns(company(),{TXT:async()=>[['wrong']]})).status,'BLOCKED')
 assert.equal((await verifyDns(company(),{TXT:async()=>{throw new Error('not found')}})).checks[0].status,'UNAVAILABLE')
})
test('workflow exports reject credentials, executable code and activated effects',()=>{
 const w=readJson('infra/n8n/synthetic-health.json');assert.equal(validateWorkflow(w).status,'VALID')
 assert.equal(validateWorkflow({...w,credentials:{id:'private'}}).status,'BLOCKED')
 assert.equal(validateWorkflow({...w,active:true}).status,'BLOCKED')
 assert.equal(validateWorkflow({...w,nodes:[{type:'n8n-nodes-base.httpRequest',parameters:{url:'https://external.invalid'}}]}).status,'BLOCKED')
})
test('structured events exclude all unregistered content and PII fields',()=>{
 const e=safeEvent('backup_failed',{component:'backup',status:'FAIL',duration_ms:20,token:'canary-jwt',email:'synthetic@example.invalid',message:'canary-customer-content',url:'postgres://password',arbitrary:'canary'})
 assert.ok(!JSON.stringify(e).includes('canary'));assert.ok(!JSON.stringify(e).includes('postgres'));assert.equal(e.duration_ms,20)
 assert.throws(()=>safeEvent('arbitrary'),/UNREGISTERED/)
})
test('production preflight is read-only and cannot award approval',()=>{
 const p=preflight('PROD',{PLATFORM_TARGET:'PROD'});assert.equal(p.status,'BLOCKED');assert.equal(p.mutation_performed,false);assert.equal(p.checks.w4,'REQUIRED')
})
