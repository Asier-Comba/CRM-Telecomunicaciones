import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {randomBytes} from 'node:crypto'
import {disposableGuard,readJson,hash,run} from './lib.mjs'
import {validateWorkflow} from './operations.mjs'
import {encryptBackup,decryptBackup} from './backup.mjs'
disposableGuard()
if(process.platform!=='linux'||process.env.GITHUB_ACTIONS!=='true')throw new Error('N8N_DISPOSABLE_LINUX_ONLY')
const suffix=randomBytes(6).toString('hex'),prefix=`w5-n8n-${suffix}`,network=prefix+'-network',volume=prefix+'-data',db=prefix+'-db',app=prefix+'-app',scratch=mkdtempSync(join(tmpdir(),'w5-n8n-')),pins=readJson('infra/n8n/disposable-image-pins.json'),checks=[],source_sha=run('git',['rev-parse','HEAD']).trim()
const prove=(ok,name)=>{if(!ok)throw new Error(name);checks.push({name,status:'PASS'})}
let stage='PREFLIGHT',evidence={status:'NOT_RUN',scope:'DISPOSABLE_ACTUAL_N8N',source_sha,checks,provider_values_included:false}
const docker=(args,options={})=>run('docker',args,{timeout:240000,...options})
const startApp=()=>docker(['run','-d','--name',app,'--network',network,'--user','1000:1000','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','2g','--cpus','2','--tmpfs','/tmp:size=64m,uid=1000,gid=1000,mode=1777','--tmpfs','/home/node/.cache:size=256m,uid=1000,gid=1000,mode=0700','-p','127.0.0.1:5678:5678','-v',`${volume}:/home/node/.n8n`,'-v',`${scratch}/database.secret:/run/secrets/database:ro`,'-v',`${scratch}/key.secret:/run/secrets/key:ro`,'--env-file',join(scratch,'public.env'),pins.n8n.image])
const request=async(path,options={})=>{
 // Internal networks deliberately prohibit external ingress/egress. Probe the
 // actual server from its own loopback, not through host DNAT of that network.
 const script=`fetch(${JSON.stringify('http://127.0.0.1:5678'+path)},{...${JSON.stringify(options)},redirect:'error',signal:AbortSignal.timeout(3000)}).then(r=>process.stdout.write(JSON.stringify({ok:r.ok,status:r.status}))).catch(()=>process.stdout.write(JSON.stringify({ok:false,status:0})))`
 return JSON.parse(docker(['exec',app,'node','-e',script],{timeout:10000}))
}
function startupDiagnostic(){
 let state={},categories=[],missing_files=[],migration_steps=[]
 try{const s=JSON.parse(docker(['inspect','--format','{{json .State}}',app]));state={running:s.Running===true,exit_code:Number.isInteger(s.ExitCode)?s.ExitCode:null,oom_killed:s.OOMKilled===true}}catch{}
 try{const log=docker(['logs',app]);for(const [name,pattern] of Object.entries({FILE_PERMISSION:/EACCES|permission denied/i,READONLY_FILESYSTEM:/EROFS|read-only file system/i,DATABASE_AUTH:/password authentication failed|SASL.*password/i,DATABASE_CONNECTION:/ECONNREFUSED|ENOTFOUND|database.*connection/i,ENCRYPTION_KEY:/mismatching encryption keys|encryption.*key.*error/i,MISSING_FILE:/ENOENT/i,CONFIGURATION:/invalid.*config|unknown.*environment/i,MIGRATIONS:/migration.*failed/i}))if(pattern.test(log))categories.push(name)
 // Only public installed-file coordinates and vendor migration identifiers.
 missing_files=[...log.matchAll(/ENOENT:[^\r\n]*?(open|mkdir|stat|scandir) ['"]((?:\/usr\/local\/lib\/node_modules\/n8n|\/opt\/n8n|\/home\/node\/\.cache\/n8n)\/[A-Za-z0-9/@._-]+)['"]/g)].map(m=>({operation:m[1],vendor_file:m[2]})).slice(-3)
 migration_steps=[...log.matchAll(/(?:Starting|Finished|Migration) migration?\s*["']?([A-Z][A-Za-z]{1,100}\d{13})/g)].map(m=>m[1]).slice(-5)
 }catch{}
 return {state,categories,missing_files,migration_steps,raw_logs_retained:false}
}
async function ready(){for(let i=0;i<80;i++){try{if((await request('/healthz/readiness')).ok)return true}catch{}if(i%10===0&&startupDiagnostic().state.running===false)return false;await new Promise(r=>setTimeout(r,500))}return false}
function workflows(){docker(['exec',app,'n8n','export:workflow','--all','--output=/tmp/export.json']);return JSON.parse(docker(['exec',app,'node','-e',"process.stdout.write(require('fs').readFileSync('/tmp/export.json','utf8'))"]))}
function snapshot(){
 const w=workflows();prove(w.length===1&&w[0].id==='synthetic-health-v1'&&w[0].name===readJson('infra/n8n/synthetic-health.json').name&&w[0].active===false,'ONLY_REGISTERED_INACTIVE_EXPORT')
 const clean=structuredClone(w[0])
 // Vendor exports may serialize empty execution-data placeholders. Assert they
 // contain no data before excluding them from the repository's strict contract.
 for(const name of ['pinData','staticData'])if(Object.hasOwn(clean,name)){const value=clean[name];prove(value===null||typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===0,'VENDOR_EXECUTION_DATA_EMPTY');delete clean[name]}
 prove(validateWorkflow(clean).status==='VALID','INACTIVE_CLOSED_EXPORT')
 return hash(JSON.stringify(w.map(({id,name,nodes,connections,active})=>({id,name,nodes,connections,active}))))
}
try{
 prove(pins.scope==='DISPOSABLE_ACCEPTANCE_NOT_COMPANY_APPROVED'&&Object.values({a:pins.n8n,b:pins.postgres}).every(p=>/^docker\.io\/[A-Za-z0-9/._-]+:[A-Za-z0-9.-]+@sha256:[a-f0-9]{64}$/.test(p.image)),'EXACT_VENDOR_DIGEST_PINS')
 docker(['pull',pins.n8n.image],{timeout:600000});docker(['pull',pins.postgres.image],{timeout:600000})
 docker(['network','create','--internal',network]);docker(['volume','create',volume])
 const encryption=randomBytes(32).toString('hex'),password=randomBytes(32).toString('hex')
 writeFileSync(join(scratch,'key.secret'),encryption,{mode:0o600});writeFileSync(join(scratch,'database.secret'),password,{mode:0o600})
 docker(['run','--rm','--network','none','--user','0','--entrypoint','sh','-v',`${volume}:/home/node/.n8n`,'-v',`${scratch}:/fixture`,pins.n8n.image,'-c','chown -R 1000:1000 /home/node/.n8n && chown 1000:1000 /fixture/key.secret /fixture/database.secret && chmod 600 /fixture/key.secret /fixture/database.secret'])
 docker(['run','-d','--name',db,'--network',network,'--network-alias','database','-v',`${scratch}/database.secret:/run/secrets/database:ro`,'-e','POSTGRES_USER=n8n','-e','POSTGRES_DB=n8n','-e','POSTGRES_PASSWORD_FILE=/run/secrets/database',pins.postgres.image])
 let pgReady=false;for(let i=0;i<60;i++){try{docker(['exec',db,'pg_isready','-U','n8n','-d','n8n'],{timeout:2000});pgReady=true;break}catch{}await new Promise(r=>setTimeout(r,500))}prove(pgReady,'ACTUAL_POSTGRES_READY')
 const env={NODE_ENV:'production',DB_TYPE:'postgresdb',DB_POSTGRESDB_HOST:'database',DB_POSTGRESDB_PORT:'5432',DB_POSTGRESDB_DATABASE:'n8n',DB_POSTGRESDB_USER:'n8n',DB_POSTGRESDB_PASSWORD_FILE:'/run/secrets/database',N8N_ENCRYPTION_KEY_FILE:'/run/secrets/key',N8N_DIAGNOSTICS_ENABLED:'false',N8N_VERSION_NOTIFICATIONS_ENABLED:'false',N8N_TEMPLATES_ENABLED:'false',N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS:'true',N8N_BLOCK_ENV_ACCESS_IN_NODE:'true',N8N_SECURE_COOKIE:'false',EXECUTIONS_DATA_SAVE_ON_SUCCESS:'none',EXECUTIONS_DATA_SAVE_ON_ERROR:'none',EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS:'false'}
 writeFileSync(join(scratch,'public.env'),Object.entries(env).map(([k,v])=>`${k}=${v}`).join('\n'),{mode:0o600})
 startApp()
 stage='READINESS';prove(await ready(),'ACTUAL_N8N_READINESS');prove(docker(['exec',app,'id','-u']).trim()==='1000','NONROOT_RUNTIME')
 const version=docker(['exec',app,'n8n','--version']).trim();prove(version===pins.n8n.version,'ACTUAL_N8N_PINNED_VERSION')
 const keyTest=`const fs=require('fs'),crypto=require('crypto'),c=JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8'));process.stdout.write(crypto.createHash('sha256').update(c.encryptionKey||'').digest('hex')==='${hash(encryption)}'?'PASS':'FAIL')`
 prove(docker(['exec',app,'node','-e',keyTest]).trim()==='PASS','MOUNTED_ENCRYPTION_KEY_BOUND')
 const ownerPassword=randomBytes(24).toString('base64url')+'Aa1!'
 stage='OWNER_SETUP';const setup=await request('/rest/owner/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'owner@example.invalid',firstName:'Synthetic',lastName:'Owner',password:ownerPassword})});prove(setup.ok,'SYNTHETIC_OWNER_SETUP')
 const workflow=readJson('infra/n8n/synthetic-health.json');prove(validateWorkflow(workflow).status==='VALID','ONLY_REGISTERED_NOOP_IMPORT')
 stage='REGISTERED_FILE_WRITE';docker(['exec',app,'node','-e',"require('fs').writeFileSync('/tmp/workflow.json',process.argv[1],{mode:0o600})",JSON.stringify({...workflow,id:'synthetic-health-v1'})]);prove(docker(['exec',app,'node','-e',"const s=require('fs').statSync('/tmp/workflow.json');process.stdout.write(s.uid===1000&&(s.mode&0o777)===0o600?'PASS':'FAIL')"]).trim()==='PASS','REGISTERED_IMPORT_FILE_PRIVATE_UID')
 stage='REGISTERED_IMPORT';docker(['exec',app,'n8n','import:workflow','--input=/tmp/workflow.json'])
 stage='INACTIVE_EXPORT_AND_RESTART'
 const first=snapshot();docker(['restart',app]);prove(await ready(),'ACTUAL_PROCESS_RESTART_READY');prove(snapshot()===first,'WORKFLOW_PERSISTED_AFTER_PROCESS_RESTART');prove(docker(['exec',app,'node','-e',keyTest]).trim()==='PASS','KEY_PERSISTED_AFTER_PROCESS_RESTART')
 docker(['restart',db]);docker(['restart',app]);prove(await ready(),'ACTUAL_DATABASE_AND_PROCESS_RESTART_READY');prove(snapshot()===first,'WORKFLOW_PERSISTED_AFTER_DATABASE_RESTART')
 stage='ENCRYPTED_BACKUP'
 const database_sql=docker(['exec',db,'pg_dump','-U','n8n','-d','n8n','--no-owner','--no-acl']),config_json=docker(['exec',app,'node','-e',"process.stdout.write(require('fs').readFileSync('/home/node/.n8n/config','utf8'))"])
 const bundle={version:1,source_sha,n8n_image:pins.n8n.image,postgres_image:pins.postgres.image,database_sql,config_json,database_sha256:hash(database_sql),config_sha256:hash(config_json)},backupKey=randomBytes(32),archive=encryptBackup(Buffer.from(JSON.stringify(bundle)),backupKey,'n8n-disposable-v1'),backupPath=join(scratch,'n8n-encrypted-backup.bin')
 writeFileSync(backupPath,archive,{mode:0o600});const retrieved=readFileSync(backupPath);prove(hash(retrieved)===hash(archive),'ACTUAL_ENCRYPTED_BACKUP_READBACK')
 let wrongKeyRejected=false;try{decryptBackup(retrieved,randomBytes(32))}catch{wrongKeyRejected=true}prove(wrongKeyRejected,'ACTUAL_BACKUP_WRONG_KEY_REJECTED')
 const restored=JSON.parse(decryptBackup(retrieved,backupKey));backupKey.fill(0)
 prove(restored.source_sha===source_sha&&restored.n8n_image===pins.n8n.image&&restored.postgres_image===pins.postgres.image&&hash(restored.database_sql)===restored.database_sha256&&hash(restored.config_json)===restored.config_sha256,'AUTHENTICATED_RESTORE_IDENTITY_AND_HASHES')
 // Only the random containers/volume and database created above are destroyed.
 // Authenticated readback/identity checks precede destruction of disposable A.
 stage='RESTORE_EMPTY_DISPOSABLE_DATABASE_AND_CONFIG'
 docker(['rm','-f',app]);docker(['volume','rm',volume]);docker(['volume','create',volume])
 docker(['run','--rm','--network','none','--user','0','--entrypoint','sh','-v',`${volume}:/home/node/.n8n`,pins.n8n.image,'-c','chown 1000:1000 /home/node/.n8n'])
 docker(['run','--rm','--network','none','--user','1000:1000','--entrypoint','node','-i','-v',`${volume}:/home/node/.n8n`,pins.n8n.image,'-e',"let text='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>text+=c);process.stdin.on('end',()=>require('fs').writeFileSync('/home/node/.n8n/config',text,{mode:0o600}))"],{input:restored.config_json})
 docker(['exec',db,'psql','-U','n8n','-d','postgres','-v','ON_ERROR_STOP=1','-c','DROP DATABASE n8n;']);docker(['exec',db,'psql','-U','n8n','-d','postgres','-v','ON_ERROR_STOP=1','-c','CREATE DATABASE n8n OWNER n8n;'])
 docker(['exec','-i',db,'psql','-U','n8n','-d','n8n','-v','ON_ERROR_STOP=1'],{input:restored.database_sql})
 startApp();prove(await ready(),'ACTUAL_EMPTY_RESTORE_N8N_READY');prove(snapshot()===first,'INACTIVE_WORKFLOW_RESTORED_EXACTLY');prove(docker(['exec',app,'node','-e',keyTest]).trim()==='PASS','ORIGINAL_ENCRYPTION_KEY_RESTORED')
 const login=await request('/rest/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({emailOrLdapLoginId:'owner@example.invalid',password:ownerPassword})});prove(login.ok,'ACTUAL_FRESH_OWNER_LOGIN_AFTER_RESTORE')
 evidence={...evidence,status:'PASS',scope:'DISPOSABLE_ACTUAL_N8N_POSTGRES_INACTIVE_WORKFLOW_AND_ENCRYPTED_EMPTY_RESTORE',version,workflow_effects:false,external_network:'INTERNAL_DOCKER_NETWORK',http_proof_scope:'ACTUAL_CONTAINER_LOOPBACK_ONLY',host_ingress:'NOT_PROVEN',image:pins.n8n.image,backup_scope:'SYNTHETIC_POSTGRES_AND_PRIVATE_INSTANCE_CONFIG_ONLY',offsite:'NOT_PROVEN',company_runtime:'NOT_ACCEPTED',production:'NOT_PROVEN'}
}catch(e){evidence={...evidence,status:'FAIL',failed_stage:stage,error:/^[A-Z][A-Z0-9_]+$/.test(e.message)?e.message:'N8N_LOCAL_ACCEPTANCE_FAILURE',startup_diagnostic:startupDiagnostic()};process.exitCode=1}
finally{for(const name of [app,db])try{docker(['rm','-f',name])}catch{}try{docker(['volume','rm',volume])}catch{}try{docker(['network','rm',network])}catch{}
 try{if(docker(['ps','-a','--format','{{.Names}}']).split('\n').some(n=>[app,db].includes(n))||docker(['volume','ls','--format','{{.Name}}']).split('\n').includes(volume)||docker(['network','ls','--format','{{.Name}}']).split('\n').includes(network))throw new Error();evidence.teardown='PASS'}catch{evidence.teardown='FAIL';process.exitCode=1}
 rmSync(scratch,{recursive:true,force:true});console.log(JSON.stringify(evidence))}
