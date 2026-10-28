import {imageRepository} from './contract.mjs'
import {privatePackageBound,sourceRepository} from './publisher.mjs'

// Preparation only. No CLI, network, credential or filesystem port is supplied here.
// The seed is an existing public base, never CRM code and never a candidate receipt.
export const bootstrapSeedV1=Object.freeze({reference:'docker.io/library/node:24.21.0-trixie-slim@sha256:c83040f7e24bacea68e58a0b96a484ba430bf24abb2973eab7ba4701144b7b63',manifest_digest:'sha256:c83040f7e24bacea68e58a0b96a484ba430bf24abb2973eab7ba4701144b7b63'})
const digest=value=>typeof value==='string'&&/^sha256:[a-f0-9]{64}$/.test(value)
const manual=env=>env?.GITHUB_ACTIONS==='true'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_REPOSITORY===sourceRepository&&env.RUNNER_ENVIRONMENT==='github-hosted'&&env.RUNNER_OS==='Linux'

/** Trusted ports must authenticate namespace absence and verify the complete seed
 * copy by digest. Anonymous denial must include the registry token challenge;
 * an initial 401 alone proves nothing. A 404, JSON flag or label is NOT approval.
 * Existing candidate push rejects bootstrap tags: a separately reviewed bootstrap
 * transport is still required; do not relax dockerSessionActions/publisher.
 */
export async function bootstrapPrivatePackageV1({reviewedSource,env,token,ports}={}){
 const result={version:'staging.package.bootstrap.v1',result:'FAIL',publication:'NOT_ATTEMPTED',receipt:null,candidate:false,publishing_authorized:false,deploying_authorized:false,credential_cleanup:'NOT_CREATED',error:null}
 let session
 try{
  if(!manual(env)||typeof reviewedSource!=='string'||!/^[a-f0-9]{40}$/.test(reviewedSource)||typeof token!=='string'||token.length<16||/[\r\n\0]/.test(token))throw Error('BOOTSTRAP_INPUT_INVALID')
  for(const name of ['authorizeBootstrap','assertNamespaceAbsent','verifySeed','createSession','verifyCopiedSeed','readPackage','verifyAnonymousPullDenied'])if(typeof ports?.[name]!=='function')throw Error('BOOTSTRAP_TRUSTED_PORTS_REQUIRED')
  if(await ports.authorizeBootstrap({source:reviewedSource,repository:imageRepository,seed:bootstrapSeedV1})!==true)throw Error('BOOTSTRAP_NOT_AUTHORIZED')
  // Must establish owner-authorized, complete absence; never infer it from 404.
  if(await ports.assertNamespaceAbsent(imageRepository)!==true)throw Error('BOOTSTRAP_NAMESPACE_ABSENCE_UNPROVEN')
  const seed=await ports.verifySeed(bootstrapSeedV1)
  if(seed?.reference!==bootstrapSeedV1.reference||seed.manifest_digest!==bootstrapSeedV1.manifest_digest||!digest(seed.image_config_digest)||seed.image_config_digest===seed.manifest_digest)throw Error('BOOTSTRAP_SEED_UNVERIFIED')
  const reference=imageRepository+':bootstrap-'+reviewedSource
  session=await ports.createSession()
  if(!session||['login','copySeed','cleanup'].some(name=>typeof session[name]!=='function'))throw Error('BOOTSTRAP_SESSION_INVALID')
  await session.login(token)
  result.publication='OUTCOME_UNKNOWN'
  await session.copySeed({source:bootstrapSeedV1.reference,destination:reference,imageConfigDigest:seed.image_config_digest})
  result.publication='PUSH_SUCCEEDED_NOT_YET_VERIFIED'
  const copy=await ports.verifyCopiedSeed(reference)
  if(copy?.reference!==reference||copy.manifest_digest!==seed.manifest_digest||copy.image_config_digest!==seed.image_config_digest)throw Error('BOOTSTRAP_COPY_MISMATCH')
  if(!privatePackageBound(await ports.readPackage()))throw Error('BOOTSTRAP_PRIVATE_BINDING_REQUIRED')
  if(await ports.verifyAnonymousPullDenied(imageRepository+'@'+copy.manifest_digest)!==true)throw Error('BOOTSTRAP_ANONYMOUS_ACCESS_UNPROVEN')
  result.result='PASS';result.publication='VERIFIED_PRIVATE_BOOTSTRAP';result.seed_manifest_digest=copy.manifest_digest
 }catch(error){
  const allowed=new Set(['BOOTSTRAP_INPUT_INVALID','BOOTSTRAP_TRUSTED_PORTS_REQUIRED','BOOTSTRAP_NOT_AUTHORIZED','BOOTSTRAP_NAMESPACE_ABSENCE_UNPROVEN','BOOTSTRAP_SEED_UNVERIFIED','BOOTSTRAP_SESSION_INVALID','BOOTSTRAP_COPY_MISMATCH','BOOTSTRAP_PRIVATE_BINDING_REQUIRED','BOOTSTRAP_ANONYMOUS_ACCESS_UNPROVEN'])
  result.error=allowed.has(error?.message)?error.message:'BOOTSTRAP_SAFE_FAILURE'
 }finally{
  if(session){try{await session.cleanup();result.credential_cleanup='PASS'}catch{result.credential_cleanup='FAIL';result.result='FAIL';result.error='BOOTSTRAP_CREDENTIAL_CLEANUP_FAILED'}}
 }
 return result
}
