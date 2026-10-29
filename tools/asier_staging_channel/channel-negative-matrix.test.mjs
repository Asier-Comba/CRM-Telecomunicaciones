import test from 'node:test'
import assert from 'node:assert/strict'
import {digest,publicBuildIdentity} from './contract.mjs'
import {publishCandidateV1} from './publish-driver.mjs'
import {sourceRepository} from './publisher.mjs'
import {craneSessionActions} from './crane-session.mjs'

// SIMULATED: every registry, credential and verifier below is an injected double.
// These results are protocol evidence only and never real GHCR/provenance evidence.
const bytes=value=>Buffer.from(JSON.stringify(value)),token='SYNTHETIC_PUBLICATION_NEVER_LOGGED'
const publicValues={NEXT_PUBLIC_APP_URL:'https://staging.example.invalid',NEXT_PUBLIC_SUPABASE_URL:'https://db.example.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_SYNTHETIC_ONLY_123456789'}
const source={source:'a'.repeat(40),tree:'b'.repeat(40),lockfileBytes:Buffer.from('synthetic-lock'),dockerfileBytes:Buffer.from('synthetic-dockerfile'),publicValues}
const expected={source:source.source,tree:source.tree,lockfile_sha256:digest(source.lockfileBytes),dockerfile_sha256:digest(source.dockerfileBytes),public_build_sha256:publicBuildIdentity(publicValues)}
const labels={'org.opencontainers.image.revision':expected.source,'io.crm.source.tree':expected.tree,'io.crm.lockfile.sha256':expected.lockfile_sha256,'io.crm.dockerfile.sha256':expected.dockerfile_sha256,'io.crm.public-build.sha256':expected.public_build_sha256}
const configBytes=bytes({architecture:'amd64',os:'linux',rootfs:{type:'layers',diff_ids:['sha256:'+'1'.repeat(64)]},config:{User:'65532:65532',WorkingDir:'/app',Entrypoint:['/nodejs/bin/node'],Cmd:['scripts/platform/entrypoint.mjs'],ExposedPorts:{'3000/tcp':{}},Env:['NODE_ENV=production','NEXT_TELEMETRY_DISABLED=1','HOSTNAME=0.0.0.0','PORT=3000','TZ=UTC'],Labels:labels}})
const imageConfig='sha256:'+digest(configBytes)
const manifest=(change={})=>{const m={schemaVersion:2,mediaType:'application/vnd.oci.image.manifest.v1+json',config:{mediaType:'application/vnd.oci.image.config.v1+json',digest:imageConfig,size:configBytes.length},layers:[{mediaType:'application/vnd.oci.image.layer.v1.tar+gzip',digest:'sha256:'+'2'.repeat(64),size:12}],...change};const manifestBytes=bytes(m);return{manifestBytes,configBytes,requestedDigest:'sha256:'+digest(manifestBytes)}}
const image=manifest()

