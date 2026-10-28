import {spawnSync} from 'node:child_process'
import {mkdtemp,realpath,chmod,rm,access} from 'node:fs/promises'
import {join,resolve,dirname,basename} from 'node:path'
import {sourceRepository} from './publisher.mjs'

// No token is accepted by this factory. No filesystem or process operation is
// performed until an explicitly manual Linux CI driver creates a session.
export async function createDockerPublishSession({imageConfigDigest,actor,env=process.env}){
 if(process.platform!=='linux'||env.CI!=='true'||env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_REPOSITORY!==sourceRepository||!/^[0-9]+$/.test(env.GITHUB_RUN_ID??'')||typeof env.RUNNER_TEMP!=='string'||!env.RUNNER_TEMP.startsWith('/')||typeof actor!=='string'||!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(actor)||typeof imageConfigDigest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(imageConfigDigest))throw Error('STAGING_MANUAL_CI_SESSION_REQUIRED')
 const parent=await realpath(env.RUNNER_TEMP),folder=await mkdtemp(join(parent,'crm-ghcr-auth-'))
 const owned=()=>dirname(resolve(folder))===parent&&basename(folder).startsWith('crm-ghcr-auth-')
 const childEnv=Object.fromEntries(['PATH','HOME'].filter(k=>env[k]).map(k=>[k,env[k]]));childEnv.DOCKER_CONFIG=folder
 function command(args,input){const r=spawnSync('docker',args,{env:childEnv,encoding:'utf8',timeout:120000,maxBuffer:1024*1024,input});if(r.status!==0)throw Error('STAGING_DOCKER_COMMAND_FAILED');return r.stdout.trim()}
 async function removeConfig(){if(!owned())throw Error('STAGING_AUTH_DIRECTORY_NOT_OWNED');await rm(folder,{recursive:true,force:false});let remaining=false;try{await access(folder);remaining=true}catch(error){if(error?.code!=='ENOENT')throw Error('STAGING_AUTH_REMOVAL_NOT_PROVEN')}if(remaining)throw Error('STAGING_AUTH_DIRECTORY_REMAINS')}
 try{await chmod(folder,0o700)}catch{await removeConfig();throw Error('STAGING_AUTH_DIRECTORY_FAILED')}
 return dockerSessionActions({imageConfigDigest,actor,command,removeConfig})
}
// Pure command/cleanup protocol for failure injection. The live factory above
// owns and verifies the ephemeral path; this function grants no CI authority.
export function dockerSessionActions({imageConfigDigest,actor,command,removeConfig}){
 let cleaned=false
 return{
  async login(token){if(cleaned||typeof token!=='string'||token.length<16||/[\r\n\0]/.test(token))throw Error('STAGING_DOCKER_AUTH_INVALID');command(['login','ghcr.io','--username',actor,'--password-stdin'],token+'\n')},
  async push(reference){
   if(cleaned||typeof reference!=='string'||!/^ghcr\.io\/asier-comba\/crm-telecom-staging:sha-[a-f0-9]{40}-config-[a-f0-9]{64}$/.test(reference))throw Error('STAGING_DOCKER_REFERENCE_INVALID')
   if(command(['image','inspect','crm-w5-package:test','--format','{{.Id}}'])!==imageConfigDigest)throw Error('STAGING_DOCKER_LOCAL_IMAGE_CHANGED')
   command(['image','tag','crm-w5-package:test',reference]);command(['push',reference])
  },
  async cleanup(){
   if(cleaned)return
   let logoutFailed=false;try{command(['logout','ghcr.io'])}catch{logoutFailed=true}
   await removeConfig();cleaned=true
   if(logoutFailed)throw Error('STAGING_DOCKER_LOGOUT_FAILED')
  }
 }
}
