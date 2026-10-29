import test from 'node:test'
import assert from 'node:assert/strict'
import {imageRepository} from './contract.mjs'
import {craneSessionActions,createCraneSession,labRepository} from './crane-session.mjs'

// Injected command doubles only; no crane binary, registry or credential is used.
const manifestDigest='sha256:'+'4'.repeat(64),token='SYNTHETIC_TOKEN_NEVER_LOGGED'
const tag=repository=>repository+':sha-'+'a'.repeat(40)+'-config-'+'e'.repeat(64)
function session({repository=imageRepository,pushed,fail={},index}={}){
 const calls=[]
 const actions=craneSessionActions({repository,layoutRoot:'/runner/temp/crm-oci-layout-x',manifestDigest,
  command:(args,input)=>{calls.push([args.slice(0,2).join(' '),input===undefined?null:'stdin']);if(fail[args[0]+' '+(args[1]??'')]||fail[args[0]])throw Error('crane exited 1 with secret-looking text');return args[0]==='push'?(pushed??repository+'@'+manifestDigest):''},
  removeConfig:async()=>{calls.push(['remove',null]);if(fail.remove)throw Error('STAGING_AUTH_DIRECTORY_REMAINS')},
  readIndex:async()=>JSON.stringify(index??{manifests:[{digest:manifestDigest}]})})
 return {actions,calls}
}
test('GHCR login uses stdin only and push requires the exact verified manifest digest back',async()=>{
 const s=session();await s.actions.login(token);await s.actions.push(tag(imageRepository));await s.actions.cleanup()
 assert.deepEqual(s.calls,[['auth login','stdin'],['push /runner/temp/crm-oci-layout-x',null],['auth logout',null],['remove',null]])
 assert.equal(JSON.stringify(s.calls).includes(token),false)
})
test('lab loopback repository never accepts credentials and never logs out',async()=>{
 const s=session({repository:labRepository})
 await assert.rejects(s.actions.login(token),{message:'STAGING_CRANE_AUTH_INVALID'})
 await s.actions.push(tag(labRepository));await s.actions.cleanup()
 assert.deepEqual(s.calls.map(c=>c[0]),['push /runner/temp/crm-oci-layout-x','remove'])
})
test('mutable/foreign references, changed layouts and re-serialized pushes are rejected',async()=>{
 for(const reference of [imageRepository+':latest',imageRepository+'@'+manifestDigest,labRepository.replace('5055','5056')+':x',tag(labRepository)]){
  const s=session();await assert.rejects(s.actions.push(reference),{message:'STAGING_CRANE_REFERENCE_INVALID'});assert.equal(s.calls.length,0)
 }
 const changed=session({index:{manifests:[{digest:'sha256:'+'5'.repeat(64)}]}})
 await assert.rejects(changed.actions.push(tag(imageRepository)),{message:'STAGING_CRANE_LAYOUT_CHANGED'});assert.equal(changed.calls.length,0)
 const other=session({pushed:imageRepository+'@sha256:'+'6'.repeat(64)})
 await assert.rejects(other.actions.push(tag(imageRepository)),{message:'STAGING_CRANE_PUSHED_DIGEST_MISMATCH'})
 assert.throws(()=>craneSessionActions({repository:'docker.io/library/x',layoutRoot:'/x',manifestDigest}),{message:'STAGING_CRANE_SESSION_INVALID'})
})
test('logout failure still removes credentials; removal failure is never reported as clean',async()=>{
 const s=session({fail:{auth:true}})
 await assert.rejects(s.actions.login(token));await assert.rejects(s.actions.cleanup(),{message:'STAGING_CRANE_LOGOUT_FAILED'})
 assert.deepEqual(s.calls.at(-1),['remove',null])
 const r=session({fail:{remove:true}});await r.actions.login(token)
 await assert.rejects(r.actions.cleanup(),{message:'STAGING_AUTH_DIRECTORY_REMAINS'})
 // A failed cleanup still closes the session for any further push or login.
 await assert.rejects(r.actions.push(tag(imageRepository)),{message:'STAGING_CRANE_REFERENCE_INVALID'})
 await assert.rejects(r.actions.login(token),{message:'STAGING_CRANE_AUTH_INVALID'})
})
test('ordinary, pull_request-to-GHCR and non-hosted execution cannot create an auth directory',async()=>{
 const base={CI:'true',GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Asier-Comba/CRM-Telecomunicaciones',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_TEMP:'/nonexistent-runner-temp'}
 for(const env of [{},{...base,GITHUB_EVENT_NAME:'pull_request'},{...base,GITHUB_EVENT_NAME:'workflow_dispatch',RUNNER_ENVIRONMENT:'self-hosted'}])
  await assert.rejects(createCraneSession({repository:imageRepository,layoutRoot:'/x',manifestDigest,crane:'/x/crane',env}),{message:'STAGING_MANUAL_CI_SESSION_REQUIRED'})
 await assert.rejects(createCraneSession({repository:labRepository,layoutRoot:'/x',manifestDigest,crane:'/x/crane',env:{...base,GITHUB_EVENT_NAME:'workflow_dispatch'}}),{message:'STAGING_MANUAL_CI_SESSION_REQUIRED'})
})
