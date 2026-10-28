import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {productReadinessV1} from '../../src/lib/server/product-readiness-v1.ts'
import {stagingEasyPanelOriginV1,stagingAppOriginV1,stagingSupabaseUrlV1} from '../../src/lib/server/product-staging-admission-v1.ts'
const require=createRequire(import.meta.url),ts=require('typescript')
const env={PLATFORM_TARGET:'STAGING',NODE_ENV:'production',APP_ENV:'staging',PRODUCT_V1_ENABLED:'true',PRODUCT_V1_ORIGIN:stagingEasyPanelOriginV1,NEXT_PUBLIC_APP_URL:stagingEasyPanelOriginV1,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only',PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:'true',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001'}
function actual(environment,fetchImpl){
 const source=ts.transpileModule(readFileSync('src/app/api/health/ready/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const fixture={exports:{}}
 new Function('require','module','exports','process','fetch',source)(name=>{assert.equal(name,'@/lib/server/product-readiness-v1');return{productReadinessV1:configured=>productReadinessV1(configured,fetchImpl)}},fixture,fixture.exports,{env:environment},fetchImpl)
 return fixture.exports
}
test('actual readiness route can attest managed EasyPanel connectivity only through fixed private HEAD',async()=>{
 let calls=0
 const response=await actual(env,async(request,init)=>{
  calls++;assert.equal(request.url,'http://crm-telecom-egress:8080/rest/v1/');assert.equal(request.method,'HEAD')
  assert.deepEqual([...request.headers.keys()],['apikey']);assert.equal(request.headers.get('apikey'),env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  assert.equal(request.cache,'no-store');assert.equal(request.signal.aborted,false);assert.equal(init.redirect,'error')
  return new Response(null,{status:200})
 }).GET()
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:'ready'});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(calls,1)
})
test('invalid hosted profiles, production and legacy Netlify make zero provider calls',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw Error('UNEXPECTED_PROVIDER_CALL')}
 for(const patch of [{PLATFORM_TARGET:'PROD'},{APP_ENV:'production'},{PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:undefined},{PRODUCT_STAGING_USER_IDS:undefined},{PRODUCT_V1_ORIGIN:stagingAppOriginV1,NEXT_PUBLIC_APP_URL:stagingAppOriginV1,PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:undefined},{NEXT_PUBLIC_SUPABASE_URL:'https://other.supabase.co'},{PRODUCT_DOCUMENT_LIBRARY_ENABLED:'true'},{PRODUCT_DOCUMENT_CONTENT_ENABLED:'true'},{SUPABASE_SERVICE_ROLE_KEY:'synthetic-forbidden'}])assert.equal(await productReadinessV1({...env,...patch},fetchImpl),false)
 assert.equal(calls,0)
})
test('provider denial redirects timeout and gateway errors stay generic with no retry',async()=>{
 for(const outcome of [401,503,302,'timeout','gateway']){
  let calls=0
  const response=await actual(env,async()=>{calls++;if(typeof outcome==='string')throw Error('sensitive-provider-'+outcome);return new Response('private-provider-body',{status:outcome})}).GET()
  assert.equal(response.status,503);assert.deepEqual(await response.json(),{status:'not_ready'});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(calls,1)
 }
})
test('canonical LOCAL connectivity keeps its existing direct GET and legacy header behavior',async()=>{
 let calls=0
 const local={PLATFORM_TARGET:'LOCAL',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-local-only'}
 assert.equal(await productReadinessV1(local,async(url,init)=>{calls++;assert.equal(url,local.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/');assert.equal(init.method,undefined);assert.equal(init.headers.authorization,'Bearer synthetic-local-only');assert.equal(init.redirect,'error');return new Response(null,{status:200})}),true)
 for(const url of ['https://other.supabase.co','http://localhost.evil.invalid:54321','http://user:password@127.0.0.1:54321','http://127.0.0.1:54321/'])assert.equal(await productReadinessV1({...local,NEXT_PUBLIC_SUPABASE_URL:url},async()=>{calls++;return new Response(null,{status:200})}),false)
 assert.equal(calls,1)
})
