import {imageRepository} from './contract.mjs'
const packageApi='https://api.github.com/users/Asier-Comba/packages/container/crm-telecom-staging'
const registryPath='asier-comba/crm-telecom-staging',accepted='application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json'
async function boundedBytes(response){
 if(!response.body)throw Error('STAGING_REGISTRY_EMPTY_RESPONSE')
 const reader=response.body.getReader(),chunks=[];let length=0
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>1024*1024)throw Error('STAGING_REGISTRY_RESPONSE_TOO_LARGE');chunks.push(Buffer.from(value))}return Buffer.concat(chunks)}finally{await reader.cancel().catch(()=>{})}
}
function parse(bytes){try{return JSON.parse(bytes.toString('utf8'))}catch{throw Error('STAGING_REGISTRY_INVALID_JSON')}}
export function createGhcrReadTransport({token,actor,fetchImpl=fetch}){
 if(typeof token!=='string'||token.length<16||typeof actor!=='string'||!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(actor))throw Error('STAGING_REGISTRY_AUTH_INVALID')
 let registryToken
 const request=(url,options={})=>fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(10000)})
 async function auth(){
  if(!registryToken){const response=await request('https://ghcr.io/token?service=ghcr.io&scope='+encodeURIComponent('repository:'+registryPath+':pull'),{headers:{Authorization:'Basic '+Buffer.from(actor+':'+token).toString('base64')}});if(response.status!==200)throw Error('STAGING_REGISTRY_AUTH_FAILED');const data=parse(await boundedBytes(response));if(typeof data.token!=='string'||data.token.length<16||data.token.length>8192||!/^[A-Za-z0-9._~-]+$/.test(data.token))throw Error('STAGING_REGISTRY_AUTH_FAILED');registryToken=data.token}
  return{Authorization:'Bearer '+registryToken,Accept:accepted}
 }
 function tagPath(reference){if(typeof reference!=='string'||!reference.startsWith(imageRepository+':')||!/^sha-[a-f0-9]{40}-config-[a-f0-9]{64}$/.test(reference.slice(imageRepository.length+1)))throw Error('STAGING_REGISTRY_REFERENCE_INVALID');return'https://ghcr.io/v2/'+registryPath+'/manifests/'+reference.slice(imageRepository.length+1)}
 return{
  async readPackage(){const response=await request(packageApi,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});if(response.status!==200)throw Error('STAGING_PRIVATE_PACKAGE_UNAVAILABLE');return parse(await boundedBytes(response))},
  async readTag(reference){const response=await request(tagPath(reference),{method:'HEAD',headers:await auth()});if(response.status===404)return null;if(response.status!==200)throw Error('STAGING_REGISTRY_TAG_UNKNOWN');const value=response.headers.get('docker-content-digest');if(typeof value!=='string'||!/^sha256:[a-f0-9]{64}$/.test(value))throw Error('STAGING_REGISTRY_DIGEST_MISSING');return value},
  async readImage(reference){
   const response=await request(tagPath(reference),{headers:await auth()});if(response.status!==200)throw Error('STAGING_REGISTRY_MANIFEST_UNAVAILABLE')
   const requestedDigest=response.headers.get('docker-content-digest'),manifestBytes=await boundedBytes(response),manifest=parse(manifestBytes),configDigest=manifest?.config?.digest
   if(typeof configDigest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(configDigest))throw Error('STAGING_REGISTRY_CONFIG_REFERENCE_INVALID')
   // Blob redirects may use GitHub's signed download CDN. Never forward the
   // registry Authorization header to that host, or follow an arbitrary URL.
   let blob=await fetchImpl('https://ghcr.io/v2/'+registryPath+'/blobs/'+configDigest,{headers:await auth(),redirect:'manual',signal:AbortSignal.timeout(10000)})
   if([302,307].includes(blob.status)){let target;try{target=new URL(blob.headers.get('location'))}catch{throw Error('STAGING_REGISTRY_REDIRECT_INVALID')}if(target.protocol!=='https:'||target.hostname!=='pkg-containers.githubusercontent.com'||target.username||target.password||target.port||target.hash)throw Error('STAGING_REGISTRY_REDIRECT_INVALID');blob=await request(target.href)}
   if(blob.status!==200)throw Error('STAGING_REGISTRY_CONFIG_UNAVAILABLE')
   return{requestedDigest,manifestBytes,configBytes:await boundedBytes(blob)}
  }
 }
}
