import {spawnSync} from 'node:child_process'
import {mkdtemp,realpath,chmod,rm,access,readFile} from 'node:fs/promises'
import {join,resolve,dirname,basename,isAbsolute} from 'node:path'
import {imageRepository} from './contract.mjs'
import {sourceRepository} from './publisher.mjs'

// Fixed destinations only. The lab repository is an ephemeral registry on the
// runner loopback and never receives credentials.
export const labRepository='127.0.0.1:5055/crm-telecom-staging'
const references={[imageRepository]:/^ghcr\.io\/asier-comba\/crm-telecom-staging:sha-[a-f0-9]{40}-config-[a-f0-9]{64}$/,[labRepository]:/^127\.0\.0\.1:5055\/crm-telecom-staging:sha-[a-f0-9]{40}-config-[a-f0-9]{64}$/}
const isDigest=value=>typeof value==='string'&&/^sha256:[a-f0-9]{64}$/.test(value)

/** Digest-preserving push of an already verified OCI layout (verifyOciLayoutV1).
 * Same session shape as dockerSessionActions so publishVerifiedImage is reused
 * unchanged. Unlike `docker push`, the registry manifest is the layout manifest.
 * Pure protocol: command/removeConfig/readIndex are injected for failure tests.
 */
export function craneSessionActions({repository,layoutRoot,manifestDigest,command,removeConfig,readIndex}){
 if(!Object.hasOwn(references,repository)||typeof layoutRoot!=='string'||!isAbsolute(layoutRoot)||!isDigest(manifestDigest))throw Error('STAGING_CRANE_SESSION_INVALID')
 // closed stops reuse even when removal fails; cleaned makes cleanup idempotent.
 let closed=false,cleaned=false,loggedIn=false
 return{
  async login(token){
   if(closed||repository!==imageRepository||typeof token!=='string'||token.length<16||/[\r\n\0]/.test(token))throw Error('STAGING_CRANE_AUTH_INVALID')
   loggedIn=true;command(['auth','login','ghcr.io','--username','x-access-token','--password-stdin'],token)
  },
  async push(reference){
   if(closed||typeof reference!=='string'||!references[repository].test(reference))throw Error('STAGING_CRANE_REFERENCE_INVALID')
   // The layout must still name the verified manifest immediately before upload.
   const index=JSON.parse(await readIndex(layoutRoot))
   if(index?.manifests?.length!==1||index.manifests[0]?.digest!==manifestDigest)throw Error('STAGING_CRANE_LAYOUT_CHANGED')
   const pushed=command(['push',layoutRoot,reference])
   if(pushed!==repository+'@'+manifestDigest)throw Error('STAGING_CRANE_PUSHED_DIGEST_MISMATCH')
  },
  async cleanup(){
   if(cleaned)return
   closed=true
   let logoutFailed=false
   if(loggedIn){try{command(['auth','logout','ghcr.io'])}catch{logoutFailed=true}}
   await removeConfig();cleaned=true
   if(logoutFailed)throw Error('STAGING_CRANE_LOGOUT_FAILED')
  }
 }
}

// Manual protected Linux CI only for GHCR; pull_request lab only for loopback.
// Credentials live in an owned 0700 DOCKER_CONFIG and are passed through stdin.
export async function createCraneSession({repository,layoutRoot,manifestDigest,crane,env=process.env}){
 const ghcr=repository===imageRepository
 const allowed=process.platform==='linux'&&env.CI==='true'&&env.GITHUB_ACTIONS==='true'&&env.GITHUB_REPOSITORY===sourceRepository&&env.RUNNER_ENVIRONMENT==='github-hosted'&&(ghcr?env.GITHUB_EVENT_NAME==='workflow_dispatch':repository===labRepository&&env.GITHUB_EVENT_NAME==='pull_request')
 if(!allowed||typeof env.RUNNER_TEMP!=='string'||!env.RUNNER_TEMP.startsWith('/')||typeof crane!=='string'||!isAbsolute(crane))throw Error('STAGING_MANUAL_CI_SESSION_REQUIRED')
 const parent=await realpath(env.RUNNER_TEMP),folder=await mkdtemp(join(parent,'crm-crane-auth-'))
 const owned=()=>dirname(resolve(folder))===parent&&basename(folder).startsWith('crm-crane-auth-')
 const childEnv={PATH:env.PATH??'/usr/bin:/bin',HOME:folder,DOCKER_CONFIG:folder}
 function command(args,input){const r=spawnSync(crane,args,{env:childEnv,encoding:'utf8',timeout:20*60*1000,maxBuffer:1024*1024,input,shell:false});if(r.status!==0)throw Error('STAGING_CRANE_COMMAND_FAILED');return r.stdout.trim()}
 async function removeConfig(){if(!owned())throw Error('STAGING_AUTH_DIRECTORY_NOT_OWNED');await rm(folder,{recursive:true,force:false});try{await access(folder)}catch(error){if(error?.code==='ENOENT')return;throw Error('STAGING_AUTH_REMOVAL_NOT_PROVEN')}throw Error('STAGING_AUTH_DIRECTORY_REMAINS')}
 try{await chmod(folder,0o700)}catch{await removeConfig();throw Error('STAGING_AUTH_DIRECTORY_FAILED')}
 return craneSessionActions({repository,layoutRoot,manifestDigest,command,removeConfig,readIndex:root=>readFile(join(root,'index.json'),'utf8')})
}
