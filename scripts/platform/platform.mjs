import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {root,readJson,run,safeError} from './lib.mjs'
import {inventory} from './inventory.mjs'
import {validateEnvironment} from './config.mjs'
import {validateCompany,validateWorkflow,verifyDns,preflight,releaseManifest} from './operations.mjs'
import {cleanBuildCache} from './clean-build-cache.mjs'
import {companyState} from './company-state.mjs'
const [mode,targetOrFile]=process.argv.slice(2)
try{
 let result
 if(mode==='verify'){
  if(JSON.stringify(inventory())!==JSON.stringify(readJson('infra/platform/environment-manifest.json')))throw new Error('MANIFEST_DRIFT')
  const workflow=validateWorkflow(readJson('infra/n8n/synthetic-health.json'))
  if(workflow.status!=='VALID')throw new Error('WORKFLOW_INVALID')
  result={status:'PASS',scope:'REPOSITORY_CONTRACTS_ONLY',environment_names:inventory().entries.length,migrations:inventory().migration_inventory.length,remote_mutation:false}
 }else if(mode==='preflight')result=preflight(targetOrFile)
 else if(mode==='config')result=validateEnvironment(process.env,targetOrFile)
 else if(mode==='release')result=releaseManifest()
 else if(['company','company-report','dns'].includes(mode)){
  const c=JSON.parse(readFileSync(targetOrFile,'utf8'));result=mode==='dns'?await verifyDns(c):mode==='company-report'?companyState(c,process.env):validateCompany(c)
 }else if(mode==='n8n')result=validateWorkflow(JSON.parse(readFileSync(targetOrFile??join(root,'infra/n8n/synthetic-health.json'),'utf8')))
 else if(['bootstrap-local','recovery-test','acceptance'].includes(mode)){
  if(process.env.PLATFORM_TARGET!=='LOCAL'||process.env.SUPABASE_ACCESS_TOKEN||process.env.SUPABASE_DB_PASSWORD)throw new Error('EXPLICIT_DISPOSABLE_LOCAL_REQUIRED')
  if(run('docker',['ps','-a','--format','{{.Names}}']).includes('crm-telecom-local'))throw new Error('REQUIRES_EMPTY_DISPOSABLE_TARGET')
  if(run('supabase',['--version']).trim()!=='2.119.0')throw new Error('CLI_VERSION_MISMATCH')
  const env={...process.env,W5_DISPOSABLE_LOCAL:'true',W5_RECOVERY:mode==='bootstrap-local'?'false':'true',NEXT_TELEMETRY_DISABLED:'1'}
  const build=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build'],{cwd:root,env,stdio:'ignore',timeout:600000})
  if(build.status!==0)throw new Error('APP_BUILD_FAILED')
  cleanBuildCache()
  const r=spawnSync(process.execPath,['scripts/security/supabase-local/run-stack.mjs'],{cwd:root,env,stdio:'inherit',timeout:2400000})
  if(r.status!==0)throw new Error('LOCAL_ACCEPTANCE_FAILED')
  result={status:'PASS',scope:'DISPOSABLE_LOCAL_BACKEND_TRANSPORT',product_browser:'RUN_SEPARATE_W2_ACCEPTANCE'}
 }else throw new Error('UNKNOWN_PLATFORM_COMMAND')
 console.log(JSON.stringify(result,null,2));if(['BLOCKED','FAIL'].includes(result.status))process.exitCode=1
}catch(e){console.error(JSON.stringify({status:'FAIL',error:safeError(e),values_included:false}));process.exitCode=1}
