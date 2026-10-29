import {createHash} from 'node:crypto'
import {imageRepository} from './contract.mjs'
import {sourceRepository} from './publisher.mjs'
import {bootstrapSeedV1} from './bootstrap-private-package.mjs'
import {anonymousProbeV1,privacyResultV1} from './candidate-verifiers.mjs'

const packageApi='https://api.github.com/users/Asier-Comba/packages/container/crm-telecom-staging'
const registryPath='asier-comba/crm-telecom-staging'
const sha=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex')
const isDigest=value=>typeof value==='string'&&/^sha256:[a-f0-9]{64}$/.test(value)

/** Real ports for bootstrapPrivatePackageV1 (preparation; no workflow wires it).
 * `crane(args,{input})` runs the pinned crane with an owned DOCKER_CONFIG that
 * `openAuth`/`closeAuth` create and remove; only the session ever logs in.
 * The seed is copied digest-preserving (`crane copy`), so the bootstrap tag holds
 * the pinned public base, never CRM code and never a candidate receipt.
 */
export function bootstrapPortsV1({reviewedSource,approvedSource,token,actor,crane,openAuth,closeAuth,fetchImpl=fetch}){
 if(!/^[a-f0-9]{40}$/.test(reviewedSource??'')||typeof token!=='string'||token.length<16||!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(actor??'')||[crane,openAuth,closeAuth].some(f=>typeof f!=='function'))throw Error('BOOTSTRAP_TRANSPORT_INPUT_INVALID')
 const request=(url,options={})=>fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(10000)})
 const reference=imageRepository+':bootstrap-'+reviewedSource
 let session=null
 const readPackage=async()=>{
  const response=await request(packageApi,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}})
  if(response.status!==200){await response.body?.cancel();throw Error('BOOTSTRAP_PRIVATE_BINDING_REQUIRED')}
  return response.json()
 }
 const inspect=(ref,auth)=>{const manifestDigest=crane(['digest','--platform','linux/amd64',ref],{auth});const config=crane(['config','--platform','linux/amd64',ref],{auth});return {manifest_digest:manifestDigest,image_config_digest:sha(Buffer.from(config,'utf8'))}}
 return{
  // Separate owner key from the candidate one: a bootstrap approval cannot publish code.
  authorizeBootstrap:async request=>approvedSource===reviewedSource&&request?.source===reviewedSource&&request.repository===imageRepository&&request.seed===bootstrapSeedV1,
  async assertNamespaceAbsent(repository){
   if(repository!==imageRepository)return false
   // Both authenticated views must say "absent"; 403/unknown never counts.
   const api=await request(packageApi,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}})
   await api.body?.cancel()
   if(api.status!==404)return false
   const auth=await request('https://ghcr.io/token?service=ghcr.io&scope='+encodeURIComponent('repository:'+registryPath+':pull'),{headers:{Authorization:'Basic '+Buffer.from(actor+':'+token).toString('base64')}})
   if(auth.status!==200){await auth.body?.cancel();return false}
   const registryToken=(await auth.json())?.token
   if(typeof registryToken!=='string'||!registryToken)return false
   const tags=await request('https://ghcr.io/v2/'+registryPath+'/tags/list',{headers:{Authorization:'Bearer '+registryToken}})
   await tags.body?.cancel()
   return tags.status===404
  },
  async verifySeed(seed){
   if(seed!==bootstrapSeedV1)throw Error('BOOTSTRAP_SEED_UNVERIFIED')
   const observed=inspect(seed.reference,false)
   if(observed.manifest_digest!==seed.manifest_digest||!isDigest(observed.image_config_digest))throw Error('BOOTSTRAP_SEED_UNVERIFIED')
   return {reference:seed.reference,...observed}
  },
  async createSession(){
   if(session)throw Error('BOOTSTRAP_SESSION_INVALID')
   await openAuth();session={closed:false}
   const own=session
   return{
    async login(value){if(own.closed||value!==token)throw Error('BOOTSTRAP_SESSION_INVALID');crane(['auth','login','ghcr.io','--username',actor,'--password-stdin'],{auth:true,input:value})},
    async copySeed({source,destination,imageConfigDigest}){
     if(own.closed||source!==bootstrapSeedV1.reference||destination!==reference||!isDigest(imageConfigDigest))throw Error('BOOTSTRAP_SESSION_INVALID')
     crane(['copy','--platform','linux/amd64',source,destination],{auth:true})
    },
    async cleanup(){
     if(own.closed)return
     own.closed=true
     let logoutFailed=false;try{crane(['auth','logout','ghcr.io'],{auth:true})}catch{logoutFailed=true}
     await closeAuth()
     if(logoutFailed)throw Error('BOOTSTRAP_LOGOUT_FAILED')
    }
   }
  },
  async verifyCopiedSeed(destination){
   if(!session||session.closed||destination!==reference)throw Error('BOOTSTRAP_COPY_MISMATCH')
   return {reference:destination,...inspect(destination,true)}
  },
  readPackage,
  async verifyAnonymousPullDenied(digestReference){
   if(typeof digestReference!=='string'||!digestReference.startsWith(imageRepository+'@'))return false
   const digest=digestReference.slice(imageRepository.length+1)
   const pkg=await readPackage()
   try{privacyResultV1({packageVisibility:pkg?.repository?.full_name===sourceRepository?pkg.visibility:null,authenticatedManifestStatus:200,...await anonymousProbeV1(digest,fetchImpl)});return true}catch{return false}
  }
 }
}
