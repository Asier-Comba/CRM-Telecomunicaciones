import test from 'node:test'
import assert from 'node:assert/strict'
import {digest,publicBuildIdentity} from './contract.mjs'
import {publishCandidateV1} from './publish-driver.mjs'
import {sourceRepository} from './publisher.mjs'

function fixture(){
 const bytes=value=>Buffer.from(JSON.stringify(value)),calls=[],token='SYNTHETIC_PUBLICATION_NEVER_LOGGED'
 const publicValues={NEXT_PUBLIC_APP_URL:'https://staging.example.invalid',NEXT_PUBLIC_SUPABASE_URL:'https://db.example.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_SYNTHETIC_ONLY_123456789'}
 const source={source:'a'.repeat(40),tree:'b'.repeat(40),lockfileBytes:Buffer.from('synthetic-lock'),dockerfileBytes:Buffer.from('synthetic-dockerfile'),publicValues}
 const expected={source:source.source,tree:source.tree,lockfile_sha256:digest(source.lockfileBytes),dockerfile_sha256:digest(source.dockerfileBytes),public_build_sha256:publicBuildIdentity(publicValues)}
 const labels=Object.fromEntries(Object.entries({source:'org.opencontainers.image.revision',tree:'io.crm.source.tree',lockfile_sha256:'io.crm.lockfile.sha256',dockerfile_sha256:'io.crm.dockerfile.sha256',public_build_sha256:'io.crm.public-build.sha256'}).map(([key,name])=>[name,expected[key]]))
 const configBytes=bytes({architecture:'amd64',os:'linux',rootfs:{type:'layers',diff_ids:['sha256:'+'1'.repeat(64)]},config:{User:'65532:65532',WorkingDir:'/app',Entrypoint:['/nodejs/bin/node'],Cmd:['scripts/platform/entrypoint.mjs'],ExposedPorts:{'3000/tcp':{}},Env:['NODE_ENV=production','NEXT_TELEMETRY_DISABLED=1','HOSTNAME=0.0.0.0','PORT=3000','TZ=UTC'],Labels:labels}})
 const imageConfig='sha256:'+digest(configBytes),manifestBytes=bytes({schemaVersion:2,mediaType:'application/vnd.oci.image.manifest.v1+json',config:{mediaType:'application/vnd.oci.image.config.v1+json',digest:imageConfig,size:configBytes.length},layers:[{mediaType:'application/vnd.oci.image.layer.v1.tar+gzip',digest:'sha256:'+'2'.repeat(64),size:12}]})
 const image={manifestBytes,configBytes,requestedDigest:'sha256:'+digest(manifestBytes)},scan={result:'PASS',source_sha:expected.source,image:imageConfig,secret_findings:0,high_critical:[]}
 // Synthetic verifier fixture only: this is NOT a cryptographic provenance verifier.
 const evidence={image,scanBytes:bytes(scan),provenanceBytes:bytes({synthetic:true})}
 const pkg={name:'crm-telecom-staging',package_type:'container',visibility:'private',repository:{full_name:sourceRepository}}
 const publisher={readPackage:async()=>pkg,readTag:async()=>null,readImage:async()=>image,createSession:async()=>{calls.push('session');return{login:async value=>{assert.equal(value,token);calls.push('login')},push:async()=>{calls.push('push')},cleanup:async()=>{calls.push('cleanup')}}}}
 const ports={authorizePublication:async()=>true,readSource:async()=>source,readEvidence:async()=>evidence,verifyEvidence:async({subjects})=>({...subjects}),publisher}
 return{expected,env:{GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:sourceRepository,RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux'},token,ports,calls,source,evidence,scan,pkg,bytes}
}
test('verified raw source/OCI evidence reaches the existing publisher without deployment authority',async()=>{
 const f=fixture(),result=await publishCandidateV1(f)
 assert.equal(result.result,'PASS');assert.equal(result.receipt.source,f.expected.source);assert.equal(result.publication,'VERIFIED_PRIVATE_DIGEST');assert.equal(result.evidence_verification,'TRUSTED_PORT_VERIFIED');assert.equal(result.deploying_authorized,false)
 assert.deepEqual(f.calls,['session','login','push','cleanup']);assert.equal(JSON.stringify(result).includes(f.token),false)
})
test('PASS JSON and labels cannot substitute for authorization or a trusted verifier capability',async()=>{
 for(const kind of ['ordinary','authorization','missing','flag','mismatch']){
  const f=fixture();if(kind==='ordinary')f.env={};if(kind==='authorization')f.ports.authorizePublication=async()=>false;if(kind==='missing')delete f.ports.verifyEvidence;if(kind==='flag')f.ports.verifyEvidence=async()=>({verified:true});if(kind==='mismatch')f.ports.verifyEvidence=async({subjects})=>({...subjects,manifest_digest:'sha256:'+'f'.repeat(64)})
  const result=await publishCandidateV1(f);assert.equal(result.result,'FAIL');assert.equal(result.publication,'NOT_ATTEMPTED');assert.deepEqual(f.calls,[])
 }
})
test('source files public bindings and raw OCI corruption reject before credential creation',async()=>{
 for(const kind of ['lock','dockerfile','public','tree','oci']){
  const f=fixture();if(kind==='lock')f.source.lockfileBytes=Buffer.from('changed');if(kind==='dockerfile')f.source.dockerfileBytes=Buffer.from('changed');if(kind==='public')f.source.publicValues.NEXT_PUBLIC_APP_URL='https://other.invalid';if(kind==='tree')f.source.tree='f'.repeat(40);if(kind==='oci')f.evidence.image.manifestBytes=Buffer.concat([f.evidence.image.manifestBytes,Buffer.from(' ')])
  assert.equal((await publishCandidateV1(f)).result,'FAIL');assert.deepEqual(f.calls,[])
 }
})
test('scan findings missing provenance and wrong scan subject cannot reach publication',async()=>{
 for(const patch of [{secret_findings:1},{high_critical:['CVE-SYNTHETIC']},{image:'sha256:'+'f'.repeat(64)},{result:'FAIL'}]){
  const f=fixture();f.evidence.scanBytes=f.bytes({...f.scan,...patch});assert.equal((await publishCandidateV1(f)).result,'FAIL');assert.deepEqual(f.calls,[])
 }
 const f=fixture();f.evidence.provenanceBytes=undefined;assert.equal((await publishCandidateV1(f)).result,'FAIL');assert.deepEqual(f.calls,[])
})
test('existing publisher retains public-package, uncertain-push and credential-cleanup failures',async()=>{
 for(const kind of ['privacy','push','cleanup']){
  const f=fixture();if(kind==='privacy')f.pkg.visibility='public'
  else{const create=f.ports.publisher.createSession;f.ports.publisher.createSession=async()=>({...await create(),[kind]:async()=>{throw Error(f.token)}})}
  const result=await publishCandidateV1(f);assert.equal(result.result,'FAIL');assert.equal(result.deploying_authorized,false);assert.equal(JSON.stringify(result).includes(f.token),false)
  assert.equal(result.receipt,null)
  if(kind==='push')assert.equal(result.publication,'OUTCOME_UNKNOWN');if(kind==='cleanup')assert.equal(result.publication,'VERIFIED_PRIVATE_DIGEST')
 }
})

test('a verifier cannot change the source tuple already authorized for this publication',async()=>{
 const f=fixture(),tree=f.expected.tree
 f.ports.verifyEvidence=async({subjects})=>{f.expected.tree='f'.repeat(40);return{...subjects}}
 const result=await publishCandidateV1(f)
 assert.equal(result.result,'PASS');assert.equal(result.receipt.tree,tree)
})

test('another published manifest sharing the verified config cannot yield a consumable receipt',async()=>{
 for(const change of ['media_type','compressed_layer']){
  const f=fixture(),original=f.evidence.image,manifest=JSON.parse(original.manifestBytes)
  if(change==='media_type')manifest.mediaType='application/vnd.docker.distribution.manifest.v2+json'
  else{manifest.layers[0].digest='sha256:'+'3'.repeat(64);manifest.layers[0].size=13}
  const manifestBytes=f.bytes(manifest),readback={...original,manifestBytes,requestedDigest:'sha256:'+digest(manifestBytes)}
  assert.notEqual(readback.requestedDigest,original.requestedDigest)
  assert.equal(JSON.parse(readback.manifestBytes).config.digest,JSON.parse(original.manifestBytes).config.digest)
  f.ports.publisher.readImage=async()=>readback
  const result=await publishCandidateV1(f)
  assert.equal(result.result,'FAIL');assert.equal(result.error,'CANDIDATE_PUBLISHED_MANIFEST_MISMATCH');assert.equal(result.receipt,null)
  assert.equal(result.publication,'VERIFIED_PRIVATE_DIGEST');assert.equal(result.credential_cleanup,'PASS');assert.equal(result.deploying_authorized,false)
  assert.equal(result.evidence.manifest_digest,original.requestedDigest)
  assert.equal(result.published_manifest_digest,readback.requestedDigest)
  assert.deepEqual(f.calls,['session','login','push','cleanup'])
 }
})
