import {spawn,spawnSync} from 'node:child_process'
import {existsSync,readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {loadOwnedConsumerD1V1} from '../../scripts/security/native-postgres/owned-consumer-migrations-d1-v1.mjs'
import {realGlobalDocumentsAcceptance} from './real-acceptance.mjs'
const project='crm-telecom-local'
const report={contract:'documents.global.d1.acceptance.v1',result:'NOT_RUN',checks:[],folders:'NOT_IMPLEMENTED_CONTRACT_PENDING',private_bytes:'OFF',hosted:'NOT_RUN',storage_security_acceptance:'NOT_GRANTED',storage_88_adopted:false}
let started=false,phase='preflight'
function command(bin,args,options={}){
 const r=spawnSync(bin,args,{encoding:'utf8',timeout:120000,maxBuffer:20*1024*1024,...options})
 if(r.status!==0){
  const text=(r.stdout??'')+(r.stderr??'')
  report.command_failure={exit_code:Number.isInteger(r.status)?r.status:null,timed_out:r.error?.code==='ETIMEDOUT',category:/toomanyrequests|429 Too Many Requests|Data limit exceeded/i.test(text)?'REGISTRY_RATE_LIMIT':/document path must use/i.test(text)?'DOCUMENT_PATH_GRAMMAR':/foreign key constraint/i.test(text)?'FOREIGN_KEY_FAILURE':/check constraint/i.test(text)?'CHECK_FAILURE':'UNCLASSIFIED'}
  throw Error('D1_GLOBAL_LOCAL_COMMAND_FAILED')
 }
 return r.stdout.trim() // CLI status/key values never enter reports or logs.
}
const check=(ok,name)=>{report.checks.push({name,result:ok?'PASS':'FAIL'});if(!ok)throw Error('D1_GLOBAL_CHECK_FAILED')}
try{
 if(process.platform!=='linux'||process.env.CI!=='true'||process.env.GITHUB_ACTIONS!=='true'||process.env.DOCUMENTS_GLOBAL_AUTH!=='true')throw Error('D1_GLOBAL_EXPLICIT_DISPOSABLE_CI_ONLY')
 if(['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SUPABASE_URL'].some(k=>process.env[k])||existsSync('supabase/.temp/project-ref'))throw Error('D1_GLOBAL_HOSTED_CONFIG_FORBIDDEN')
 if(['.env','.env.local','.env.development','.env.development.local'].some(path=>existsSync(path)))throw Error('D1_GLOBAL_DOTENV_FORBIDDEN')
 if(!readFileSync('supabase/config.toml','utf8').includes('project_id = "'+project+'"'))throw Error('D1_GLOBAL_PROJECT_MISMATCH')
 if(command('docker',['ps','-a','--format','{{.Names}}']).split('\n').some(n=>n.includes(project)))throw Error('D1_GLOBAL_EMPTY_RUNNER_REQUIRED')
 if(command('supabase',['--version'])!=='2.119.0')throw Error('D1_GLOBAL_CLI_PIN_MISMATCH')
 command('supabase',['start','--help']);command('supabase',['stop','--help'])
 report.source=command('git',['rev-parse','HEAD']);report.tree=command('git',['rev-parse','HEAD^{tree}'])
 const profile=loadOwnedConsumerD1V1(new URL('../../',import.meta.url))
 check(profile.closure==='base87_plus_d1'&&profile.storage88===false,'exact_base87_plus_d1_hash_blob_closure')
 report.migration_profile='BASE87_PLUS_D1_NOT_STORAGE88'
 phase='stack_start';started=true
 command('supabase',['start','--exclude','realtime,imgproxy,studio,postgres-meta,edge-runtime,logflare,vector,supavisor,mailpit'],{timeout:600000})
 const status=JSON.parse(command('supabase',['status','--output','json'])),url=status.API_URL,anon=status.ANON_KEY,service=status.SERVICE_ROLE_KEY
 if(url!=='http://127.0.0.1:54321'||!anon||!service)throw Error('D1_GLOBAL_LOOPBACK_KEYS_REQUIRED')
 const db=command('docker',['ps','--format','{{.Names}}|{{.Image}}']).split('\n').map(l=>l.split('|')).find(([n,i])=>n==='supabase_db_'+project&&i.includes('supabase/postgres:'))?.[0]
 if(!db)throw Error('D1_GLOBAL_EXACT_LOCAL_DB_REQUIRED')
 const sql=source=>command('docker',['exec','-i',db,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:source})
 const versions=sql('select version from supabase_migrations.schema_migrations order by version').split('\n')
 check(JSON.stringify(versions)===JSON.stringify(profile.migrations.map(m=>m.name.slice(0,14))),'all_exact_profile_versions_applied_in_order')
 phase='global_auth_browser_acceptance'
 await realGlobalDocumentsAcceptance({url,anon,service,sql,command,check,report,spawn})
 report.result='PASS'
}catch(error){
 report.result='FAIL';report.failed_phase=phase;report.error=/^D1_GLOBAL_[A-Z0-9_]{1,100}$/.test(error?.message??'')?error.message:'D1_GLOBAL_SAFE_UNCLASSIFIED_FAILURE';process.exitCode=1
}finally{
 if(started){try{command('supabase',['stop','--no-backup','--project-id',project]);check(!command('docker',['ps','-a','--format','{{.Names}}']).split('\n').some(n=>n.includes(project)),'own_disposable_stack_containers_removed');report.teardown='PASS'}catch{report.teardown='FAIL';report.result='FAIL';process.exitCode=1}}
 report.passed=report.checks.filter(c=>c.result==='PASS').length
 writeFileSync(resolve(process.env.RUNNER_TEMP??'.','documents-global-d1.safe.json'),JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify(report))
}
