import {spawn,spawnSync} from 'node:child_process'
import {existsSync,readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {realDocumentsAcceptance} from './real-acceptance.mjs'

const project='crm-telecom-local'
const report={contract:'documents.pro.d1.acceptance.v1',result:'NOT_RUN',checks:[],global_inventory:'BLOCKED_W1_AGREEMENT',folders:'BLOCKED_W1_AGREEMENT',private_bytes:'OFF',hosted:'NOT_RUN',storage_security_acceptance:'NOT_GRANTED'}
let started=false,phase='preflight'
function command(bin,args,options={}){
  const r=spawnSync(bin,args,{encoding:'utf8',timeout:120000,maxBuffer:20*1024*1024,...options})
  if(r.status!==0)throw Error('D1_LOCAL_COMMAND_FAILED')
  return r.stdout.trim() // Never publish CLI output or credentials.
}
const check=(ok,name)=>{report.checks.push({name,result:ok?'PASS':'FAIL'});if(!ok)throw Error('D1_CHECK_FAILED')}
try{
  if(process.env.GITHUB_ACTIONS!=='true'||process.env.CI!=='true'||process.env.DOCUMENTS_PRO_D1!=='true')throw Error('D1_EXPLICIT_DISPOSABLE_CI_ONLY')
  if(['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SUPABASE_URL'].some(k=>process.env[k])||existsSync('supabase/.temp/project-ref'))throw Error('D1_HOSTED_CONFIG_FORBIDDEN')
  if(!readFileSync('supabase/config.toml','utf8').includes('project_id = "'+project+'"'))throw Error('D1_PROJECT_MISMATCH')
  if(command('docker',['ps','-a','--format','{{.Names}}']).split('\n').some(n=>n.includes(project)))throw Error('D1_EMPTY_RUNNER_REQUIRED')
  if(command('supabase',['--version'])!=='2.119.0')throw Error('D1_CLI_PIN_MISMATCH')
  command('supabase',['start','--help']);command('supabase',['stop','--help'])
  report.source=command('git',['rev-parse','HEAD']);report.tree=command('git',['rev-parse','HEAD^{tree}'])
  const migrations=readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')).sort()
  check(migrations.length===87&&migrations.at(-1)==='20261020100000_business_conflict_non_retryable.sql','canonical_87_unchanged')
  phase='stack_start';started=true
  command('supabase',['start','--exclude','realtime,imgproxy,studio,postgres-meta,edge-runtime,logflare,vector,supavisor,mailpit'],{timeout:600000})
  const status=JSON.parse(command('supabase',['status','--output','json'])),url=status.API_URL,anon=status.ANON_KEY,service=status.SERVICE_ROLE_KEY
  if(url!=='http://127.0.0.1:54321'||!anon||!service)throw Error('D1_LOOPBACK_KEYS_REQUIRED')
  const db=command('docker',['ps','--format','{{.Names}}|{{.Image}}']).split('\n').map(l=>l.split('|')).find(([n,i])=>n.includes(project)&&i.includes('supabase/postgres:'))?.[0]
  if(!db)throw Error('D1_LOCAL_DB_REQUIRED')
  const sql=source=>command('docker',['exec','-i',db,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:source})
  check(sql('select count(*) from supabase_migrations.schema_migrations')==='87','applied_87')
  phase='document_acceptance'
  await realDocumentsAcceptance({url,anon,service,sql,command,check,report,spawn})
  report.result='PASS'
}catch(error){
  report.result='FAIL';report.failed_phase=phase
  report.error=/^D1_[A-Z0-9_]{1,100}$/.test(error?.message??'')?error.message:'D1_SAFE_UNCLASSIFIED_FAILURE'
  process.exitCode=1
}finally{
  if(started){try{command('supabase',['stop','--no-backup','--project-id',project]);report.teardown='PASS'}catch{report.teardown='FAIL';report.result='FAIL';process.exitCode=1}}
  report.passed=report.checks.filter(c=>c.result==='PASS').length
  writeFileSync(resolve(process.env.RUNNER_TEMP??'.','documents-pro-d1.safe.json'),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report))
}
