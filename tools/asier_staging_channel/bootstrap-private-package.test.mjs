import test from 'node:test'
import assert from 'node:assert/strict'
import {bootstrapPrivatePackageV1,bootstrapSeedV1} from './bootstrap-private-package.mjs'
import {sourceRepository} from './publisher.mjs'

function fixture(){
 const calls=[],token='SYNTHETIC_BOOTSTRAP_NEVER_LOGGED',config='sha256:'+'a'.repeat(64)
 const pkg={name:'crm-telecom-staging',package_type:'container',visibility:'private',repository:{full_name:sourceRepository}}
 const ports={authorizeBootstrap:async()=>true,assertNamespaceAbsent:async()=>{calls.push('absence');return true},verifySeed:async seed=>({...seed,image_config_digest:config}),createSession:async()=>{calls.push('session');return{login:async value=>{assert.equal(value,token);calls.push('login')},copySeed:async value=>{calls.push('copy');assert.equal(value.source,bootstrapSeedV1.reference);assert.match(value.destination,/:bootstrap-[a-f0-9]{40}$/)},cleanup:async()=>{calls.push('cleanup')}}},verifyCopiedSeed:async reference=>({reference,manifest_digest:bootstrapSeedV1.manifest_digest,image_config_digest:config}),readPackage:async()=>pkg,verifyAnonymousPullDenied:async()=>true}
 return{reviewedSource:'b'.repeat(40),env:{GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:sourceRepository,RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux'},token,ports,calls,pkg}
}
test('bootstrap is a distinct inert seed protocol and never creates a candidate receipt',async()=>{
 const f=fixture(),result=await bootstrapPrivatePackageV1(f)
 assert.equal(result.result,'PASS');assert.equal(result.publication,'VERIFIED_PRIVATE_BOOTSTRAP');assert.equal(result.receipt,null);assert.equal(result.candidate,false);assert.equal(result.deploying_authorized,false)
 assert.deepEqual(f.calls,['absence','session','login','copy','cleanup']);assert.equal(JSON.stringify(result).includes(f.token),false)
})
test('ordinary execution, missing verifier, refused authorization and ambiguous absence make zero writes',async()=>{
 for(const kind of ['ordinary','verifier','authorization','absence','absence_false']){
  const f=fixture();if(kind==='ordinary')f.env={};if(kind==='verifier')delete f.ports.verifySeed;if(kind==='authorization')f.ports.authorizeBootstrap=async()=>false;if(kind==='absence')f.ports.assertNamespaceAbsent=async()=>{throw Error('HTTP404_OR_PERMISSION_UNKNOWN')}
  if(kind==='absence_false')f.ports.assertNamespaceAbsent=async()=>false
  assert.equal((await bootstrapPrivatePackageV1(f)).result,'FAIL');assert.equal(f.calls.includes('session'),false)
 }
})
test('seed reference and copied digests cannot be replaced with another artifact',async()=>{
 for(const kind of ['source','manifest','config']){
  const f=fixture()
  if(kind==='source')f.ports.verifySeed=async()=>({reference:'somewhere/other@sha256:'+'f'.repeat(64),manifest_digest:bootstrapSeedV1.manifest_digest,image_config_digest:'sha256:'+'a'.repeat(64)})
  else f.ports.verifyCopiedSeed=async reference=>({reference,manifest_digest:kind==='manifest'?'sha256:'+'f'.repeat(64):bootstrapSeedV1.manifest_digest,image_config_digest:kind==='config'?'sha256:'+'f'.repeat(64):'sha256:'+'a'.repeat(64)})
  const result=await bootstrapPrivatePackageV1(f);assert.equal(result.result,'FAIL');assert.equal(result.receipt,null)
 }
})
test('public, foreign and anonymous-readable packages cannot finish bootstrap',async()=>{
 for(const kind of ['public','foreign','anonymous']){
  const f=fixture();if(kind==='public')f.pkg.visibility='public';if(kind==='foreign')f.pkg.repository.full_name='other/repo';if(kind==='anonymous')f.ports.verifyAnonymousPullDenied=async()=>false
  const result=await bootstrapPrivatePackageV1(f);assert.equal(result.result,'FAIL');assert.equal(result.publication,'PUSH_SUCCEEDED_NOT_YET_VERIFIED');assert.equal(result.credential_cleanup,'PASS')
 }
})
test('failed login, uncertain push and cleanup failures retain partial outcomes without leaking secrets',async()=>{
 for(const step of ['login','copySeed','cleanup']){
  const f=fixture(),create=f.ports.createSession
  f.ports.createSession=async()=>({...await create(),[step]:async()=>{throw Error(f.token)}})
  const result=await bootstrapPrivatePackageV1(f);assert.equal(result.result,'FAIL');assert.equal(JSON.stringify(result).includes(f.token),false)
  assert.equal(result.publication,step==='login'?'NOT_ATTEMPTED':step==='copySeed'?'OUTCOME_UNKNOWN':'VERIFIED_PRIVATE_BOOTSTRAP')
  assert.equal(result.credential_cleanup,step==='cleanup'?'FAIL':'PASS');assert.equal(result.receipt,null)
 }
})
