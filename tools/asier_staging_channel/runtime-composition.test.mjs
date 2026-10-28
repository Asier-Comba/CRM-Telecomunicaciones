import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateEnvironment} from '../../scripts/platform/config.mjs'
import {channelReadiness,publicBuildIdentity} from './contract.mjs'
import {createPublicBuildBinding} from '../../scripts/platform/build-binding.mjs'
import {runRuntimeLab} from './runtime-lab.mjs'
import {stagingAppOriginV1,stagingSupabaseUrlV1} from '../../src/lib/server/product-staging-admission-v1.ts'
test('ordinary execution cannot build an image, contact Docker or write lab evidence',()=>{
 assert.throws(()=>runRuntimeLab({}),/RUNTIME_LAB_NOT_AUTHORIZED/)
})

test('managed staging configuration does not impersonate a platform SMTP control plane',()=>{
 const env={PLATFORM_TARGET:'STAGING',NODE_ENV:'production',APP_ENV:'staging',PRODUCT_V1_ENABLED:'true',PRODUCT_V1_ORIGIN:stagingAppOriginV1,NEXT_PUBLIC_APP_URL:stagingAppOriginV1,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only',PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001',BACKUP_RETENTION_DAYS:'7'}
 const result=validateEnvironment(env,'STAGING')
 assert.equal(result.status,'VALID',JSON.stringify(result))
 assert.equal(result.values_included,false)
})
test('channel report consumes the runtime policy review vocabulary without granting authority',()=>{
 const runtimePolicy={version:'product.staging.runtime.v1',status:'ACCEPTED',origin:stagingAppOriginV1,auth:'supabase-managed',capabilities:{ai:false,crm_mail:false,n8n:false,document_content:false,document_maintenance:false},reviews:{w2:'APPROVED',w5:'APPROVED',w4:'APPROVED'},production_accepted:false}
 const result=channelReadiness({runtimePolicy,originAccepted:true,publicBindingAccepted:true,networkAccepted:true,privateAccessAccepted:true,schemaAccepted:true,independentReleaseAccepted:true})
 assert.deepEqual(result.blockers,[])
 assert.equal(result.publishing_authorized,false)
 assert.equal(result.deploying_authorized,false)
 assert.ok(channelReadiness({runtimePolicy:{...runtimePolicy,origin:undefined}}).blockers.includes('HOSTED_RUNTIME_NOT_ACCEPTED'))
})
test('image binding and publisher fingerprint use the same canonical public tuple',()=>{
 const values={NEXT_PUBLIC_APP_URL:stagingAppOriginV1,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only'}
 assert.equal(createPublicBuildBinding(values).public_sha256,publicBuildIdentity(values))
 for(const field of Object.keys(values)){
  const changed={...values,[field]:values[field]+'x'}
  assert.notEqual(createPublicBuildBinding(changed).public_sha256,publicBuildIdentity(values))
 }
})
