import {validateEnvironment} from './config.mjs'
import {managedProductStaging} from './product-staging-profile.mjs'
import {publicBuildMatches} from './build-binding.mjs'

const fields=['version','status','origin','auth','capabilities','reviews','production_accepted']
const capabilities=['ai','crm_mail','n8n','document_content','document_maintenance']
export function reviewedStagingPolicy(policy,origin){
 return Boolean(policy&&typeof policy==='object'&&!Array.isArray(policy)&&
  Object.keys(policy).length===fields.length&&fields.every(k=>Object.hasOwn(policy,k))&&
  policy.version==='product.staging.runtime.v1'&&policy.status==='ACCEPTED'&&
  policy.origin===origin&&policy.auth==='supabase-managed'&&policy.production_accepted===false&&
  policy.capabilities&&Object.keys(policy.capabilities).length===capabilities.length&&capabilities.every(k=>policy.capabilities[k]===false)&&
  policy.reviews&&Object.keys(policy.reviews).length===3&&['w2','w5','w4'].every(k=>policy.reviews[k]==='APPROVED'))
}
export function evaluateRuntime(env,target,policy,binding){
 const configuration=validateEnvironment(env,target)
 if(configuration.status!=='VALID')return {accepted:false,configuration,code:'ENVIRONMENT_INVALID'}
 if(target==='PROD')return {accepted:false,configuration,code:'HOSTED_PRODUCT_RUNTIME_NOT_ACCEPTED'}
 if(target==='STAGING'&&(!managedProductStaging(env,target)||!reviewedStagingPolicy(policy,env.PRODUCT_V1_ORIGIN)))
  return {accepted:false,configuration,code:'HOSTED_PRODUCT_RUNTIME_NOT_ACCEPTED'}
 if(target==='STAGING'&&!publicBuildMatches(env,binding))return {accepted:false,configuration,code:'IMAGE_PUBLIC_BUILD_MISMATCH'}
 return {accepted:true,configuration}
}
