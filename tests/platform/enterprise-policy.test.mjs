import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync,mkdirSync,writeFileSync,rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { contract, inventory, validateContracts, validateEnvironment, exactUrl, policyDiff } from '../../scripts/platform/policy.mjs'
import { scanClientGraph } from '../../scripts/platform/client-secret-gate.mjs'
export function fixture(target='PROD') {
 const c={target,values:{},secretRefs:{},environmentBindings:{DEV:{},STAGING:{},PROD:{}},ownership:{companyOwnerApproved:true,namedAdminRefs:['named-primary','named-secondary'],mfaRequired:true,billingOwnerRole:'billing',recoveryOwnerRole:'custodian',backupOperatorRole:'backup',restoreApproverRole:'approver',securityReviewerRole:'reviewer',businessOwnerRole:'business'},demoEnabled:false,mailTransport:'CUSTOM',authPolicyApproved:true}, runtime={}
 for(const r of contract.environments[target].resources) {
  for(const e of ['DEV','STAGING','PROD'])c.environmentBindings[e][r.name]=`${e}/binding/${r.name}`
  if(r.requirement==='OPTIONAL')continue
  if(r.classification==='SECRET'){c.secretRefs[r.name]=`${target}/binding/${r.name}`;runtime[r.name]='synthetic-presence-only'}else c.values[r.name]='synthetic'
 }
 Object.assign(c.values,{SUPABASE_PROJECT_REF:'syntheticproject',SUPABASE_URL:'https://syntheticproject.supabase.co',PUBLIC_APP_URL:'https://app.example.invalid',AUTH_REDIRECT_URLS:'["https://app.example.invalid/auth/callback"]',STORAGE_BUCKETS:JSON.stringify(contract.storageBuckets),SMTP_PORT:'587',SMTP_FROM:'auth@example.invalid'})
 return {c,runtime}
}
test('contracts validate and do not confuse DB/object recovery',()=>{assert.deepEqual(validateContracts(),[]);assert.equal(contract.rules.databaseRestoreIsStorageRestore,false)})
test('inventory exposure, missing inventory and unknown secret value fail',()=>{
 for(const mutate of [s=>s.entries[0].clientExposureAllowed=true,s=>s.entries[0].value='forbidden',s=>s.entries=s.entries.filter(e=>e.name!=='SMTP_PASSWORD')]){const s=structuredClone(inventory);mutate(s);assert.notDeepEqual(validateContracts(contract,s),[])}
})
test('synthetic approved structural fixture passes without operational claim',()=>{const {c,runtime}=fixture();assert.deepEqual(validateEnvironment('PROD',c,runtime),[])})
for(const [label,mutate] of Object.entries({missingSecret:({runtime})=>delete runtime.SMTP_PASSWORD,publicSecret:({runtime})=>runtime.NEXT_PUBLIC_SMTP_PASSWORD='forbidden',defaultSmtp:({c})=>c.mailTransport='DEFAULT',demo:({c})=>c.demoEnabled=true,noOwner:({c})=>c.ownership.companyOwnerApproved=false,singleAdmin:({c})=>c.ownership.namedAdminRefs=['only'],noMfa:({c})=>c.ownership.mfaRequired=false,sameRecovery:({c})=>c.ownership.restoreApproverRole=c.ownership.backupOperatorRole,unapprovedAuth:({c})=>c.authPolicyApproved=false,sharedSecretRef:({c})=>c.environmentBindings.STAGING.SMTP_PASSWORD=c.environmentBindings.PROD.SMTP_PASSWORD,sharedNamespace:({c})=>c.environmentBindings.STAGING.SECRET_MANAGER_NAMESPACE=c.environmentBindings.PROD.SECRET_MANAGER_NAMESPACE,missingBinding:({c})=>delete c.environmentBindings.PROD.SUPABASE_PROJECT_REF,wrongRef:({c})=>c.secretRefs.SMTP_PASSWORD='STAGING/binding/SMTP_PASSWORD',rawSecretInConfig:({c})=>c.values.SMTP_PASSWORD='must-not-print',bucketPublic:({c})=>c.values.STORAGE_BUCKETS='["public"]',wrongHost:({c})=>c.values.SUPABASE_URL='https://foreign.supabase.co'}))test(`reject ${label}`,()=>{const f=fixture();mutate(f);const e=validateEnvironment('PROD',f.c,f.runtime);assert.ok(e.length);assert.ok(!JSON.stringify(e).includes('must-not-print'))})
for(const redirect of ['https://evil.example','//evil.example','https://app.example.invalid.evil.example/auth/callback','https://app.example.invalid@evil.example/auth/callback','https://%61pp.example.invalid/auth/callback','javascript:alert(1)','data:text/html,hi','https://app.example.invalid/auth/callback?next=https://evil.example','https://app.example.invalid/*','http://127.0.0.1.evil.example:3000/auth/callback'])test(`redirect attack ${redirect}`,()=>{const f=fixture();f.c.values.AUTH_REDIRECT_URLS=JSON.stringify([redirect]);assert.ok(validateEnvironment('PROD',f.c,f.runtime).includes('REDIRECT_POLICY'))})
test('loopback exactness and safe policy diff',()=>{assert.ok(exactUrl('http://127.0.0.1:3000',true));assert.equal(exactUrl('http://localhost.evil:3000',true),null);assert.equal(policyDiff().output,'NAMES_ONLY')})
test('client graph rejects transitive secrets, reexports, bracket access and server-only',()=>{
 const dir=mkdtempSync(join(tmpdir(),'w4-client-'));mkdirSync(join(dir,'app'));mkdirSync(join(dir,'lib'))
 try {writeFileSync(join(dir,'app/client.tsx'),"'use client'; import { x } from '@/lib/barrel';");writeFileSync(join(dir,'lib/barrel.ts'),"export * from './secret';")
 for(const value of ["export const x = process.env.SMTP_PASSWORD","export const x = process.env['BACKUP_ENCRYPTION_KEY']","import 'server-only'; export const x=1"]){writeFileSync(join(dir,'lib/secret.ts'),value);assert.ok(scanClientGraph(dir).errors.length)}
 writeFileSync(join(dir,'lib/secret.ts'),'export const x=1');assert.deepEqual(scanClientGraph(dir).errors,[])
 }finally{rmSync(dir,{recursive:true,force:true})}
})
test('client aliases follow actual src mapping',()=>{
 const dir=mkdtempSync(join(tmpdir(),'w4-alias-'));mkdirSync(join(dir,'src/lib'),{recursive:true});mkdirSync(join(dir,'src/app'),{recursive:true})
 try{writeFileSync(join(dir,'tsconfig.json'),JSON.stringify({compilerOptions:{paths:{'@/*':['./src/*']}}}));writeFileSync(join(dir,'src/app/page.tsx'),"'use client'; import { x } from '@/lib/private';");writeFileSync(join(dir,'src/lib/private.ts'),"export const x = process.env.SUPABASE_SERVICE_ROLE_KEY");assert.ok(scanClientGraph(dir).errors.includes('CLIENT_SECRET_REFERENCE'))}finally{rmSync(dir,{recursive:true,force:true})}
})
