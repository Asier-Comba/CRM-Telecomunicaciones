import {readJson,safeError} from './lib.mjs'
import {validateWorkflow} from './operations.mjs'
import {validValue} from './config.mjs'
import {writeFileSync} from 'node:fs'
export function n8nGuard(env,write=false){
 if(env.PLATFORM_TARGET!=='STAGING'||!validValue('origin',env.N8N_BASE_URL,'STAGING')||env.N8N_BASE_URL!==env.N8N_APPROVED_ORIGIN||!env.N8N_API_KEY)throw new Error('N8N_STAGING_TARGET_REQUIRED')
 if(write&&(env.CI!=='true'||env.GITHUB_ACTIONS!=='true'||env.PLATFORM_ALLOW_N8N_IMPORT!=='true'))throw new Error('N8N_PROTECTED_IMPORT_REQUIRED')
}
// Narrow future adapter: inactive synthetic no-op workflow only. No execution,
// activation, arbitrary webhook, credential API, SQL or production operation.
export async function importRegisteredWorkflow(entry,env,transport=fetch){
 n8nGuard(env,true)
 if(entry.registered_id!=='synthetic-health-v1'||entry.file!=='infra/n8n/synthetic-health.json')throw new Error('UNREGISTERED_WORKFLOW')
 const workflow=readJson(entry.file)
 if(validateWorkflow(workflow).status!=='VALID')throw new Error('UNSAFE_WORKFLOW')
 const headers={'X-N8N-API-KEY':env.N8N_API_KEY,'content-type':'application/json'}
 if(entry.provider_workflow_id){
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(entry.provider_workflow_id))throw new Error('INVALID_PROVIDER_WORKFLOW_ID')
  const r=await transport(env.N8N_BASE_URL+'/api/v1/workflows/'+entry.provider_workflow_id,{headers,redirect:'error',signal:AbortSignal.timeout(15000)})
  if(!r.ok)throw new Error('REGISTERED_WORKFLOW_READ_FAILED')
  const remote=await r.json()
  if(validateWorkflow(remote).status!=='VALID'||remote.name!==workflow.name)throw new Error('REGISTERED_WORKFLOW_DRIFT')
  return {status:'VERIFIED_INACTIVE',registered_id:entry.registered_id,provider_workflow_id:entry.provider_workflow_id,effects_enabled:false}
 }
 // Creation returns a provider ID; interrupted/unknown results must be
 // reconciled by list/read before retry, rather than blindly duplicating.
 const {name,nodes,connections,settings}=workflow
 const r=await transport(env.N8N_BASE_URL+'/api/v1/workflows',{method:'POST',headers,body:JSON.stringify({name,nodes,connections,settings}),redirect:'error',signal:AbortSignal.timeout(15000)})
 if(!r.ok)throw new Error('N8N_IMPORT_FAILED_RECONCILE_BEFORE_RETRY')
 const remote=await r.json()
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(String(remote.id))||remote.active!==false)throw new Error('N8N_IMPORT_NOT_VERIFIED_INACTIVE')
 return {status:'IMPORTED_INACTIVE',registered_id:entry.registered_id,provider_workflow_id:String(remote.id),effects_enabled:false}
}
export function exportRegisteredWorkflow(remote){
 if(validateWorkflow(remote).status!=='VALID')throw new Error('UNSAFE_WORKFLOW_EXPORT')
 const {name,nodes,connections,settings}=remote
 return {name,active:false,nodes,connections,settings}
}
if(process.argv[1]?.endsWith('n8n-registry.mjs'))try{
 const registry=readJson('infra/n8n/registry.json')
 if(!process.argv.includes('--execute'))console.log(JSON.stringify({status:'PLAN_ONLY',registered_ids:registry.workflows.map(w=>w.registered_id),effects_enabled:false,production_supported:false}))
 else{
  if(!process.env.RUNNER_TEMP)throw new Error('RUNNER_OUTPUT_REQUIRED')
  const results=[]
  for(const entry of registry.workflows)results.push(await importRegisteredWorkflow(entry,process.env))
  // Only IDs/statuses. This output binding belongs in environment config, not
  // a manual workflow copy. No server response or credentials are written.
  writeFileSync(process.env.RUNNER_TEMP+'/w5-n8n-registry-safe.json',JSON.stringify({environment:'STAGING',results},null,2))
  console.log(JSON.stringify({status:'IMPORTED_NOT_ACCEPTED',count:results.length,effects_enabled:false}))
 }
}catch(e){console.error(JSON.stringify({status:'FAIL',error:safeError(e)}));process.exitCode=1}
