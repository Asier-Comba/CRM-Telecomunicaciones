import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import * as admission from '../../src/lib/server/product-staging-admission-v1.ts'
import {integratedLocalAllowed,integratedProductAllowed} from '../../src/features/product/integration/mode.ts'
import {validateProductEnvironmentV1} from '../../src/lib/server/product-environment-v1.ts'
const require=createRequire(import.meta.url),ts=require('typescript'),next=require('next/server')
const actor='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002'
const env={NODE_ENV:'production',APP_ENV:'staging',PRODUCT_V1_ENABLED:'true',PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_USER_IDS:actor,PRODUCT_V1_ORIGIN:admission.stagingAppOriginV1,NEXT_PUBLIC_SUPABASE_URL:admission.stagingSupabaseUrlV1,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_only'}
const registered=id=>({id,email:'synthetic@example.invalid',email_confirmed_at:'2026-10-01T00:00:00Z',is_anonymous:false})
const policy=admission.readStagingAdmissionV1(env)
const compiled=new Map()
function actual(file,dependencies,environment=env,browser=undefined){
 if(!compiled.has(file))compiled.set(file,ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)
 const fixture={exports:{}}
 new Function('require','module','exports','process','window',compiled.get(file))(name=>{assert.ok(Object.hasOwn(dependencies,name),'Unexpected dependency '+name);return dependencies[name]},fixture,fixture.exports,{env:environment},browser)
 return fixture.exports
}

test('staging mode is explicitly eligible while the original local-only guard remains closed',()=>{
 assert.equal(integratedLocalAllowed(env),false);assert.equal(integratedProductAllowed(env),true)
 assert.equal(admission.readStagingAdmissionV1({}).status,'disabled')
 assert.equal(integratedProductAllowed({...env,PRODUCT_STAGING_INTEGRATION:undefined}),false)
 const local={NODE_ENV:'development',PRODUCT_LOCAL_INTEGRATION:'true',PRODUCT_LOCAL_SYNTHETIC:'true',PRODUCT_V1_ENABLED:'true',PRODUCT_V1_ORIGIN:'http://127.0.0.1:3108',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321'}
 assert.equal(integratedProductAllowed(local),true)
 assert.equal(integratedProductAllowed({...local,PRODUCT_STAGING_INTEGRATION:'true'}),false)
})

for(const [name,value]of Object.entries({NODE_ENV:'development',APP_ENV:'production',PRODUCT_V1_ENABLED:'false',PRODUCT_STAGING_INTEGRATION:'TRUE',PRODUCT_STAGING_USER_IDS:'*',PRODUCT_LOCAL_INTEGRATION:'true',PRODUCT_LOCAL_SYNTHETIC:'true',PRODUCT_V1_ORIGIN:'https://other.example.invalid',NEXT_PUBLIC_SUPABASE_URL:'https://other.supabase.co'}))test('staging rejects binding '+name,()=>{
 assert.equal(admission.readStagingAdmissionV1({...env,[name]:value}).status,'invalid')
 assert.equal(admission.userClientBindingV1({...env,[name]:value}),'denied')
})

test('origin and project bindings reject normalization tricks and alternate endpoints',()=>{
 for(const key of ['PRODUCT_V1_ORIGIN','NEXT_PUBLIC_SUPABASE_URL'])for(const suffix of ['/','/path','?x=1','#part',' '])assert.equal(admission.readStagingAdmissionV1({...env,[key]:env[key]+suffix}).status,'invalid')
 assert.equal(admission.readStagingAdmissionV1({...env,PRODUCT_V1_ORIGIN:env.PRODUCT_V1_ORIGIN.replace('https:','http:')}).status,'invalid')
 assert.equal(admission.readStagingAdmissionV1({...env,NEXT_PUBLIC_SUPABASE_URL:env.NEXT_PUBLIC_SUPABASE_URL.replace('https://','https://user:password@')}).status,'invalid')
})

test('private cohort is canonical bounded immutable and cannot use wildcards or duplicate identities',()=>{
 const ids=Array.from({length:64},(_,i)=>'10000000-0000-4000-8000-'+String(i+1).padStart(12,'0'))
 assert.equal(admission.parseStagingUserIdsV1(ids.join(',')).length,64)
 for(const v of ['',actor+',',actor+','+actor,' '+actor,actor+'\n',ids.join(',')+','+other,42,null,'*','ffffffff-ffff-ffff-ffff-ffffffffffff'])assert.equal(admission.parseStagingUserIdsV1(v),null)
 assert.ok(Object.isFrozen(policy));assert.ok(Object.isFrozen(policy.userIds));assert.throws(()=>policy.userIds.push(other))
})

test('cohort uses only confirmed non-anonymous root Auth identity, never editable metadata',()=>{
 assert.equal(admission.stagingIdentityAllowedV1(policy,registered(actor)),true)
 for(const user of [null,{},[],{...registered(other),user_metadata:{id:actor,email:'synthetic@example.invalid',role:'owner'}},{...registered(actor),email:'actual@example.com'},{...registered(actor),is_anonymous:true},{...registered(actor),is_anonymous:undefined},{...registered(actor),email_confirmed_at:null},Object.create(registered(actor)),{...registered(actor),get id(){throw Error('private')}}])assert.equal(admission.stagingIdentityAllowedV1(policy,user),false)
 assert.equal(admission.stagingIdentityAllowedV1(policy,{...registered(actor),role:'service_role',user_metadata:{role:'owner'}}),true) // admission grants no workspace role
})

test('every server admission queries getUser with its receiver, rejects errors, and never falls back to getSession',async()=>{
 let reads=0
 const client={auth:{getSession(){throw Error('SESSION_IS_NOT_AUTHORITY')},async getUser(){assert.equal(this,client.auth);reads++;if(reads===4)throw Error('private');return{data:{user:registered(reads===2?other:actor)},error:reads===3?Error('private'):null}}}}
 assert.equal(await admission.stagingClientAdmittedV1(policy,client),true)
 for(let n=0;n<3;n++)assert.equal(await admission.stagingClientAdmittedV1(policy,client),false)
 assert.equal(reads,4)
})

test('server SDK binding denies remote access without staging admission and keeps canonical disposable local support',()=>{
 assert.equal(admission.userClientBindingV1(env),'staging')
 assert.equal(admission.userClientBindingV1({...env,PRODUCT_STAGING_INTEGRATION:'false'}),'denied')
 assert.equal(admission.userClientBindingV1({NODE_ENV:'test',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321'}),'local')
 for(const url of ['http://localhost.attacker.invalid:54321','http://user:password@localhost:54321','http://localhost:54321/path','https://localhost:54321'])assert.equal(admission.userClientBindingV1({NODE_ENV:'test',NEXT_PUBLIC_SUPABASE_URL:url}),'denied')
})

test('application environment contract keeps activation reviewable and rejects production or missing cohorts without printing values',()=>{
 const manifest=JSON.parse(readFileSync('docs/master/contracts/product-environment.json','utf8'))
 assert.equal(manifest.entries.find(r=>r.name==='PRODUCT_STAGING_USER_IDS').secret,true)
 assert.equal(validateProductEnvironmentV1(manifest,env,'STAGING').status,'valid')
 for(const [patch,phase]of [[{PRODUCT_STAGING_USER_IDS:undefined},'STAGING'],[{},'PROD'],[{APP_ENV:'production'},'STAGING'],[{PRODUCT_V1_ORIGIN:'https://other.invalid'},'STAGING']]){
  const report=validateProductEnvironmentV1(manifest,{...env,...patch},phase);assert.equal(report.status,'invalid');assert.equal(JSON.stringify(report).includes(actor),false)
 }
})

const localBuiltTransport={NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',PRODUCT_V1_ORIGIN:'http://127.0.0.1:3108',PRODUCT_V1_ENABLED:'true',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-only'}
test('production build mode preserves the existing loopback API transport without enabling hosted product UI',()=>{
 assert.equal(admission.userClientBindingV1(localBuiltTransport),'local')
 assert.equal(integratedProductAllowed(localBuiltTransport),false)
 for(const APP_ENV of ['staging','production'])assert.equal(admission.userClientBindingV1({...localBuiltTransport,APP_ENV}),'denied')
 assert.equal(admission.userClientBindingV1({...localBuiltTransport,NEXT_PUBLIC_SUPABASE_URL:admission.stagingSupabaseUrlV1}),'denied')
})
test('actual factory preserves production-build loopback transport and rejects declared hosted environments before SDK access',async()=>{
 let constructors=0
 const make=environment=>actual('src/lib/server/supabase-user.ts',{'next/headers':{cookies:async()=>({getAll:()=>[],set(){}})},'./product-staging-admission-v1':admission,'@supabase/ssr':{createServerClient(url){constructors++;assert.equal(url,localBuiltTransport.NEXT_PUBLIC_SUPABASE_URL);return{synthetic:true}}}},environment)
 assert.deepEqual(await make(localBuiltTransport).createUserServerClient(),{synthetic:true})
 for(const APP_ENV of ['staging','production'])assert.equal(await make({...localBuiltTransport,APP_ENV}).createUserServerClient(),null)
 assert.equal(constructors,1)
})

function proxyFixture(outcome,environment=env){
 const calls=[],sdk={createServerClient(url,key,options){calls.push({url,key,options});return{auth:{async getUser(){
  options.cookies.setAll([{name:'synthetic-session',value:'synthetic-cookie',options:{path:'/',secure:options.cookieOptions?.secure??false}}],{'Cache-Control':'private, no-store','Expires':'0','Pragma':'no-cache','X-SDK-Test':'preserved'})
  if(outcome instanceof Error)throw outcome
  return typeof outcome==='function'?outcome(options.cookies.getAll()):outcome
 }}}}}
 const proxyModule=actual('src/proxy.ts',{'@supabase/ssr':sdk,'next/server':next,'./lib/server/product-staging-admission-v1':admission},environment)
 return{...proxyModule,calls}
}
const request=(path,headers={})=>new next.NextRequest(admission.stagingAppOriginV1+path,{headers})
function assertPrivate(response){assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('pragma'),'no-cache');assert.equal(response.headers.get('expires'),'0')}

for(const [name,configuration]of [['local',{NODE_ENV:'development',APP_ENV:'test',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-only'}],['staging',env]])test('proxy preserves the exact existing assistant no-store response contract in '+name,async()=>{
 const f=proxyFixture({data:{user:registered(actor)},error:null},configuration)
 const response=await f.proxy(request('/api/assistant/v2/threads'))
 assert.equal(response.headers.get('cache-control'),'no-store')
 assert.equal(response.headers.get('pragma'),'no-cache');assert.equal(response.headers.get('expires'),'0')
})

test('actual proxy admits cohort, propagates SDK cookie/cache headers and requests Secure staging cookies',async()=>{
 const f=proxyFixture({data:{user:registered(actor)},error:null}),r=await f.proxy(request('/api/product/v1/queries'))
 assert.equal(r.headers.get('x-middleware-next'),'1');assertPrivate(r)
 assert.equal(r.headers.get('x-sdk-test'),'preserved');assert.match(r.headers.get('set-cookie'),/synthetic-session=/)
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].options.cookieOptions.secure,true);assert.equal(f.calls[0].key,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
 assert.ok(f.config.matcher.includes('/api/:path*'))
})

for(const path of ['/api/product/v1/commands','/api/document/v1/content/download','/api/assistant/v2/threads','/api/foreign/file.png'])test('actual proxy rejects a non-cohort actor at '+path,async()=>{
 const f=proxyFixture({data:{user:registered(other)},error:null}),r=await f.proxy(request(path,{'x-user-id':actor,'x-workspace-role':'owner'}))
 assert.equal(r.status,403);assertPrivate(r);assert.deepEqual(await r.json(),{ok:false,error:'access_denied'})
})

test('page denial returns only the canonical login notice; unauthenticated requests never gain a cohort fallback',async()=>{
 const f=proxyFixture({data:{user:registered(other)},error:null}),r=await f.proxy(request('/clients'))
 assert.equal(r.headers.get('location'),admission.stagingAppOriginV1+'/login?error=staging_access_denied');assertPrivate(r)
 const missing=proxyFixture({data:{user:null},error:null}),api=await missing.proxy(request('/api/product/v1/queries'))
 assert.equal(api.status,401);assertPrivate(api)
 const bad=proxyFixture({data:{user:registered(actor)},error:undefined});assert.equal((await bad.proxy(request('/api/product/v1/queries'))).status,401)
})

test('proxy refuses wrong origins and invalid configuration before SDK access; health remains a separate operational contract',async()=>{
 const f=proxyFixture({data:{user:registered(actor)},error:null})
 const wrong=new next.NextRequest('https://attacker.invalid/api/product/v1/queries',{headers:{host:'crm-telecom-staging-preview.netlify.app','x-forwarded-proto':'https'}})
 assert.equal((await f.proxy(wrong)).status,503);assert.equal(f.calls.length,0)
 const invalid=proxyFixture(null,{...env,PRODUCT_STAGING_USER_IDS:undefined})
 assert.equal((await invalid.proxy(request('/api/product/v1/queries'))).status,503);assert.equal(invalid.calls.length,0)
 const blockedPage=await invalid.proxy(request('/dashboard'));assert.equal(blockedPage.status,503);assert.match(blockedPage.headers.get('content-type'),/text\/html/);assert.match(await blockedPage.text(),/entorno de prueba/);assertPrivate(blockedPage)
 assert.equal((await invalid.proxy(request('/api/health/live'))).headers.get('x-middleware-next'),'1')
 const failed=proxyFixture(Error('private provider detail'));const reply=await failed.proxy(request('/api/product/v1/queries'));assert.equal(reply.status,503);assert.equal((await reply.text()).includes('private provider'),false)
})

test('separate requests cannot reuse another actor; revoking the configured cohort applies on the next request',async()=>{
 const changing={...env},f=proxyFixture(cookies=>({data:{user:registered(cookies.some(c=>c.name==='actor'&&c.value==='allowed')?actor:other)},error:null}),changing)
 assert.equal((await f.proxy(request('/api/product/v1/queries',{cookie:'actor=allowed'}))).headers.get('x-middleware-next'),'1')
 assert.equal((await f.proxy(request('/api/product/v1/queries',{cookie:'actor=other'}))).status,403)
 changing.PRODUCT_STAGING_USER_IDS=other
 assert.equal((await f.proxy(request('/api/product/v1/queries',{cookie:'actor=allowed'}))).status,403)
 assert.equal(f.calls.length,3)
})

test('actual server factory revalidates cohort even without Proxy and never constructs an unapproved remote client',async()=>{
 let who=actor,reads=0,constructors=0
 const make=environment=>actual('src/lib/server/supabase-user.ts',{'next/headers':{cookies:async()=>({getAll:()=>[],set(){}})},'./product-staging-admission-v1':admission,'@supabase/ssr':{createServerClient(_url,_key,options){constructors++;assert.equal(options.cookieOptions.secure,true);return{auth:{async getUser(){reads++;return{data:{user:registered(who)},error:null}}}}}}},environment)
 const f=make(env);assert.ok(await f.createUserServerClient());who=other;assert.equal(await f.createUserServerClient(),null);assert.equal(reads,2)
 assert.equal(await make({...env,PRODUCT_STAGING_INTEGRATION:'false'}).createUserServerClient(),null);assert.equal(constructors,2)
})

test('browser client is never shared in server rendering and HTTPS sessions request Secure cookies',()=>{
 const calls=[],dependencies={'@supabase/ssr':{createBrowserClient(...args){calls.push(args);return{synthetic:true}}}}
 const server=actual('src/lib/supabase.ts',dependencies,env);assert.equal(server.getSupabaseBrowserClient(),null);assert.equal(calls.length,0)
 const browser=actual('src/lib/supabase.ts',dependencies,env,{location:{protocol:'https:'}})
 assert.equal(browser.getSupabaseBrowserClient(),browser.getSupabaseBrowserClient());assert.equal(calls.length,1);assert.equal(calls[0][2].cookieOptions.secure,true)
 const local=actual('src/lib/supabase.ts',dependencies,env,{location:{protocol:'http:'}});local.getSupabaseBrowserClient();assert.equal(calls[1][2].cookieOptions.secure,false)
})
