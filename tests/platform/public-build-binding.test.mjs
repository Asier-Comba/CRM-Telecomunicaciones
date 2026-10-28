import {test} from 'node:test'
import assert from 'node:assert/strict'
import {evaluateRuntime} from '../../scripts/platform/runtime-admission.mjs'
import {createPublicBuildBinding,publicBuildMatches} from '../../scripts/platform/build-binding.mjs'
import {stagingAppOriginV1,stagingSupabaseUrlV1} from '../../src/lib/server/product-staging-admission-v1.ts'
const env=()=>({PLATFORM_TARGET:'STAGING',NODE_ENV:'production',APP_ENV:'staging',PRODUCT_V1_ENABLED:'true',PRODUCT_V1_ORIGIN:stagingAppOriginV1,NEXT_PUBLIC_APP_URL:stagingAppOriginV1,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only',PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001',BACKUP_RETENTION_DAYS:'7'})
const policy=()=>({version:'product.staging.runtime.v1',status:'ACCEPTED',origin:stagingAppOriginV1,auth:'supabase-managed',capabilities:{ai:false,crm_mail:false,n8n:false,document_content:false,document_maintenance:false},reviews:{w2:'APPROVED',w5:'APPROVED',w4:'APPROVED'},production_accepted:false})
test('accepted policy cannot start a missing or unconfigured browser artifact',()=>{
 for(const binding of [undefined,{version:1,configured:false,public_sha256:'0'.repeat(64)}]){
  const result=evaluateRuntime(env(),'STAGING',policy(),binding)
  assert.equal(result.accepted,false);assert.equal(result.code,'IMAGE_PUBLIC_BUILD_MISMATCH')
 }
})
test('accepted policy cannot substitute runtime public values for a different compiled artifact',()=>{
 const result=evaluateRuntime(env(),'STAGING',policy(),{version:1,configured:true,public_sha256:'0'.repeat(64)})
 assert.equal(result.accepted,false);assert.equal(result.code,'IMAGE_PUBLIC_BUILD_MISMATCH')
})

test('exact public build admits only the same three runtime values and contains no values or private bindings',()=>{
 const input={...env(),SMTP_PASSWORD:'private_synthetic_canary',SUPABASE_SERVICE_ROLE_KEY:'private_synthetic_canary'}
 const binding=createPublicBuildBinding(input)
 assert.equal(evaluateRuntime(env(),'STAGING',policy(),binding).accepted,true)
 assert.equal(publicBuildMatches(env(),binding),true)
 assert.equal(createPublicBuildBinding(env()).public_sha256,binding.public_sha256)
 for(const name of ['NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']){
  const changed={...env(),[name]:env()[name]+'different'}
  assert.equal(publicBuildMatches(changed,binding),false,name)
  assert.ok(!JSON.stringify(binding).includes(env()[name]))
 }
 assert.ok(!JSON.stringify(binding).includes('private_synthetic_canary'))
 for(const change of [{version:2},{configured:false},{public_sha256:'invalid'},{extra:true}])assert.equal(publicBuildMatches(env(),{...binding,...change}),false)
})

test('partial or unsafe public builds fail before binding and unconfigured local images never qualify as staging',()=>{
 const empty=createPublicBuildBinding({})
 assert.equal(empty.configured,false);assert.equal(publicBuildMatches(env(),empty),false)
 for(const change of [{NEXT_PUBLIC_APP_URL:undefined},{NEXT_PUBLIC_SUPABASE_URL:undefined},{NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:undefined},
  {NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_private_canary'},{NEXT_PUBLIC_UNREGISTERED:'private_canary'}])
  assert.throws(()=>createPublicBuildBinding({...env(),...change}),/PUBLIC_BUILD_BINDINGS_INVALID_OR_INCOMPLETE/)
 const e=env(),key=e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 delete e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;e.NEXT_PUBLIC_SUPABASE_ANON_KEY=key
 assert.equal(publicBuildMatches(e,createPublicBuildBinding(env())),true,'same effective browser key with the legacy build alias')
 assert.equal(evaluateRuntime(e,'STAGING',policy(),createPublicBuildBinding(e)).accepted,false,'managed staging still forbids legacy key binding')
})
