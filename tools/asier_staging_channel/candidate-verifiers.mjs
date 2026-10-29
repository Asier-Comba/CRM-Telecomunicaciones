import {spawnSync} from 'node:child_process'
import {isAbsolute} from 'node:path'
import {imageRepository} from './contract.mjs'
import {sourceRepository} from './publisher.mjs'

export const publishWorkflowPath='.github/workflows/staging-image-publish.yml'
const signerWorkflow=sourceRepository+'/'+publishWorkflowPath
const hex=(value,length)=>typeof value==='string'&&new RegExp(`^[a-f0-9]{${length}}$`).test(value)

/** Checks `gh attestation verify --format json` output after gh has verified the
 * Sigstore signature, certificate identity and transparency log. Every field is
 * re-checked here so a permissive flag or gh change cannot widen acceptance.
 * Binding: subject = registry repository + manifest digest; signer = this
 * repository's publish workflow on a hosted runner; source = the exact commit.
 */
export function provenanceResultV1(results,subjects){
 if(!Array.isArray(results)||results.length!==1)throw Error('PROVENANCE_RESULT_COUNT_INVALID')
 const statement=results[0]?.verificationResult?.statement,certificate=results[0]?.verificationResult?.signature?.certificate
 if(statement?._type!=='https://in-toto.io/Statement/v1'||statement.predicateType!=='https://slsa.dev/provenance/v1')throw Error('PROVENANCE_PREDICATE_INVALID')
 const subject=Array.isArray(statement.subject)&&statement.subject.length===1?statement.subject[0]:null
 if(subject?.name!==imageRepository||'sha256:'+subject.digest?.sha256!==subjects.manifest_digest||Object.keys(subject.digest??{}).length!==1)throw Error('PROVENANCE_SUBJECT_MISMATCH')
 if(certificate?.issuer!=='https://token.actions.githubusercontent.com'||certificate.runnerEnvironment!=='github-hosted'||certificate.githubWorkflowRepository!==sourceRepository||certificate.sourceRepositoryURI!=='https://github.com/'+sourceRepository)throw Error('PROVENANCE_SIGNER_INVALID')
 if(typeof certificate.buildSignerURI!=='string'||!certificate.buildSignerURI.startsWith('https://github.com/'+signerWorkflow+'@')||certificate.buildTrigger!=='workflow_dispatch')throw Error('PROVENANCE_SIGNER_INVALID')
 // The workflow run's commit is the built source: dispatch must run at that SHA.
 if(!hex(subjects.source,40)||certificate.sourceRepositoryDigest!==subjects.source||certificate.githubWorkflowSHA!==subjects.source)throw Error('PROVENANCE_SOURCE_MISMATCH')
 return Object.freeze({result:'PASS',subject:subjects.manifest_digest,source:subjects.source,signer:certificate.buildSignerURI})
}

// Stricter than the driver's shape check: pinned scanner, exact target and image.
export function scanResultV1(scan,subjects){
 if(scan?.result!=='PASS'||scan.scanner!=='trivy-0.75.0'||scan.target!=='app'||scan.requested_image!=='crm-w5-package:test'||scan.source_sha!==subjects.source||scan.image!==subjects.image_config_digest||scan.secret_findings!==0||!Array.isArray(scan.high_critical)||scan.high_critical.length!==0||scan.raw_results_retained!==false)throw Error('SCAN_RESULT_INVALID')
 return Object.freeze({result:'PASS',image:scan.image})
}

/** Observed 29/10 on GHCR: a public repository issues an anonymous pull token
 * (200) and serves manifests; a missing/private one answers 403. Absence and
 * privacy are indistinguishable anonymously, so denial counts only together
 * with an authenticated 200 for the same digest and package API visibility.
 */
export function privacyResultV1({packageVisibility,authenticatedManifestStatus,anonymousTokenStatus,anonymousManifestStatus}){
 if(packageVisibility!=='private')throw Error('GHCR_PACKAGE_NOT_PRIVATE')
 if(authenticatedManifestStatus!==200)throw Error('GHCR_AUTHENTICATED_DIGEST_UNREADABLE')
 const denied=[401,403].includes(anonymousTokenStatus)||anonymousTokenStatus===200&&[401,403,404].includes(anonymousManifestStatus)
 if(!denied)throw Error('GHCR_ANONYMOUS_ACCESS_NOT_DENIED')
 return Object.freeze({result:'PASS',visibility:'private',anonymous_pull:'DENIED'})
}

export async function anonymousProbeV1(manifestDigest,fetchImpl=fetch){
 if(typeof manifestDigest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(manifestDigest))throw Error('GHCR_PROBE_INPUT_INVALID')
 const request=(url,options={})=>fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(10000)})
 // Network failure throws: an unknown answer is never counted as denied.
 const token=await request('https://ghcr.io/token?service=ghcr.io&scope='+encodeURIComponent('repository:asier-comba/crm-telecom-staging:pull'))
 let anonymousManifestStatus=null
 if(token.status===200){
  const value=(await token.json())?.token
  const manifest=await request('https://ghcr.io/v2/asier-comba/crm-telecom-staging/manifests/'+manifestDigest,{method:'HEAD',headers:{Authorization:'Bearer '+value,Accept:'application/vnd.oci.image.manifest.v1+json'}})
  anonymousManifestStatus=manifest.status
 }else await token.body?.cancel()
 return {anonymousTokenStatus:token.status,anonymousManifestStatus}
}

// Live port: gh verifies signature/identity; the JSON is then re-checked above.
export function ghAttestationVerifyV1({gh,artifactPath,bundlePath,subjects,env=process.env,spawn=spawnSync}){
 if(![gh,artifactPath,bundlePath].every(path=>typeof path==='string'&&isAbsolute(path))||typeof env.GH_TOKEN!=='string')throw Error('PROVENANCE_VERIFY_INPUT_INVALID')
 const r=spawn(gh,['attestation','verify',artifactPath,'--bundle',bundlePath,'--repo',sourceRepository,'--signer-workflow',signerWorkflow,'--source-digest',subjects.source,'--predicate-type','https://slsa.dev/provenance/v1','--deny-self-hosted-runners','--format','json'],{env:{PATH:env.PATH,GH_TOKEN:env.GH_TOKEN,HOME:env.RUNNER_TEMP??env.HOME},encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024,shell:false})
 if(r.status!==0)throw Error('PROVENANCE_NOT_VERIFIED')
 let parsed;try{parsed=JSON.parse(r.stdout)}catch{throw Error('PROVENANCE_NOT_VERIFIED')}
 return provenanceResultV1(parsed,subjects)
}
