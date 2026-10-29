import test from 'node:test'
import assert from 'node:assert/strict'
import {productStagingErrors} from '../../scripts/platform/product-staging-profile.mjs'
import {stagingAppOriginV1,stagingEasyPanelOriginV1,stagingSupabaseUrlV1} from '../../src/lib/server/product-staging-admission-v1.ts'
const env={PLATFORM_TARGET:'STAGING',NODE_ENV:'production',APP_ENV:'staging',PRODUCT_V1_ENABLED:'true',PRODUCT_V1_ORIGIN:stagingEasyPanelOriginV1,NEXT_PUBLIC_APP_URL:stagingEasyPanelOriginV1,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only',PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:'true',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001'}
for(const origin of [stagingEasyPanelOriginV1,stagingAppOriginV1])for(const name of ['PRODUCT_DOCUMENT_LIBRARY_ENABLED','PRODUCT_DOCUMENT_CONTENT_ENABLED','PRODUCT_DOCUMENT_MAINTENANCE_ENABLED'])test('managed hosted-schema profile keeps capability OFF: '+origin+' '+name,()=>{
 const configured={...env,PRODUCT_V1_ORIGIN:origin,NEXT_PUBLIC_APP_URL:origin,PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:origin===stagingEasyPanelOriginV1?'true':undefined}
 assert.deepEqual(productStagingErrors({...configured,[name]:'false'}),[])
 assert.deepEqual(productStagingErrors({...configured,[name]:undefined}),[])
 for(const value of ['true','TRUE','1',''])assert.ok(productStagingErrors({...configured,[name]:value}).includes('PRODUCT_STAGING_CAPABILITY_FORBIDDEN_'+name))
})