function fixture(){
 const calls=[],state={visibility:['private','private'],tag:null,readback:image}
 const pkg=()=>({name:'crm-telecom-staging',package_type:'container',visibility:state.visibility.shift()??'private',repository:{full_name:sourceRepository}})
 // Digest-preserving session: pushes the verified layout and reports its digest.
 const crane=(fail={})=>craneSessionActions({repository:'ghcr.io/asier-comba/crm-telecom-staging',layoutRoot:'/runner/temp/crm-oci-layout-x',manifestDigest:image.requestedDigest,
  command:(args,input)=>{calls.push(args[0]==='auth'?args[1]:args[0]);if(fail[args[0]==='auth'?args[1]:args[0]])throw fail[args[0]==='auth'?args[1]:args[0]];return args[0]==='push'?'ghcr.io/asier-comba/crm-telecom-staging@'+image.requestedDigest:''},
  removeConfig:async()=>{calls.push('remove');if(fail.remove)throw Error('STAGING_AUTH_DIRECTORY_REMAINS')},readIndex:async()=>JSON.stringify({manifests:[{digest:image.requestedDigest}]})})
 const f={expected,token,calls,state,env:{GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:sourceRepository,RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux'},sessionFail:{},
  ports:{authorizePublication:async()=>true,readSource:async()=>source,readEvidence:async()=>({image,scanBytes:bytes({result:'PASS',source_sha:expected.source,image:imageConfig,secret_findings:0,high_critical:[]}),provenanceBytes:bytes({synthetic:true})}),verifyEvidence:async({subjects})=>({...subjects})}}
 f.ports.publisher={readPackage:async()=>pkg(),readTag:async()=>state.tag,readImage:async()=>{if(state.readback instanceof Error)throw state.readback;return state.readback},createSession:async()=>{calls.push('session');return crane(f.sessionFail)}}
 return f
}
const consumable=r=>r.result==='PASS'&&r.receipt!==null
const noSecret=r=>assert.equal(JSON.stringify(r).includes(token),false)

test('baseline: digest-preserving push yields a receipt bound to the verified manifest',async()=>{
 const f=fixture(),r=await publishCandidateV1(f)
 assert.equal(r.result,'PASS');assert.equal(r.receipt.manifest_digest,r.evidence.manifest_digest);assert.equal(r.deploying_authorized,false)
 assert.deepEqual(f.calls,['session','login','push','logout','remove']);noSecret(r)
})
const cases={
 different_manifest:f=>{f.state.readback=manifest({config:{mediaType:'application/vnd.oci.image.config.v1+json',digest:'sha256:'+'7'.repeat(64),size:configBytes.length}})},
 same_config_different_manifest:f=>{f.state.readback=manifest({mediaType:'application/vnd.docker.distribution.manifest.v2+json'})},
 modified_layer:f=>{f.state.readback=manifest({layers:[{mediaType:'application/vnd.oci.image.layer.v1.tar+gzip',digest:'sha256:'+'3'.repeat(64),size:12}]})},
 mutable_tag_exists:f=>{f.state.tag='sha256:'+'8'.repeat(64)},
 expired_credential:f=>{f.sessionFail.login=Error('unauthorized: authentication required token expired')},
 network_error:f=>{f.state.readback=new TypeError('fetch failed ECONNRESET')},
 partial_publish:f=>{f.sessionFail.push=Error('blob upload unknown; partial')},
 cleanup_failure:f=>{f.sessionFail.remove=true},
 non_private_package:f=>{f.state.visibility=['public']},
 package_turns_public:f=>{f.state.visibility=['private','public']},
 unknown_provenance:f=>{f.ports.verifyEvidence=async()=>{throw Error('no attestation found for subject')}},
 provenance_other_subject:f=>{f.ports.verifyEvidence=async({subjects})=>({...subjects,manifest_digest:'sha256:'+'9'.repeat(64)})},
}
for(const [name,apply] of Object.entries(cases))test(`negative: ${name} never yields a consumable receipt`,async()=>{
 const f=fixture();apply(f);const r=await publishCandidateV1(f)
 assert.equal(consumable(r),false);assert.equal(r.result,'FAIL');assert.equal(r.deploying_authorized,false);assert.equal(r.publishing_authorized,false);noSecret(r)
 assert.match(r.error,/^(CANDIDATE|STAGING)_[A-Z_]+$/)
 // Any created credential session must have attempted removal.
 if(f.calls.includes('session'))assert.equal(f.calls.at(-1),'remove')
 if(['mutable_tag_exists','non_private_package','unknown_provenance','provenance_other_subject'].includes(name))assert.equal(f.calls.includes('push'),false)
 if(['partial_publish'].includes(name))assert.equal(r.publication,'OUTCOME_UNKNOWN')
 if(['network_error','different_manifest'].includes(name))assert.equal(r.publication,'PUSH_SUCCEEDED_NOT_YET_VERIFIED')
 if(name==='cleanup_failure'){assert.equal(r.credential_cleanup,'FAIL');assert.equal(r.publication,'VERIFIED_PRIVATE_DIGEST')}
 if(['same_config_different_manifest','modified_layer'].includes(name))assert.equal(r.error,'CANDIDATE_PUBLISHED_MANIFEST_MISMATCH')
})
