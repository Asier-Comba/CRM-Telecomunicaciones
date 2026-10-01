import { spawnSync } from 'node:child_process'
import { existsSync,readFileSync,writeFileSync,mkdtempSync,cpSync,rmSync,readdirSync,mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { authEmail } from './auth-email.mjs'
const project='crm-enterprise-local',root=process.cwd(),evidence={environment:'LOCAL_SUPABASE_DOCKER',AUTH_EMAIL_LOCAL:'NOT_RUN',STORAGE_RECOVERY:'NOT_RUN',hosted_execution:'NOT_TESTED',EXTERNAL_SENDS:0}
let work,started=false,stage='preflight'
function command(bin,args,options={}){const r=spawnSync(bin,args,{cwd:work||root,encoding:'utf8',timeout:120000,maxBuffer:20*1024*1024,...options});if(r.status!==0)throw new Error('LOCAL_COMMAND_FAILED');return r.stdout.trim()}
try {
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.CI!=='true')throw new Error('CI_ONLY')
 if(process.env.SUPABASE_ACCESS_TOKEN||process.env.SUPABASE_DB_PASSWORD||Object.keys(process.env).some(n=>/^(SMTP_|SUPABASE_SERVICE_ROLE_KEY|JWT_SECRET|DATABASE_URL)/.test(n))||existsSync('supabase/.temp/project-ref'))throw new Error('EXTERNAL_CONFIGURATION_FORBIDDEN')
 if(command('docker',['ps','-a','--format','{{.Names}}']).split('\n').some(n=>n.includes(project)))throw new Error('EMPTY_RUNNER_REQUIRED')
 evidence.cli=command('supabase',['--version']);if(evidence.cli!=='2.119.0')throw new Error('CLI_VERSION')
 evidence.sha=command('git',['rev-parse','HEAD'])
 work=mkdtempSync(resolve(tmpdir(),'w4-enterprise-'));cpSync(resolve(root,'supabase/migrations'),resolve(work,'supabase/migrations'),{recursive:true});cpSync(resolve(root,'platform/auth-templates'),resolve(work,'supabase/templates'),{recursive:true})
 let config=readFileSync('supabase/config.toml','utf8').replace('crm-telecom-local',project).replace('[auth]\nenabled = true','[auth]\nenabled = true\nenable_signup = true\nminimum_password_length = 12\njwt_expiry = 900\nenable_refresh_token_rotation = true')
 config+='\n[auth.email]\nenable_signup = true\nenable_confirmations = true\nmax_frequency = "1s"\notp_expiry = 900\n\n[auth.rate_limit]\nemail_sent = 100\nsign_in_sign_ups = 100\n'
 for(const kind of ['confirmation','recovery','invite'])config+=`\n[auth.email.template.${kind}]\nsubject = "W4 ${kind}"\ncontent_path = "./supabase/templates/${kind}.html"\n`
 writeFileSync(resolve(work,'supabase/config.toml'),config);evidence.config_sha256=createHash('sha256').update(config).digest('hex');evidence.config_scope='TEST_OVERLAY_NOT_APPROVED_PRODUCT_POLICY'
 stage='stack_start';started=true;command('supabase',['start','--exclude','realtime,imgproxy,studio,postgres-meta,edge-runtime,logflare,vector,supavisor'],{timeout:600000})
 const status=JSON.parse(command('supabase',['status','--output','json'])),url=status.API_URL||status.api?.url,anon=status.ANON_KEY||status.auth?.anon_key,service=status.SERVICE_ROLE_KEY||status.auth?.service_role_key
 if(url!=='http://127.0.0.1:54321'||!anon||!service)throw new Error('LOCAL_IDENTITY_REQUIRED')
 const containers=command('docker',['ps','--format','{{.Names}}|{{.Image}}']).split('\n').map(s=>s.split('|')).filter(([n])=>n.includes(project));evidence.service_images=containers.map(([,image])=>image).sort()
 const auth=containers.find(([,image])=>/supabase\/gotrue:/.test(image))?.[0],db=containers.find(([,image])=>/supabase\/postgres:/.test(image))?.[0],mail=containers.find(([,image])=>/mailpit/.test(image))?.[0]
 if(!auth||!db||!mail)throw new Error('AUTH_DB_MAILPIT_REQUIRED')
 const authEnv=JSON.parse(command('docker',['inspect',auth,'--format','{{json .Config.Env}}']));const vars=Object.fromEntries(authEnv.map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1)]}))
 if(!vars.GOTRUE_SMTP_HOST?.includes(project)||!/(inbucket|mailpit)/.test(vars.GOTRUE_SMTP_HOST))throw new Error('LOCAL_MAIL_CAPTURE_REQUIRED')
 const mailEnv=JSON.parse(command('docker',['inspect',mail,'--format','{{json .Config.Env}}']));if(mailEnv.some(s=>/^MP_SMTP_(RELAY|FORWARD)/.test(s)))throw new Error('MAIL_RELAY_FORBIDDEN')
 evidence.db=command('docker',['exec',db,'psql','-X','-qAt','-U','postgres','-d','postgres','-c','show server_version']);evidence.migrations=readdirSync(resolve(root,'supabase/migrations')).filter(n=>n.endsWith('.sql')).length
 stage='auth_email';evidence.mail=await authEmail({anon,service,privateValues:[vars.GOTRUE_JWT_SECRET,vars.GOTRUE_DB_DATABASE_URL]});evidence.AUTH_EMAIL_LOCAL='PASS'
 if(existsSync(resolve(root,'scripts/platform/storage-recovery.mjs'))){stage='storage_recovery';const {storageRecovery}=await import('./storage-recovery.mjs');evidence.recovery=await storageRecovery({url,anon,service,db,command});evidence.STORAGE_RECOVERY=evidence.recovery.RESULT}
 evidence.result='PASS'
} catch(e){evidence.result='FAIL';evidence.failed_stage=stage;evidence.error=/^[A-Z0-9_]+$/.test(e.message)?e.message:'BOUNDED_ENTERPRISE_FAILURE';process.exitCode=1}
finally {
 if(started)try{command('supabase',['stop','--no-backup','--project-id',project]);evidence.teardown='PASS'}catch{evidence.teardown='FAIL';process.exitCode=1}
 if(work)rmSync(work,{recursive:true,force:true})
 if(process.env.RUNNER_TEMP)writeFileSync(resolve(process.env.RUNNER_TEMP,'w4-enterprise-safe-evidence.json'),JSON.stringify(evidence,null,2)+'\n')
 console.log(JSON.stringify(evidence,null,2))
}
