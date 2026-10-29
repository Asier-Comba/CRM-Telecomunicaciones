import test from 'node:test'
import assert from 'node:assert/strict'
import {provenanceResultV1,scanResultV1,privacyResultV1,anonymousProbeV1,ghAttestationVerifyV1,publishWorkflowPath} from './candidate-verifiers.mjs'
import {publishGateV1} from './publish-candidate.mjs'

// SIMULATED: synthetic gh JSON, statuses and fetch doubles. Not Sigstore/GHCR evidence.
const source='a'.repeat(40),manifest='4'.repeat(64)
const subjects={source,tree:'b'.repeat(40),manifest_digest:'sha256:'+manifest,image_config_digest:'sha256:'+'5'.repeat(64)}
const signer='https://github.com/Asier-Comba/CRM-Telecomunicaciones/'+publishWorkflowPath+'@refs/heads/w5/release'
function result(change=()=>{}){
 const r=[{verificationResult:{statement:{_type:'https://in-toto.io/Statement/v1',predicateType:'https://slsa.dev/provenance/v1',subject:[{name:'ghcr.io/asier-comba/crm-telecom-staging',digest:{sha256:manifest}}]},signature:{certificate:{issuer:'https://token.actions.githubusercontent.com',runnerEnvironment:'github-hosted',githubWorkflowRepository:'Asier-Comba/CRM-Telecomunicaciones',sourceRepositoryURI:'https://github.com/Asier-Comba/CRM-Telecomunicaciones',buildSignerURI:signer,buildTrigger:'workflow_dispatch',sourceRepositoryDigest:source,githubWorkflowSHA:source}}}}]
 change(r[0].verificationResult);return r
}
test('provenance binds subject name+manifest digest, hosted dispatch signer workflow and exact source',()=>{
 assert.equal(provenanceResultV1(result(),subjects).result,'PASS')
 const cases={
  PROVENANCE_RESULT_COUNT_INVALID:[()=>{}],
  PROVENANCE_PREDICATE_INVALID:[v=>{v.statement.predicateType='https://slsa.dev/provenance/v0.2'}],
  PROVENANCE_SUBJECT_MISMATCH:[v=>{v.statement.subject[0].digest.sha256='6'.repeat(64)},v=>{v.statement.subject[0].name='ghcr.io/other/x'},v=>{v.statement.subject.push(v.statement.subject[0])},v=>{v.statement.subject[0].digest.sha512='x'}],
  PROVENANCE_SIGNER_INVALID:[v=>{v.signature.certificate.runnerEnvironment='self-hosted'},v=>{v.signature.certificate.buildSignerURI=signer.replace('staging-image-publish','ci')},v=>{v.signature.certificate.buildTrigger='pull_request'},v=>{v.signature.certificate.issuer='https://example.invalid'},v=>{v.signature.certificate.githubWorkflowRepository='fork/CRM-Telecomunicaciones'}],
  PROVENANCE_SOURCE_MISMATCH:[v=>{v.signature.certificate.sourceRepositoryDigest='c'.repeat(40)},v=>{v.signature.certificate.githubWorkflowSHA='c'.repeat(40)}],
 }
 for(const [code,changes] of Object.entries(cases))for(const change of changes){
  const r=code==='PROVENANCE_RESULT_COUNT_INVALID'?[...result(),...result()]:result(change)
  assert.throws(()=>provenanceResultV1(r,subjects),{message:code})
 }
 assert.throws(()=>provenanceResultV1([],subjects),{message:'PROVENANCE_RESULT_COUNT_INVALID'})
})
test('scan verifier requires the pinned scanner, exact image/source and zero findings',()=>{
 const scan={result:'PASS',scanner:'trivy-0.75.0',target:'app',requested_image:'crm-w5-package:test',source_sha:source,image:subjects.image_config_digest,secret_findings:0,high_critical:[],raw_results_retained:false}
 assert.equal(scanResultV1(scan,subjects).result,'PASS')
 for(const change of [{scanner:'trivy-0.74.0'},{image:'sha256:'+'6'.repeat(64)},{source_sha:'c'.repeat(40)},{secret_findings:1},{high_critical:[{id:'CVE-1'}]},{result:'FAIL'},{raw_results_retained:true}])
  assert.throws(()=>scanResultV1({...scan,...change},subjects),{message:'SCAN_RESULT_INVALID'})
})
test('privacy needs private package, authenticated digest read and anonymous denial together',()=>{
 const ok={packageVisibility:'private',authenticatedManifestStatus:200,anonymousTokenStatus:403,anonymousManifestStatus:null}
 assert.equal(privacyResultV1(ok).anonymous_pull,'DENIED')
 assert.equal(privacyResultV1({...ok,anonymousTokenStatus:200,anonymousManifestStatus:401}).result,'PASS')
 assert.throws(()=>privacyResultV1({...ok,packageVisibility:'public'}),{message:'GHCR_PACKAGE_NOT_PRIVATE'})
 // A 403 for a digest the authenticated reader cannot see may just mean absence.
 assert.throws(()=>privacyResultV1({...ok,authenticatedManifestStatus:404}),{message:'GHCR_AUTHENTICATED_DIGEST_UNREADABLE'})
 for(const anon of [{anonymousTokenStatus:200,anonymousManifestStatus:200},{anonymousTokenStatus:500,anonymousManifestStatus:null},{anonymousTokenStatus:200,anonymousManifestStatus:500}])
  assert.throws(()=>privacyResultV1({...ok,...anon}),{message:'GHCR_ANONYMOUS_ACCESS_NOT_DENIED'})
})
test('anonymous probe sends no credential and network failure is never denial',async()=>{
 const seen=[]
 const fetchImpl=async(url,options)=>{seen.push([url,options.headers?.Authorization??null]);return url.includes('/token?')?{status:200,json:async()=>({token:'anonymous-registry-token'})}:{status:401}}
 assert.deepEqual(await anonymousProbeV1(subjects.manifest_digest,fetchImpl),{anonymousTokenStatus:200,anonymousManifestStatus:401})
 assert.equal(seen[0][1],null);assert.equal(seen[1][1],'Bearer anonymous-registry-token');assert.ok(seen[1][0].endsWith('/manifests/'+subjects.manifest_digest))
 await assert.rejects(anonymousProbeV1(subjects.manifest_digest,async()=>{throw new TypeError('fetch failed')}))
 await assert.rejects(anonymousProbeV1('latest',fetchImpl),{message:'GHCR_PROBE_INPUT_INVALID'})
})
test('gh attestation port passes strict flags, minimal env, and re-checks the JSON',()=>{
 let call
 const spawn=(bin,args,options)=>{call={bin,args,env:options.env};return {status:0,stdout:JSON.stringify(result())}}
 const env={PATH:'/usr/bin',GH_TOKEN:'SYNTHETIC_READ_TOKEN_ONLY',RUNNER_TEMP:'/runner/temp',UNRELATED_SECRET:'x'}
 assert.equal(ghAttestationVerifyV1({gh:'/usr/bin/gh',artifactPath:'/runner/temp/m',bundlePath:'/runner/temp/b.jsonl',subjects,env,spawn}).result,'PASS')
 for(const flag of ['--bundle','--repo','--signer-workflow','--source-digest','--deny-self-hosted-runners','--predicate-type'])assert.ok(call.args.includes(flag))
 assert.deepEqual(Object.keys(call.env).sort(),['GH_TOKEN','HOME','PATH'])
 assert.throws(()=>ghAttestationVerifyV1({gh:'/usr/bin/gh',artifactPath:'/m',bundlePath:'/b',subjects,env,spawn:()=>({status:1,stdout:''})}),{message:'PROVENANCE_NOT_VERIFIED'})
 assert.throws(()=>ghAttestationVerifyV1({gh:'/usr/bin/gh',artifactPath:'/m',bundlePath:'/b',subjects,env,spawn:()=>({status:0,stdout:JSON.stringify(result(v=>{v.signature.certificate.sourceRepositoryDigest='c'.repeat(40)}))})}),{message:'PROVENANCE_SOURCE_MISMATCH'})
})
test('publication gate needs protected hosted dispatch at the reviewed SHA and the environment approval',()=>{
 const env={CI:'true',GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:'Asier-Comba/CRM-Telecomunicaciones',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux',RUNNER_TEMP:'/runner/temp',REVIEWED_SOURCE_SHA:source,GITHUB_SHA:source,STAGING_IMAGE_APPROVED_SOURCE:source}
 if(process.platform==='linux')assert.equal(publishGateV1(env),source)
 else assert.throws(()=>publishGateV1(env),{message:'PUBLISH_PROTECTED_DISPATCH_REQUIRED'})
 for(const change of [{GITHUB_EVENT_NAME:'pull_request'},{RUNNER_ENVIRONMENT:'self-hosted'},{GITHUB_REPOSITORY:'fork/CRM-Telecomunicaciones'}])
  assert.throws(()=>publishGateV1({...env,...change}),{message:'PUBLISH_PROTECTED_DISPATCH_REQUIRED'})
 if(process.platform==='linux')for(const change of [{GITHUB_SHA:'c'.repeat(40)},{STAGING_IMAGE_APPROVED_SOURCE:''},{STAGING_IMAGE_APPROVED_SOURCE:'c'.repeat(40)},{REVIEWED_SOURCE_SHA:'main'}])
  assert.throws(()=>publishGateV1({...env,...change}),{message:'PUBLISH_SOURCE_NOT_APPROVED'})
})
