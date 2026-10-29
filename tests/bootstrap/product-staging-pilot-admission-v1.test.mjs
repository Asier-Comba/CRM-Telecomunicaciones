import test from 'node:test'
import assert from 'node:assert/strict'
import {readStagingAdmissionV1,stagingClientAdmittedV1,stagingIdentityAllowedV1,stagingEasyPanelOriginV1,stagingSupabaseUrlV1} from '../../src/lib/server/product-staging-admission-v1.ts'

// Reserved test identities and domains only. No operator email, Auth UUID or
// credentials. getUser doubles are synthetic, not hosted Auth evidence.
const first='10000000-0000-4000-8000-000000000001'
const second='10000000-0000-4000-8000-000000000002'
const outside='10000000-0000-4000-8000-000000000003'
const environment={NODE_ENV:'production',APP_ENV:'staging',PRODUCT_V1_ENABLED:'true',PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:'true',PRODUCT_STAGING_USER_IDS:first+','+second,PRODUCT_V1_ORIGIN:stagingEasyPanelOriginV1,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1}
const policy=readStagingAdmissionV1(environment)
const registered=(id,email)=>({id,email,email_confirmed_at:'2026-10-01T00:00:00Z',is_anonymous:false})

test('causal: confirmed explicit-UUID pilot identities pass without a synthetic-domain restriction',async()=>{
 for(const [id,email] of [[first,'pilot.one@example.com'],[second,'pilot.two@example.org']]){
  let calls=0
  const client={auth:{async getUser(){assert.equal(this,client.auth);calls++;return{data:{user:registered(id,email)},error:null}},getSession(){assert.fail('SESSION_IS_NOT_AUTHORITY')}}}
  assert.equal(await stagingClientAdmittedV1(policy,client),true)
  assert.equal(calls,1)
 }
})

test('a domain, an email or editable metadata cannot enroll another UUID or grant a role',()=>{
 const admitted=registered(first,'pilot.one@example.com')
 assert.equal(stagingIdentityAllowedV1(policy,admitted),true)
 for(const user of [registered(outside,admitted.email),{...registered(outside,admitted.email),user_metadata:{id:first,role:'owner',workspace_id:'synthetic-workspace'}},{...admitted,id:undefined},{...admitted,id:'not-a-uuid'}]){
  assert.equal(stagingIdentityAllowedV1(policy,user),false)
 }
 assert.equal(stagingIdentityAllowedV1(policy,{...admitted,role:'owner',user_metadata:{role:'owner'}}),true) // Admission alone grants no DB/workspace role.
})

test('confirmed email syntax and nonanonymous root properties remain mandatory',()=>{
 const allowed=registered(first,'pilot.one@example.com')
 for(const email of [null,undefined,'','not-an-email','a@@example.com','a@ example.com','a@example.com\n','x'.repeat(321)+'@example.com']){
  assert.equal(stagingIdentityAllowedV1(policy,{...allowed,email}),false)
 }
 for(const user of [{...allowed,is_anonymous:true},{...allowed,is_anonymous:undefined},{...allowed,email_confirmed_at:null},{...allowed,email_confirmed_at:'invalid'},Object.create(allowed)]){
  assert.equal(stagingIdentityAllowedV1(policy,user),false)
 }
 let getterReads=0
 const accessor={...allowed};Object.defineProperty(accessor,'email',{get(){getterReads++;return allowed.email}})
 assert.equal(stagingIdentityAllowedV1(policy,accessor),false);assert.equal(getterReads,0)
})

test('server authority errors do not fall back to a JWT, getSession or metadata',async()=>{
 const user=registered(first,'pilot.one@example.com')
 for(const result of [{data:{user},error:Error('synthetic')},{data:{user},error:undefined},{data:{user:null},error:null}]){
  const client={auth:{getUser:async()=>result,getSession(){assert.fail('SESSION_FALLBACK_FORBIDDEN')}}}
  assert.equal(await stagingClientAdmittedV1(policy,client),false)
 }
 let calls=0
 const client={auth:{async getUser(){calls++;throw Error('synthetic')}}}
 assert.equal(await stagingClientAdmittedV1(policy,client),false)
 assert.equal(await stagingClientAdmittedV1(readStagingAdmissionV1({}),client),false)
 assert.equal(calls,1)
})

test('removing a configured UUID revokes admission on the next getUser response',async()=>{
 const client={auth:{getUser:async()=>({data:{user:registered(first,'pilot.one@example.com')},error:null})}}
 assert.equal(await stagingClientAdmittedV1(policy,client),true)
 const changed=readStagingAdmissionV1({...environment,PRODUCT_STAGING_USER_IDS:second})
 assert.equal(await stagingClientAdmittedV1(changed,client),false)
 assert.equal(stagingIdentityAllowedV1(readStagingAdmissionV1({...environment,PRODUCT_STAGING_USER_IDS:'*'}),registered(first,'pilot.one@example.com')),false)
})

