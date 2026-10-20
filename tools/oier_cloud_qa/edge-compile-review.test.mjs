import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {transformSync}=require('next/dist/build/swc')
const {getDefineEnv}=require('next/dist/build/define-env')
const {defaultConfig}=require('next/dist/server/config-shared')
const file='src/lib/server/product-staging-admission-v1.ts'
const source=readFileSync(file,'utf8')
const actor='10000000-0000-4000-8000-000000000001'
const other='10000000-0000-4000-8000-000000000002'
const fixture=()=>({APP_ENV:'staging',PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_V1_ENABLED:'true',PRODUCT_STAGING_USER_IDS:actor,PRODUCT_V1_ORIGIN:'https://crm-telecom-staging-preview.netlify.app',NEXT_PUBLIC_SUPABASE_URL:'https://zgwotxnyqzfuzcnmgvtn.supabase.co'})
const user=id=>({id,email:'synthetic@example.invalid',email_confirmed_at:'2026-10-01T00:00:00Z',is_anonymous:false})
// Installed Next compiler + its real production define, with a controlled runtime.
// Not a Netlify build/deploy, Deno execution, Auth/DB or independent security review.
function compile(text,environment){
 const defines=getDefineEnv({config:defaultConfig,dev:false,isEdgeServer:true,isClient:false,isNodeServer:false,isTurbopack:false,distDir:'.next',projectPath:process.cwd(),hasRewrites:false})
 assert.equal(defines['process.env.NODE_ENV'],'"production"')
 const {code}=transformSync(text,{filename:file,jsc:{parser:{syntax:'typescript'},target:'es2022',transform:{optimizer:{simplify:false,globals:{envs:{NODE_ENV:defines['process.env.NODE_ENV']}}}}},module:{type:'commonjs'}})
 const compiledModule={exports:{}}
 new Function('module','exports','process',code)(compiledModule,compiledModule.exports,{env:environment})
 return compiledModule.exports
}

test('real Next production define closes the parent failure with NODE_ENV absent from runtime env',()=>{
 const environment=fixture()
 assert.equal(Object.hasOwn(environment,'NODE_ENV'),false)
 const parent=execFileSync('git',['show','3b80c50d13bc0a9a52f6662de46a1e8b9581c62b:'+file],{encoding:'utf8'})
 assert.equal(compile(parent,environment).readStagingAdmissionV1(environment).status,'invalid')
 assert.equal(compile(source,environment).readStagingAdmissionV1(environment).status,'enabled')
})

test('inlined runtime positive cannot grant admission to an arbitrary env object',()=>{
 const environment=fixture(),admission=compile(source,environment)
 assert.equal(admission.readStagingAdmissionV1({...environment}).status,'invalid')
 assert.equal(admission.readStagingAdmissionV1({...environment,NODE_ENV:'development'}).status,'invalid')
})

for(const [name,value] of [['APP_ENV',undefined],['APP_ENV','production'],['PRODUCT_V1_ORIGIN','https://other.example.invalid'],['NEXT_PUBLIC_SUPABASE_URL','https://other.supabase.co'],['PRODUCT_STAGING_USER_IDS',undefined],['PRODUCT_LOCAL_INTEGRATION','true']])test('compiled runtime still rejects binding '+name+'='+String(value),()=>{
 const environment={...fixture(),[name]:value},admission=compile(source,environment)
 assert.equal(admission.readStagingAdmissionV1(environment).status,'invalid')
 assert.equal(admission.userClientBindingV1(environment),'denied')
})

test('compiled runtime denies a non-cohort root identity despite privileged metadata',async()=>{
 const environment=fixture(),admission=compile(source,environment),policy=admission.readStagingAdmissionV1(environment)
 assert.equal(await admission.stagingClientAdmittedV1(policy,{auth:{getUser:async()=>({error:null,data:{user:{...user(other),user_metadata:{id:actor,role:'owner'}}}})}}),false)
})

test('compiled admission rechecks identity and configured revocation on the next call',async()=>{
 const environment=fixture(),admission=compile(source,environment)
 let who=actor,reads=0
 const client={auth:{getUser:async()=>{reads++;return{error:null,data:{user:user(who)}}}}}
 assert.equal(await admission.stagingClientAdmittedV1(admission.readStagingAdmissionV1(environment),client),true)
 who=other
 assert.equal(await admission.stagingClientAdmittedV1(admission.readStagingAdmissionV1(environment),client),false)
 who=actor;environment.PRODUCT_STAGING_USER_IDS=other
 assert.equal(await admission.stagingClientAdmittedV1(admission.readStagingAdmissionV1(environment),client),false)
 assert.equal(reads,3)
})
