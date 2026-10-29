import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {authOrigin,authEndpoint,authAppEnvironment,localActionLink} from '../../tools/asier_auth_recovery/policy.mjs'

const local=type=>authEndpoint+'/auth/v1/verify?'+new URLSearchParams({type,token:'SYNTHETIC',redirect_to:authOrigin+'/auth/callback'})
test('invite and recovery links stay on existing exact local callback',()=>{
 for(const type of ['invite','recovery'])assert.equal(localActionLink(local(type),type),local(type))
})
test('hosted, different callback, incomplete and mismatched links are denied without disclosing input',()=>{
 const mutations=[value=>value.replace('127.0.0.1:54321','example.com'),value=>value.replace('http:','https:'),value=>value.replace('verify?','other?'),value=>value.replace('type=invite','type=signup'),value=>value.replace('token=SYNTHETIC','token='),value=>value.replace('3000','3187'),value=>value.replace('auth%2Fcallback','dashboard'),value=>value+'#PRIVATE',value=>value.replace('http://','http://user:PRIVATE@'),()=> 'PRIVATE_INVALID_URL']
 for(const mutate of mutations)assert.throws(()=>localActionLink(mutate(local('invite')),'invite'),error=>error.message==='D1_GLOBAL_AUTH_INVALID_LOCAL_LINK')
 assert.throws(()=>localActionLink(local('invite'),'magiclink'))
})
test('Next environment excludes inherited credentials and keeps all document and AI gates off',()=>{
 const env=authAppEnvironment({PATH:'synthetic-path',SUPABASE_SERVICE_ROLE_KEY:'PRIVATE_SERVICE',NEXT_PUBLIC_SUPABASE_URL:'https://hosted.invalid',OPENAI_API_KEY:'PRIVATE_AI',ARBITRARY:'PRIVATE_OTHER'},'SYNTHETIC_ANON')
 assert.equal(env.PATH,'synthetic-path');assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,authEndpoint);assert.equal(env.PRODUCT_V1_ORIGIN,authOrigin)
 assert.equal(env.NEXT_PUBLIC_SUPABASE_ANON_KEY,'SYNTHETIC_ANON')
 for(const key of ['PRODUCT_DOCUMENT_LIBRARY_ENABLED','PRODUCT_DOCUMENT_CONTENT_ENABLED','PRODUCT_DOCUMENT_MAINTENANCE_ENABLED','AI_PRODUCT_V2_ENABLED','PRODUCT_STAGING_INTEGRATION'])assert.equal(env[key],'false')
 assert.equal(env.OPENAI_API_KEY,'');assert.equal(JSON.stringify(env).includes('PRIVATE_'),false)
})
for(const scenario of [
 {name:'explicit Auth opt-in missing',scope:'AUTH_RECOVERY_ONLY',flag:'false',error:'D1_GLOBAL_AUTH_RECOVERY_OPT_IN_REQUIRED',recovery:true},
 {name:'ordinary Auth run',scope:'AUTH_RECOVERY_ONLY',flag:'true',error:'D1_GLOBAL_EXPLICIT_DISPOSABLE_CI_ONLY',recovery:true},
 {name:'unknown scope',scope:'UNKNOWN',flag:'true',error:'D1_GLOBAL_UNKNOWN_ACCEPTANCE_SCOPE',recovery:false},
 {name:'default remains full',scope:'',flag:'false',error:'D1_GLOBAL_EXPLICIT_DISPOSABLE_CI_ONLY',recovery:false},
 {name:'late diagnostic remains separate',scope:'LATE_ROLE_ONLY',flag:'false',error:'D1_GLOBAL_EXPLICIT_DISPOSABLE_CI_ONLY',recovery:false},
])test(scenario.name+' refuses before any resource command',t=>{
 const parent=resolve(tmpdir()),dir=mkdtempSync(join(parent,'auth-recovery-guard-'))
 t.after(()=>{assert.equal(dirname(dir),parent);assert.ok(dir.startsWith(join(parent,'auth-recovery-guard-')));rmSync(dir,{recursive:true})})
 const result=spawnSync(process.execPath,['--experimental-transform-types','tools/asier_documents_global/run.mjs'],{cwd:fileURLToPath(new URL('../../',import.meta.url)),env:{...process.env,CI:'false',GITHUB_ACTIONS:'false',DOCUMENTS_GLOBAL_AUTH:'false',DOCUMENTS_GLOBAL_SCOPE:scenario.scope,AUTH_RECOVERY_ACCEPTANCE:scenario.flag,RUNNER_TEMP:dir},encoding:'utf8',timeout:30000,windowsHide:true})
 assert.equal(result.status,1)
 const report=JSON.parse(readFileSync(join(dir,'documents-global-d1.safe.json'),'utf8'))
 assert.equal(report.error,scenario.error);assert.deepEqual(report.checks,[]);assert.equal(report.command_failure,undefined);assert.equal(report.source,undefined);assert.equal(report.storage_88_adopted,false)
 assert.equal(report.acceptance_scope,scenario.recovery?'LOCAL_AUTH_BROWSER_ONLY':scenario.scope==='LATE_ROLE_ONLY'?'LATE_ROLE_DIAGNOSTIC_ONLY':'FULL')
 if(scenario.recovery){assert.equal(report.STAGING_DEPLOYED,false);assert.equal(report.STAGING_ACCEPTED,false);assert.equal(report.workspace_acceptance,'NOT_RUN')}
})
