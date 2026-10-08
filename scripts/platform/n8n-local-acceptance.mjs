import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {randomBytes} from 'node:crypto'
import {disposableGuard,readJson,hash,run} from './lib.mjs'
import {validateWorkflow} from './operations.mjs'
disposableGuard()
if(process.platform!=='linux'||process.env.GITHUB_ACTIONS!=='true')throw new Error('N8N_DISPOSABLE_LINUX_ONLY')
const suffix=randomBytes(6).toString('hex'),prefix=`w5-n8n-${suffix}`,network=prefix+'-network',volume=prefix+'-data',db=prefix+'-db',app=prefix+'-app',scratch=mkdtempSync(join(tmpdir(),'w5-n8n-')),pins=readJson('infra/n8n/disposable-image-pins.json'),checks=[],source_sha=run('git',['rev-parse','HEAD']).trim()
const prove=(ok,name)=>{if(!ok)throw new Error(name);checks.push({name,status:'PASS'})}
let stage='PREFLIGHT',evidence={status:'NOT_RUN',scope:'DISPOSABLE_ACTUAL_N8N',source_sha,checks,provider_values_included:false}
const docker=(args,options={})=>run('docker',args,{timeout:240000,...options})
const request=async(path,options={})=>fetch('http://127.0.0.1:5678'+path,{...options,redirect:'error',signal:AbortSignal.timeout(3000)})
async function ready(){for(let i=0;i<80;i++){try{if((await request('/healthz/readiness')).ok)return true}catch{}await new Promise(r=>setTimeout(r,500))}return false}
function workflows(){docker(['exec',app,'n8n','export:workflow','--all','--output=/tmp/export.json']);return JSON.parse(docker(['exec',app,'node','-e',"process.stdout.write(require('fs').readFileSync('/tmp/export.json','utf8'))"]))}
function snapshot(){const w=workflows();prove(w.length===1&&w[0].active===false&&validateWorkflow(w[0]).status==='VALID','INACTIVE_CLOSED_EXPORT');return hash(JSON.stringify(w.map(({id,name,nodes,connections,active})=>({id,name,nodes,connections,active}))))}
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
 docker(['run','-d','--name',app,'--network',network,'--user','1000:1000','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','2g','--cpus','2','--tmpfs','/tmp:size=64m,uid=1000,gid=1000,mode=1777','-p','127.0.0.1:5678:5678','-v',`${volume}:/home/node/.n8n`,'-v',`${scratch}/database.secret:/run/secrets/database:ro`,'-v',`${scratch}/key.secret:/run/secrets/key:ro`,'--env-file',join(scratch,'public.env'),pins.n8n.image])
 stage='READINESS';prove(await ready(),'ACTUAL_N8N_READINESS');prove(docker(['exec',app,'id','-u']).trim()==='1000','NONROOT_RUNTIME')
 const version=docker(['exec',app,'n8n','--version']).trim();prove(version===pins.n8n.version,'ACTUAL_N8N_PINNED_VERSION')
 const keyTest=`const fs=require('fs'),crypto=require('crypto'),c=JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8'));process.stdout.write(crypto.createHash('sha256').update(c.encryptionKey||'').digest('hex')==='${hash(encryption)}'?'PASS':'FAIL')`
 prove(docker(['exec',app,'node','-e',keyTest]).trim()==='PASS','MOUNTED_ENCRYPTION_KEY_BOUND')
 stage='OWNER_SETUP';const setup=await request('/rest/owner/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'owner@example.invalid',firstName:'Synthetic',lastName:'Owner',password:randomBytes(24).toString('base64url')+'Aa1!'})});prove(setup.ok,'SYNTHETIC_OWNER_SETUP')
 const workflow=readJson('infra/n8n/synthetic-health.json');prove(validateWorkflow(workflow).status==='VALID','ONLY_REGISTERED_NOOP_IMPORT')
 stage='REGISTERED_IMPORT';writeFileSync(join(scratch,'workflow.json'),JSON.stringify({...workflow,id:'synthetic-health-v1'}),{mode:0o600});docker(['cp',join(scratch,'workflow.json'),`${app}:/tmp/workflow.json`]);docker(['exec',app,'n8n','import:workflow','--input=/tmp/workflow.json'])
 stage='INACTIVE_EXPORT_AND_RESTART'
 const first=snapshot();docker(['restart',app]);prove(await ready(),'ACTUAL_PROCESS_RESTART_READY');prove(snapshot()===first,'WORKFLOW_PERSISTED_AFTER_PROCESS_RESTART');prove(docker(['exec',app,'node','-e',keyTest]).trim()==='PASS','KEY_PERSISTED_AFTER_PROCESS_RESTART')
 docker(['restart',db]);docker(['restart',app]);prove(await ready(),'ACTUAL_DATABASE_AND_PROCESS_RESTART_READY');prove(snapshot()===first,'WORKFLOW_PERSISTED_AFTER_DATABASE_RESTART')
 evidence={...evidence,status:'PASS',scope:'DISPOSABLE_ACTUAL_N8N_POSTGRES_INACTIVE_WORKFLOW',version,workflow_effects:false,external_network:'INTERNAL_DOCKER_NETWORK',image:pins.n8n.image,company_runtime:'NOT_ACCEPTED',production:'NOT_PROVEN'}
}catch(e){evidence={...evidence,status:'FAIL',failed_stage:stage,error:/^[A-Z][A-Z0-9_]+$/.test(e.message)?e.message:'N8N_LOCAL_ACCEPTANCE_FAILURE'};process.exitCode=1}
finally{for(const name of [app,db])try{docker(['rm','-f',name])}catch{}try{docker(['volume','rm',volume])}catch{}try{docker(['network','rm',network])}catch{}
 try{if(docker(['ps','-a','--format','{{.Names}}']).split('\n').some(n=>[app,db].includes(n))||docker(['volume','ls','--format','{{.Name}}']).split('\n').includes(volume)||docker(['network','ls','--format','{{.Name}}']).split('\n').includes(network))throw new Error();evidence.teardown='PASS'}catch{evidence.teardown='FAIL';process.exitCode=1}
 rmSync(scratch,{recursive:true,force:true});console.log(JSON.stringify(evidence))}
