import {readFileSync} from 'node:fs'
const requiredContexts=['reachable-history','Lint, types, tests, build','Native PostgreSQL zero-to-head and synthetic restore','Supabase local Auth PostgREST Storage acceptance','contracts','container-package','reconstruction-recovery','n8n-disposable']
export function validateRepositoryPolicy(policy) {
 if(!policy||Object.keys(policy).some(k=>!['version','scope','required_contexts','required_independent_approvals','dismiss_stale_reviews','last_push_independent_approval','code_owner_review','resolve_review_threads','trusted_actions_app_id','codeowners_company_identities','admin_activation_authorized','live_protection_verified'].includes(k)))throw new Error('POLICY_FIELD_INVALID')
 if(policy?.version!==1||policy.scope!=='PROPOSAL_ONLY_NO_ADMIN_MUTATION'||policy.admin_activation_authorized!==false||policy.live_protection_verified!==false)throw new Error('POLICY_AUTHORITY_INVALID')
 if(!Array.isArray(policy.required_contexts)||new Set(policy.required_contexts).size!==requiredContexts.length||policy.required_contexts.length!==requiredContexts.length||requiredContexts.some(c=>!policy.required_contexts.includes(c)))throw new Error('REQUIRED_CHECKS_WEAKENED')
 if(policy.required_independent_approvals!==2||['dismiss_stale_reviews','last_push_independent_approval','code_owner_review','resolve_review_threads'].some(k=>policy[k]!==true))throw new Error('REVIEW_POLICY_WEAKENED')
 if(policy.trusted_actions_app_id!==null&&(!Number.isSafeInteger(policy.trusted_actions_app_id)||policy.trusted_actions_app_id<1))throw new Error('TRUSTED_CHECK_APP_INVALID')
 if(policy.codeowners_company_identities!=='COMPANY_REVIEW_REQUIRED')throw new Error('COMPANY_REVIEW_REQUIRED')
 return {status:'PROPOSAL_ONLY',checks:requiredContexts.length,live_protection_verified:false,admin_activation_authorized:false,blockers:['COMPANY_CODEOWNERS_AND_INDEPENDENT_REVIEWERS','VERIFIED_ACTIONS_APP_ID','ALL_REQUIRED_WORKFLOWS_RUN_ON_TARGET','EXISTING_GATES_RESOLVED','EXPLICIT_ADMIN_AUTHORIZATION']}
}
export function prepareDisabledRuleset(policy,{scope,actions_app_id}) {
 validateRepositoryPolicy(policy)
 if(scope!=='LOCAL_PREPARATORY'||!Number.isSafeInteger(actions_app_id)||actions_app_id<1||policy.trusted_actions_app_id!==actions_app_id)throw new Error('VERIFIED_CHECK_APP_REQUIRED')
 return {name:'Company default branch review and exact checks',target:'branch',enforcement:'disabled',bypass_actors:[],conditions:{ref_name:{include:['~DEFAULT_BRANCH'],exclude:[]}},rules:[
  {type:'deletion'},{type:'non_fast_forward'},
  {type:'pull_request',parameters:{allowed_merge_methods:['merge'],dismiss_stale_reviews_on_push:true,require_code_owner_review:true,require_last_push_approval:true,required_approving_review_count:2,required_review_thread_resolution:true}},
  {type:'required_status_checks',parameters:{do_not_enforce_on_create:false,strict_required_status_checks_policy:true,required_status_checks:requiredContexts.map(context=>({context,integration_id:actions_app_id}))}},
 ]}
}
if(process.argv[1]?.endsWith('repository-policy.mjs'))try{
 console.log(JSON.stringify(validateRepositoryPolicy(JSON.parse(readFileSync(new URL('../../infra/github/default-branch-policy.json',import.meta.url),'utf8')))))
}catch{console.error('{"status":"FAIL","error":"REPOSITORY_POLICY_INVALID"}');process.exitCode=1}
