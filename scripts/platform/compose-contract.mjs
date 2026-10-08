import {spawnSync} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {root} from './lib.mjs'
export function composeContract(){
 const scratch=mkdtempSync(join(tmpdir(),'w5-compose-'))
 try{
  for(const name of ['public.env','database.secret','encryption.secret'])writeFileSync(join(scratch,name),'',{mode:0o600})
  const env={...process.env,DOCKER_CONFIG:scratch,APP_IMAGE:'synthetic/app@sha256:'+'a'.repeat(64),APP_ENV_FILE:join(scratch,'public.env'),N8N_IMAGE:'docker.n8n.io/n8nio/n8n:0.0.0@sha256:'+'b'.repeat(64),N8N_ENV_FILE:join(scratch,'public.env'),N8N_DATABASE_PASSWORD_FILE:join(scratch,'database.secret'),N8N_ENCRYPTION_SECRET_FILE:join(scratch,'encryption.secret'),N8N_VOLUME_NAME:'synthetic-volume'}
  const results=[]
  for(const [file,service]of [['infra/deployment/compose.yaml','app'],['infra/n8n/compose.preparatory.yaml','n8n']]){
   const result=spawnSync('docker',['compose','-f',join(root,file),'--profile','preparatory','config','--format','json'],{env,encoding:'utf8',timeout:15000,maxBuffer:1024*1024})
   if(result.status!==0)throw new Error('COMPOSE_CONFIGURATION_INVALID')
   const config=JSON.parse(result.stdout),s=config.services?.[service]
   if(!s?.image.includes('@sha256:')||s.read_only!==true||!s.cap_drop?.includes('ALL')||!s.security_opt?.includes('no-new-privileges:true')||s.ports?.some(p=>p.host_ip!=='127.0.0.1')||!s.stop_grace_period||!s.mem_limit||!s.cpus)throw new Error('COMPOSE_HARDENING_DRIFT')
   if(service==='n8n'&&(!s.secrets?.length||!s.volumes?.some(v=>v.target==='/home/node/.n8n')||s.environment.DB_TYPE!=='postgresdb'))throw new Error('N8N_PERSISTENCE_DRIFT')
   results.push({service,status:'PASS',scope:'ACTUAL_COMPOSE_PARSER_ONLY',runtime_started:false})
  }
  return {status:'PASS',results,provider_mutation_performed:false,values_included:false}
 }finally{rmSync(scratch,{recursive:true,force:true})}
}
if(process.argv[1]?.endsWith('compose-contract.mjs'))try{console.log(JSON.stringify(composeContract()))}catch{console.error(JSON.stringify({status:'FAIL',error:'COMPOSE_CONTRACT_FAILED',values_included:false}));process.exitCode=1}
