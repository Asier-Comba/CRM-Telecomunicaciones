// Adapted from Unit62; disposable projection only, all document capabilities OFF from startup.
import {spawn,spawnSync} from 'node:child_process'
import {existsSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {resolve,join,sep} from 'node:path'
import {randomBytes,randomUUID} from 'node:crypto'
import {createServerClient} from '@supabase/ssr'
import {commercialChain} from './commercial-chain.mjs'
import {prepareProjection} from './projection.mjs'
import {commercialBrowser} from './commercial-browser.mjs'

const project='crm-telecom-p0-schema88-'+process.env.GITHUB_RUN_ID,origin='http://127.0.0.1:3182'
let projectRoot
const report={contract:'staging.base87-plus-storage88.acceptance.v1',result:'NOT_RUN',checks:[],hosted:'NOT_TESTED',cdn_revocation:'NOT_TESTED',storage179_adopted:false,capabilities_enabled:false}
let started=false,server,phase='preflight'
async function stopApp(){
  if(!server||server.exitCode!==null)return
  server.kill('SIGTERM');await new Promise(resolve=>{const t=setTimeout(()=>{server.kill('SIGKILL');resolve()},5000);server.once('exit',()=>{clearTimeout(t);resolve()})})
}
const check=(ok,name)=>{report.checks.push({name,result:ok?'PASS':'FAIL'});if(!ok)throw Error('CHECK_'+name.toUpperCase())}
function command(bin,args,options={}){
  if(bin==='supabase'&&projectRoot)args=['--workdir',projectRoot,...args]
  const r=spawnSync(bin,args,{encoding:'utf8',timeout:120000,maxBuffer:20*1024*1024,...options})
  if(r.status!==0)throw Error('COMMAND_'+bin.toUpperCase()+'_FAILED') // Never print CLI credentials.
  return r.stdout.trim()
}
try{
  if(process.platform!=='linux'||process.env.GITHUB_ACTIONS!=='true'||process.env.CI!=='true'||process.env.P0_SCHEMA88_LAB!=='BASE87_PLUS_STORAGE88_ALWAYS_OFF')throw Error('EXPLICIT_DISPOSABLE_CI_ONLY')
  if(!/^[0-9]{1,20}$/.test(process.env.GITHUB_RUN_ID??'')||!process.env.RUNNER_TEMP)throw Error('OWNED_RUNNER_REQUIRED')
  if(['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SUPABASE_URL'].some(k=>process.env[k])||existsSync('supabase/.temp/project-ref'))throw Error('HOSTED_CONFIG_FORBIDDEN')
  if(command('docker',['ps','-a','--format','{{.Names}}']).trim())throw Error('EMPTY_RUNNER_REQUIRED')
  if(command('supabase',['--version'])!=='2.119.0')throw Error('CLI_PIN_MISMATCH')
  command('supabase',['start','--help'])
  command('supabase',['stop','--help'])
  report.source=command('git',['rev-parse','HEAD']);report.tree=command('git',['rev-parse','HEAD^{tree}'])
  projectRoot=mkdtempSync(join(resolve(process.env.RUNNER_TEMP),'crm-p0-schema88-'))
  report.schema=prepareProjection(new URL('../../',import.meta.url),projectRoot,project)
  report.executed=report.source
  phase='stack_start';started=true
  command('supabase',['start','--exclude','realtime,imgproxy,studio,postgres-meta,edge-runtime,logflare,vector,supavisor,mailpit'],{timeout:600000})
  const status=JSON.parse(command('supabase',['status','--output','json'])),url=status.API_URL,anon=status.ANON_KEY,service=status.SERVICE_ROLE_KEY
  if(url!=='http://127.0.0.1:54321'||!anon||!service)throw Error('LOOPBACK_KEYS_REQUIRED')
  const db=command('docker',['ps','--format','{{.Names}}|{{.Image}}']).split('\n').map(l=>l.split('|')).find(([n,i])=>n.includes(project)&&i.includes('supabase/postgres:'))?.[0]
  if(!db)throw Error('LOCAL_DB_REQUIRED')
  const sql=source=>command('docker',['exec','-i',db,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:source})
  check(sql('select count(*) from supabase_migrations.schema_migrations')==='88','applied_base87_plus_storage88')
  async function http(path,token=anon,method='GET',body,mime){
    const r=await fetch(url+path,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{apikey:token===service?service:anon,authorization:'Bearer '+token,...(body!==undefined?{'content-type':mime??'application/json'}:{})},body:body===undefined?undefined:mime?body:JSON.stringify(body)})
    const bytes=Buffer.from(await r.arrayBuffer());let json;try{json=JSON.parse(bytes)}catch{}
    return {status:r.status,json,bytes}
  }
  const rpc=(name,args,token)=>http('/rest/v1/rpc/'+name,token,'POST',args)
  check(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='document_library_v2_list'")==='0','d1_rpc_absent_in_projection')
  check(sql("select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname in ('telecom_v1_document_object_read','document_content_v1_pending_read')")==='0','storage88_two_read_policies_absent')
  phase='synthetic_auth'
  const wa=randomUUID(),wb=randomUUID(),users={},operator=randomUUID(),stage=randomUUID()
  for(const [name,workspace,role]of [['ownerA',wa,'owner'],['adminA',wa,'admin'],['memberA',wa,'member'],['viewerA',wa,'viewer'],['ownerB',wb,'owner']]){
    const email='unit62-'+name.toLowerCase()+'@example.invalid',password=randomBytes(32).toString('base64url')
    const created=await http('/auth/v1/admin/users',service,'POST',{email,password,email_confirm:true})
    check(created.status<300&&/^[0-9a-f-]{36}$/.test(created.json?.id??''),'auth_create_'+name)
    const login=await http('/auth/v1/token?grant_type=password',anon,'POST',{email,password})
    check(login.status===200&&!!login.json.access_token,'auth_login_'+name)
    users[name]={id:created.json.id,token:login.json.access_token,refresh:login.json.refresh_token,email,password,workspace,role}
  }
  sql(`begin;insert into public.workspaces(id,name,slug) values('${wa}','Unit62 Synthetic A','unit62-a'),('${wb}','Unit62 Synthetic B','unit62-b');insert into public.workspace_members(workspace_id,user_id,role,status)values ${Object.values(users).map(u=>`('${u.workspace}','${u.id}','${u.role}','active')`).join(',')};${Object.values(users).map(u=>`update public.profiles set workspace_id='${u.workspace}' where id='${u.id}';`).join('')}insert into public.telecom_operators(id,workspace_id,code,display_name)values('${operator}','${wa}','unit62','Unit62 Synthetic Operator');insert into public.opportunity_stages(id,workspace_id,code,display_name,position,outcome)values('${stage}','${wa}','unit62-open','Unit62 Open',0,null);commit;`)
  phase='app_start'
  const env=Object.fromEntries(['PATH','HOME','USERPROFILE','TEMP','TMP','SystemRoot','WINDIR','ComSpec'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]))
  Object.assign(env,{CI:'true',NODE_ENV:'development',APP_ENV:'test',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,PRODUCT_V1_ENABLED:'true',PRODUCT_LOCAL_INTEGRATION:'true',PRODUCT_LOCAL_SYNTHETIC:'true',PRODUCT_STAGING_INTEGRATION:'false',NEXT_PUBLIC_ENABLE_DEMO_DATA:'false',NEXT_PUBLIC_FORCE_OFFLINE_DEV:'false',PRODUCT_V1_ORIGIN:origin,PRODUCT_DOCUMENT_LIBRARY_ENABLED:'false',PRODUCT_DOCUMENT_CONTENT_ENABLED:'false',PRODUCT_DOCUMENT_MAINTENANCE_ENABLED:'false',PRODUCT_DOCUMENT_SCAN_REQUIRED:'true',AI_ENABLED:'false',CRM_EMAIL_ENABLED:'false'})
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3182'],{env,stdio:'ignore'})
  let ready=false
  for(let n=0;n<90;n++){try{if((await fetch(origin+'/login',{signal:AbortSignal.timeout(1500)})).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}
  if(!ready)throw Error('APP_NOT_READY')
  // Warm route compilation using an invalid operation, never a business command.
  for(const path of ['/api/product/v1/queries','/api/portfolio/v1/commands','/api/billing/v1/queries']){
    const r=await fetch(origin+path,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({operation:'warmup.invalid',input:{}}),signal:AbortSignal.timeout(120000)})
    check(r.status===400,'warm_'+path.replaceAll('/','_'))
  }
  const cookies=[],ssr=createServerClient(url,anon,{cookies:{getAll:()=>[],setAll:v=>cookies.push(...v)}})
  check(!(await ssr.auth.setSession({access_token:users.ownerA.token,refresh_token:users.ownerA.refresh})).error,'real_owner_cookie')
  const cookie=cookies.map(v=>v.name+'='+v.value).join('; ')
  async function post(path,operation,input,mime){
    const r=await fetch(origin+path,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{origin,cookie,'content-type':mime??'application/json'},body:mime?input:JSON.stringify({operation,input})})
    const bytes=Buffer.from(await r.arrayBuffer());let json;try{json=JSON.parse(bytes)}catch{}
    return{status:r.status,json,bytes}
  }
  const c={rpc,sql,http,post,check,users,wa,wb,operator,stage,url,anon,origin}
  phase='commercial_rpc';await commercialChain(c,'storage88')
  phase='document_routes_off'
  for(const path of ['/api/document/library/v2/queries','/api/document/v1/content/commands','/api/document/v1/content/download','/api/document/v1/maintenance']){
    const r=await post(path,'document.library_list',{})
    check(r.status===503&&r.json?.error==='unavailable','off_'+path.replaceAll('/','_'))
  }
  report.commercial_flags={document_library:false,document_content:false,document_maintenance:false,ai_live:false,providers:false}
  phase='commercial_browser';await commercialBrowser(c,report)
  report.result='PASS'
}catch(error){
  report.result='FAIL';report.failed_phase=phase
  report.error=/^[A-Z0-9_]{1,180}$/.test(error?.message??'')?error.message:'SAFE_UNCLASSIFIED_FAILURE'
  process.exitCode=1
}finally{
  await stopApp()
  if(started){try{command('supabase',['stop','--no-backup','--project-id',project]);report.teardown='PASS'}catch{report.teardown='FAIL';process.exitCode=1}}
  if(projectRoot){
    const parent=resolve(process.env.RUNNER_TEMP),target=resolve(projectRoot)
    if(target.startsWith(parent+sep)&&target.slice(parent.length+1).startsWith('crm-p0-schema88-')){try{rmSync(target,{recursive:true});report.project_files_removed=true}catch{report.project_files_removed=false;process.exitCode=1}}
    else{report.project_files_removed=false;process.exitCode=1}
  }
  report.passed=report.checks.filter(c=>c.result==='PASS').length
  writeFileSync(resolve(process.env.RUNNER_TEMP??'.','staging-schema88.safe.json'),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report))
}
