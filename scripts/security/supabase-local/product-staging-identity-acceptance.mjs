import {createClient} from '@supabase/supabase-js'
import {readStagingAdmissionV1,stagingClientAdmittedV1,stagingAppOriginV1,stagingSupabaseUrlV1} from '../../../src/lib/server/product-staging-admission-v1.ts'

// Exercises cohort decisions with ordinary real LOCAL Auth. It does not exercise hosted routing.
export async function stagingIdentityAcceptance({users,url,anon,report}){
 if(process.env.GITHUB_ACTIONS!=='true'||url!=='http://127.0.0.1:54321')throw Error('STAGING_IDENTITY_LOCAL_CI_ONLY')
 const clients=[],signedIn=[];let failure
 try{
  for(const name of ['ownerA','viewerA']){
   const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
   clients.push(client)
   report.w2_ui_action_step='staging_identity:'+name+':ordinary_signin'
   const result=await client.auth.signInWithPassword({email:users[name].email,password:users[name].password})
   if(result.error||result.data.user?.id!==users[name].id)throw Error('STAGING_IDENTITY_SIGNIN_FAILED')
   signedIn.push(client)
  }
  const configuration={NODE_ENV:'production',APP_ENV:'staging',PRODUCT_V1_ENABLED:'true',PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_USER_IDS:users.ownerA.id,PRODUCT_V1_ORIGIN:stagingAppOriginV1,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1}
  const policy=readStagingAdmissionV1(configuration)
  report.w2_ui_action_step='staging_identity:server_getUser:allowed'
  if(!await stagingClientAdmittedV1(policy,clients[0]))throw Error('STAGING_IDENTITY_ALLOWED_USER_REFUSED')
  report.w2_ui_action_step='staging_identity:server_getUser:outside_cohort'
  if(await stagingClientAdmittedV1(policy,clients[1]))throw Error('STAGING_IDENTITY_OTHER_USER_ADMITTED')
  report.w2_ui_action_step='staging_identity:server_getUser:cohort_removed'
  if(await stagingClientAdmittedV1(readStagingAdmissionV1({...configuration,PRODUCT_STAGING_USER_IDS:users.viewerA.id}),clients[0]))throw Error('STAGING_IDENTITY_REMOVAL_NOT_ENFORCED')
  report.w2_staging_admission_auth_identity='PASS_LOCAL_AUTH_IDENTITY_ONLY_NOT_HOSTED_ROUTING'
 }catch(error){failure=error;throw error}
 finally{
  const cleanup=await Promise.allSettled(signedIn.map(client=>client.auth.signOut({scope:'local'})))
  const clean=cleanup.every(result=>result.status==='fulfilled'&&!result.value.error)
  report.w2_staging_admission_auth_cleanup=clean?'PASS_LOCAL_SESSIONS_ONLY':'FAIL'
  if(!clean&&!failure)throw Error('STAGING_IDENTITY_LOCAL_CLEANUP_FAILED')
 }
}
