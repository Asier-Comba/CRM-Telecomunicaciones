import {createHash} from 'node:crypto'
import {publicBuildSha256} from '../../scripts/platform/build-binding.mjs'
import {reviewedStagingPolicy} from '../../scripts/platform/runtime-admission.mjs'

export const destination=Object.freeze({project:'crm-inmobiliario',service:'crm-telecom-staging',port:3000})
export const imageRepository='ghcr.io/asier-comba/crm-telecom-staging'
const sha=/^[a-f0-9]{40}$/,hash=/^[a-f0-9]{64}$/
const matches=(expression,value)=>typeof value==='string'&&expression.test(value)
const publicNames=['NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','NEXT_PUBLIC_SUPABASE_URL']
export const digest=value=>createHash('sha256').update(value).digest('hex')
const exact=(value,names)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...names].sort().join(',')
function httpsOrigin(value){try{const u=new URL(value);return u.protocol==='https:'&&u.origin===value&&!u.username&&!u.password&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname)}catch{return false}}
function publicKey(value){
 if(typeof value!=='string'||value.length>4096)return false
 if(/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(value))return true
 try{const parts=value.split('.');return parts.length===3&&parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p))&&JSON.parse(Buffer.from(parts[1],'base64url')).role==='anon'}catch{return false}
}
export function publicBuildIdentity(values){
 if(!exact(values,publicNames)||!httpsOrigin(values.NEXT_PUBLIC_APP_URL)||!httpsOrigin(values.NEXT_PUBLIC_SUPABASE_URL)||!publicKey(values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY))throw Error('STAGING_PUBLIC_BINDINGS_INVALID')
 // Only the fingerprint is reported. No public key, origin or credentials in logs.
 return publicBuildSha256(values)
}
export function imageTag(source,configuration){
 if(!matches(sha,source)||!matches(hash,configuration))throw Error('STAGING_IDENTITY_INVALID')
 return `${imageRepository}:sha-${source}-config-${configuration}`
}
export function validateReceipt(receipt,expected){
 if(!exact(receipt,['version','source','tree','lockfile_sha256','dockerfile_sha256','public_build_sha256','image_config_digest','manifest_digest','image_reference','visibility']))throw Error('STAGING_RECEIPT_SHAPE_INVALID')
 if(receipt.version!=='staging.image.receipt.v1'||!matches(sha,receipt.source)||!matches(sha,receipt.tree)||!['lockfile_sha256','dockerfile_sha256','public_build_sha256'].every(k=>matches(hash,receipt[k]))||!['image_config_digest','manifest_digest'].every(k=>matches(/^sha256:[a-f0-9]{64}$/,receipt[k]))||receipt.visibility!=='private')throw Error('STAGING_RECEIPT_IDENTITY_INVALID')
 if(receipt.image_reference!==imageRepository+'@'+receipt.manifest_digest||receipt.image_config_digest===receipt.manifest_digest)throw Error('STAGING_MANIFEST_REFERENCE_REQUIRED')
 if(!expected||!['source','tree','lockfile_sha256','dockerfile_sha256','public_build_sha256'].every(k=>receipt[k]===expected[k]))throw Error('STAGING_RECEIPT_BINDING_MISMATCH')
 return Object.freeze({...receipt})
}
export function channelReadiness({runtimePolicy,originAccepted=false,publicBindingAccepted=false,networkAccepted=false,privateAccessAccepted=false,schemaAccepted=false,independentReleaseAccepted=false}={}){
 const blockers=[]
 if(!httpsOrigin(runtimePolicy?.origin)||!reviewedStagingPolicy(runtimePolicy,runtimePolicy?.origin))blockers.push('HOSTED_RUNTIME_NOT_ACCEPTED')
 for(const [name,ok]of Object.entries({ORIGIN:originAccepted,PUBLIC_BUILD_RUNTIME_BINDING:publicBindingAccepted,HOSTED_NETWORK:networkAccepted,PRIVATE_ACCESS:privateAccessAccepted,EXACT_SCHEMA:schemaAccepted,INDEPENDENT_RELEASE:independentReleaseAccepted}))if(ok!==true)blockers.push(name+'_NOT_ACCEPTED')
 // This is a readiness report, never deployment authority. The existing
 // platform promotion gate and protected environment remain mandatory.
 return {status:blockers.length?'BLOCKED':'REQUIRES_EXISTING_PROMOTION_GATE',blockers,mutation_performed:false,publishing_authorized:false,deploying_authorized:false}
}
