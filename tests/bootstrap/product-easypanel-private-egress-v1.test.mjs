import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import * as admission from '../../src/lib/server/product-staging-admission-v1.ts'
import * as egress from '../../src/lib/server/product-private-egress-v1.ts'
import {readStagingAdmissionV1,stagingSupabaseUrlV1} from '../../src/lib/server/product-staging-admission-v1.ts'
const origin='https://crm-telecom-staging.hvdnby.easypanel.host'
const configured=()=>({NODE_ENV:'production',APP_ENV:'staging',PRODUCT_V1_ENABLED:'true',PRODUCT_V1_ORIGIN:origin,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1,PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:'true',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001'})
test('exact EasyPanel cohort requires private egress and remains separate from runtime approval',()=>{
 const env=configured();assert.equal(readStagingAdmissionV1(env).status,'enabled')
 for(const change of [{PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:undefined},{PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:'false'},{PRODUCT_V1_ORIGIN:'https://other.hvdnby.easypanel.host'},{APP_ENV:'local'}])assert.equal(readStagingAdmissionV1({...env,...change}).status,'invalid')
})

test('legacy Netlify admission remains direct and cannot silently acquire the private flag',()=>{
 const legacy={...configured(),PRODUCT_V1_ORIGIN:admission.stagingAppOriginV1,PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:undefined}
 assert.equal(readStagingAdmissionV1(legacy).status,'enabled')
 assert.equal(egress.privateSupabaseTransportV1(legacy),'direct')
 for(const flag of ['true','TRUE','', 'false ']){
  const env={...legacy,PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:flag}
  assert.equal(readStagingAdmissionV1(env).status,'invalid');assert.equal(egress.privateSupabaseTransportV1(env),'denied')
 }
 assert.equal(egress.privateSupabaseTransportV1({}),'direct')
 for(const change of [{PRODUCT_STAGING_INTEGRATION:undefined},{PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:undefined},{PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:'false'},{APP_ENV:'production'},{PRODUCT_STAGING_USER_IDS:undefined}])assert.equal(egress.privateSupabaseTransportV1({...configured(),...change}),'denied')
 assert.equal(egress.privateSupabaseTransportV1(configured()),'gateway')
})

test('gateway transport keeps method body headers cancellation and redirects closed',async()=>{
 const abort=new AbortController();let calls=0
 const transport=egress.createPrivateSupabaseFetchV1(async(request,init)=>{
  calls++;assert.equal(request.url,egress.privateSupabaseGatewayV1+'/rest/v1/rpc/operation?select=total')
  assert.equal(request.method,'POST');assert.equal(request.headers.get('apikey'),'synthetic-public')
  assert.equal(request.headers.get('authorization'),'Bearer synthetic-user')
  assert.equal(await request.text(),'{"synthetic":true}');assert.equal(init.redirect,'error')
  abort.abort();assert.equal(request.signal.aborted,true)
  return new Response('{}')
 })
 await transport(stagingSupabaseUrlV1+'/rest/v1/rpc/operation?select=total',{method:'POST',body:'{"synthetic":true}',headers:{apikey:'synthetic-public',authorization:'Bearer synthetic-user'},signal:abort.signal})
 assert.equal(calls,1)
})

test('gateway failure has no direct retry and forbidden SDK destinations make zero calls',async()=>{
 let calls=0
 const transport=egress.createPrivateSupabaseFetchV1(async()=>{calls++;throw Error('GATEWAY_UNAVAILABLE')})
 await assert.rejects(transport(stagingSupabaseUrlV1+'/auth/v1/user'),/GATEWAY_UNAVAILABLE/)
 assert.equal(calls,1)
 for(const destination of ['https://other.supabase.co/rest/v1/clients',stagingSupabaseUrlV1+'/storage/v1/object/x',stagingSupabaseUrlV1+'/rest/v1/%2fsecret',stagingSupabaseUrlV1+'/auth/v1/user#fragment','http://169.254.169.254/latest'])await assert.rejects(transport(destination))
 assert.equal(calls,1)
})

const require=createRequire(import.meta.url),ts=require('typescript'),next=require('next/server')
function actual(file,dependencies,env){
 const compiled=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 const fixture={exports:{}}
 new Function('require','module','exports','process',compiled)(name=>{assert.ok(Object.hasOwn(dependencies,name),'Unexpected dependency '+name);return dependencies[name]},fixture,fixture.exports,{env})
 return fixture.exports
}
const user={id:configured().PRODUCT_STAGING_USER_IDS,email:'owner@example.invalid',email_confirmed_at:'2026-10-01T00:00:00Z',is_anonymous:false}

test('actual server factory supplies gateway transport and revalidates real Auth identity',async()=>{
 let constructions=0,reads=0
 const dependencies={'next/headers':{cookies:async()=>({getAll:()=>[],set(){}})},'./product-staging-admission-v1':admission,'./product-private-egress-v1':egress,'@supabase/ssr':{createServerClient(url,key,options){
  constructions++;assert.equal(url,stagingSupabaseUrlV1);assert.equal(key,'sb_publishable_synthetic_only');assert.equal(typeof options.global.fetch,'function');assert.equal(options.cookieOptions.secure,true)
  return{auth:{async getUser(){reads++;return{data:{user},error:null}}}}
 }}}
 const env={...configured(),NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_only'}
 assert.ok(await actual('src/lib/server/supabase-user.ts',dependencies,env).createUserServerClient())
 assert.equal(reads,1);assert.equal(constructions,1)
 for(const flag of [undefined,'false'])assert.equal(await actual('src/lib/server/supabase-user.ts',dependencies,{...env,PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:flag}).createUserServerClient(),null)
 assert.equal(constructions,1)
})

test('actual proxy uses gateway and preserves cohort denials without constructing SDK on misconfiguration',async()=>{
 let constructions=0,who=user
 const dependencies={'next/server':next,'./lib/server/product-staging-admission-v1':admission,'./lib/server/product-private-egress-v1':egress,'@supabase/ssr':{createServerClient(url,key,options){
  constructions++;assert.equal(url,stagingSupabaseUrlV1);assert.equal(typeof options.global.fetch,'function');assert.equal(options.cookieOptions.secure,true)
  return{auth:{async getUser(){return{data:{user:who},error:null}}}}
 }}}
 const env={...configured(),NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_only'}
 const make=patch=>actual('src/proxy.ts',dependencies,{...env,...patch}).proxy(new next.NextRequest(origin+'/api/product/v1/query'))
 assert.equal((await make({})).headers.get('x-middleware-next'),'1')
 who={...user,id:'10000000-0000-4000-8000-000000000002'}
 const denied=await make({});assert.equal(denied.status,403);assert.equal(denied.headers.get('cache-control'),'no-store')
 for(const flag of [undefined,'false'])assert.equal((await make({PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:flag})).status,503)
 assert.equal(constructions,2)
})
