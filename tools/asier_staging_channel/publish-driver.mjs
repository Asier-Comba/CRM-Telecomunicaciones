import {digest,publicBuildIdentity} from './contract.mjs'
import {registryImageEvidence} from './oci-evidence.mjs'
import {publishVerifiedImage,sourceRepository} from './publisher.mjs'

const fields=['source','tree','lockfile_sha256','dockerfile_sha256','public_build_sha256']
const exact=(value,names)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...names].sort().join(',')
const bytes=value=>Buffer.isBuffer(value)&&value.length>0&&value.length<=1024*1024
const manual=env=>env?.GITHUB_ACTIONS==='true'&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_REPOSITORY===sourceRepository&&env.RUNNER_ENVIRONMENT==='github-hosted'&&env.RUNNER_OS==='Linux'

/** The verifier capability MUST verify actual scanner output and cryptographic
 * provenance from the reviewed workflow, including completeness of layer scans.
 * This adapter verifies raw OCI/hash bindings independently. It has no verifier,
 * token provider, build command, deployment port, or live driver by default.
 */
export async function verifyCandidateEvidenceV1({expected,source,evidence,verifyEvidence}={}){
 if(!exact(expected,fields)||fields.some(name=>typeof expected[name]!=='string'||!(name==='source'||name==='tree'?/^[a-f0-9]{40}$/:/^[a-f0-9]{64}$/).test(expected[name])))throw Error('CANDIDATE_EXPECTED_INVALID')
 if(source?.source!==expected.source||source.tree!==expected.tree||!bytes(source.lockfileBytes)||!bytes(source.dockerfileBytes)||digest(source.lockfileBytes)!==expected.lockfile_sha256||digest(source.dockerfileBytes)!==expected.dockerfile_sha256||publicBuildIdentity(source.publicValues)!==expected.public_build_sha256)throw Error('CANDIDATE_SOURCE_BINDING_INVALID')
 const image=registryImageEvidence({...evidence?.image,expected})
 if(!bytes(evidence.scanBytes)||!bytes(evidence.provenanceBytes)||typeof verifyEvidence!=='function')throw Error('CANDIDATE_VERIFIER_REQUIRED')
 let scan
 try{scan=JSON.parse(evidence.scanBytes.toString('utf8'))}catch{throw Error('CANDIDATE_SCAN_INVALID')}
 if(scan?.result!=='PASS'||scan.source_sha!==expected.source||scan.image!==image.image_config_digest||scan.secret_findings!==0||!Array.isArray(scan.high_critical)||scan.high_critical.length)throw Error('CANDIDATE_SCAN_INVALID')
 const subjects={...expected,image_config_digest:image.image_config_digest,manifest_digest:image.manifest_digest,scan_sha256:digest(evidence.scanBytes),provenance_sha256:digest(evidence.provenanceBytes)}
 const verified=await verifyEvidence({subjects:Object.freeze({...subjects}),image:evidence.image,scanBytes:evidence.scanBytes,provenanceBytes:evidence.provenanceBytes})
 if(!exact(verified,Object.keys(subjects))||Object.keys(subjects).some(name=>verified[name]!==subjects[name]))throw Error('CANDIDATE_EVIDENCE_UNVERIFIED')
 return Object.freeze({image,scan,subjects:Object.freeze(subjects)})
}

export async function publishCandidateV1({expected,env,token,ports}={}){
 const result={version:'staging.candidate.publication.v1',result:'FAIL',publication:'NOT_ATTEMPTED',receipt:null,evidence_verification:'NOT_VERIFIED',publishing_authorized:false,deploying_authorized:false,error:null}
 try{
  // Snapshot caller-owned records before any asynchronous capability can run.
  expected=Object.freeze({...expected});env=Object.freeze({...env})
  if(!manual(env)||typeof token!=='string'||token.length<16||/[\r\n\0]/.test(token))throw Error('CANDIDATE_MANUAL_DRIVER_REQUIRED')
  for(const name of ['authorizePublication','readSource','readEvidence','verifyEvidence'])if(typeof ports?.[name]!=='function')throw Error('CANDIDATE_TRUSTED_PORTS_REQUIRED')
  if(await ports.authorizePublication(expected)!==true)throw Error('CANDIDATE_PUBLICATION_NOT_AUTHORIZED')
  const proof=await verifyCandidateEvidenceV1({expected,source:await ports.readSource(),evidence:await ports.readEvidence(),verifyEvidence:ports.verifyEvidence})
  result.evidence_verification='TRUSTED_PORT_VERIFIED'
  const published=await publishVerifiedImage({expected,imageConfigDigest:proof.image.image_config_digest,scan:proof.scan,token,ports:ports.publisher})
  result.result=published.result;result.publication=published.publication;result.credential_cleanup=published.credential_cleanup;result.error=published.error??null
  // Preserve the partial outcome, but do not export a consumable receipt after failure.
  result.receipt=published.result==='PASS'&&published.credential_cleanup==='PASS'?published.receipt:null
  // A shared config ID does not bind different manifest bytes to verified provenance.
  if(result.receipt&&result.receipt.manifest_digest!==proof.subjects.manifest_digest){
   result.published_manifest_digest=result.receipt.manifest_digest
   result.result='FAIL';result.receipt=null;result.error='CANDIDATE_PUBLISHED_MANIFEST_MISMATCH'
  }
  result.evidence={...proof.subjects}
 }catch(error){
  const allowed=new Set(['CANDIDATE_MANUAL_DRIVER_REQUIRED','CANDIDATE_TRUSTED_PORTS_REQUIRED','CANDIDATE_PUBLICATION_NOT_AUTHORIZED','CANDIDATE_EXPECTED_INVALID','CANDIDATE_SOURCE_BINDING_INVALID','CANDIDATE_VERIFIER_REQUIRED','CANDIDATE_SCAN_INVALID','CANDIDATE_EVIDENCE_UNVERIFIED'])
  result.error=allowed.has(error?.message)?error.message:'CANDIDATE_SAFE_FAILURE'
 }
 return result
}
