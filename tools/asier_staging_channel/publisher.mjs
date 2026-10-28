import {imageTag,imageRepository,validateReceipt} from './contract.mjs'
import {registryImageEvidence} from './oci-evidence.mjs'

export const sourceRepository='Asier-Comba/CRM-Telecomunicaciones'
export function privatePackageBound(value){return value?.name==='crm-telecom-staging'&&value.package_type==='container'&&value.visibility==='private'&&value.repository?.full_name===sourceRepository}
function buildBound(expected,imageConfigDigest,scan){
 if(!expected||!Object.entries(expected).every(([k,v])=>['source','tree','lockfile_sha256','dockerfile_sha256','public_build_sha256'].includes(k)&&typeof v==='string'&&(k==='source'||k==='tree'?/^[a-f0-9]{40}$/:/^[a-f0-9]{64}$/).test(v))||Object.keys(expected).length!==5||typeof imageConfigDigest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(imageConfigDigest))return false
 return scan?.result==='PASS'&&scan.source_sha===expected.source&&scan.image===imageConfigDigest&&scan.secret_findings===0&&Array.isArray(scan.high_critical)&&scan.high_critical.length===0
}
// Capability-injected publisher, never called by a PR or imported for effects.
// The trusted, independently reviewed driver must supply actual build/scan
// evidence and protected promotion authority; JSON/labels grant neither.
export async function publishVerifiedImage({expected,imageConfigDigest,scan,token,ports}){
 const result={result:'FAIL',phase:'input',publication:'NOT_ATTEMPTED',receipt:null,source_authenticity:'NOT_PROVEN_BY_LABELS',layers:'NOT_READ',hosted:'NOT_RUN',deploying_authorized:false}
 const reject=code=>{result.error=code;throw Error('STAGING_INTERNAL_REJECTION')}
 let session
 try{
  if(!buildBound(expected,imageConfigDigest,scan)||typeof token!=='string'||token.length<16)reject('STAGING_PUBLISH_INPUT_INVALID')
  const tag=imageTag(expected.source,expected.public_build_sha256)
  result.phase='private_package_before';if(!privatePackageBound(await ports.readPackage()))reject('STAGING_PRIVATE_PACKAGE_REQUIRED')
  result.phase='immutable_tag_preflight';if(await ports.readTag(tag)!==null)reject('STAGING_IMMUTABLE_TAG_EXISTS')
  result.phase='credentials';session=await ports.createSession()
  // Session creation must return cleanup BEFORE login can write credentials.
  if(!session||typeof session.cleanup!=='function'||typeof session.login!=='function'||typeof session.push!=='function')reject('STAGING_AUTH_SESSION_INVALID')
  await session.login(token)
  result.phase='push';result.publication='OUTCOME_UNKNOWN';await session.push(tag);result.publication='PUSH_SUCCEEDED_NOT_YET_VERIFIED'
  result.phase='manifest_config_readback';const raw=await ports.readImage(tag),proof=registryImageEvidence({...raw,expected})
  if(proof.image_config_digest!==imageConfigDigest)reject('STAGING_PUSHED_CONFIG_MISMATCH')
  result.phase='private_package_after';if(!privatePackageBound(await ports.readPackage()))reject('STAGING_PRIVATE_PACKAGE_CHANGED')
  result.receipt=validateReceipt({version:'staging.image.receipt.v1',...expected,image_config_digest:proof.image_config_digest,manifest_digest:proof.manifest_digest,image_reference:imageRepository+'@'+proof.manifest_digest,visibility:'private'},expected)
  result.publication='VERIFIED_PRIVATE_DIGEST';result.result='PASS';result.phase='completed'
 }catch{result.error??='STAGING_PUBLISH_SAFE_FAILURE'}
 finally{
  if(session){try{await session.cleanup();result.credential_cleanup='PASS'}catch{result.credential_cleanup='FAIL';result.result='FAIL';result.error='STAGING_CREDENTIAL_CLEANUP_FAILED'}}else result.credential_cleanup='NOT_CREATED'
 }
 // Never delete a remotely published version after uncertain/failed readback.
 // Report that partial outcome; deployment authority always remains false.
 return result
}
