import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {bootstrapPrivatePackageV1,bootstrapSeedV1} from './bootstrap-private-package.mjs'
import {bootstrapPortsV1} from './bootstrap-transport.mjs'
import {sourceRepository} from './publisher.mjs'

// SIMULATED: fetch and crane are doubles. No registry, package or credential is touched.
const source='b'.repeat(40),token='SYNTHETIC_BOOTSTRAP_NEVER_LOGGED',config='{"architecture":"amd64","os":"linux"}'
const configDigest='sha256:'+createHash('sha256').update(config).digest('hex')
const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:sourceRepository,RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux'}
function fixture({api=[404,200],registryToken=200,tags=404,anonymous=403,anonManifest=401,visibility='private',copied=bootstrapSeedV1.manifest_digest,seed=bootstrapSeedV1.manifest_digest,approved=source,logout}={}){
 const calls=[],apiStatuses=[...api]
 const json=(status,body)=>({status,json:async()=>body,body:{cancel:async()=>{}}})
 const fetchImpl=async(url,options={})=>{
  const auth=options.headers?.Authorization??null
  if(url.startsWith('https://api.github.com/')){calls.push('api');assert.equal(auth,'Bearer '+token);const status=apiStatuses.shift()??200;return json(status,{name:'crm-telecom-staging',package_type:'container',visibility,repository:{full_name:sourceRepository}})}
  if(url.includes('/token?')){if(auth){calls.push('registry-token');return json(registryToken,{token:'registry-token-synthetic'})}calls.push('anon-token');return json(anonymous,{token:'anon'})}
  if(url.endsWith('/tags/list')){calls.push('tags');return json(tags,{})}
  calls.push('anon-manifest');return json(anonManifest,{})
 }
 const crane=(args,{auth,input}={})=>{
  calls.push((auth?'auth:':'')+args.slice(0,2).join(' '))
  if(args[0]==='auth'&&args[1]==='logout'&&logout)throw Error('logout failed')
  if(args[0]==='digest')return args.at(-1).startsWith('ghcr.io/')?copied:seed
  if(args[0]==='config')return config
  if(args[0]==='auth'&&args[1]==='login')assert.equal(input,token)
  return ''
 }
 const ports=bootstrapPortsV1({reviewedSource:source,approvedSource:approved,token,actor:'Asier-Comba',crane,openAuth:async()=>calls.push('open'),closeAuth:async()=>calls.push('close'),fetchImpl})
 return {f:{reviewedSource:source,env,token,ports},calls}
}
test('bootstrap copies only the pinned seed after proven absence and verifies privacy',async()=>{
 const {f,calls}=fixture(),r=await bootstrapPrivatePackageV1(f)
 assert.equal(r.result,'PASS');assert.equal(r.publication,'VERIFIED_PRIVATE_BOOTSTRAP');assert.equal(r.receipt,null);assert.equal(r.candidate,false)
 assert.ok(calls.indexOf('auth:copy --platform')>calls.indexOf('tags'));assert.equal(calls.at(-1),'close');assert.equal(JSON.stringify(r).includes(token),false)
 assert.equal(configDigest.length,71)
})
test('absence is unproven unless both authenticated API and registry say absent',async()=>{
 for(const options of [{api:[403]},{api:[200]},{registryToken:403},{tags:200},{tags:401}]){
  const {f,calls}=fixture(options),r=await bootstrapPrivatePackageV1(f)
  assert.equal(r.error,'BOOTSTRAP_NAMESPACE_ABSENCE_UNPROVEN');assert.equal(calls.includes('open'),false)
 }
})
test('separate owner approval, a different seed digest or a different copy never pass',async()=>{
 const refused=fixture({approved:'c'.repeat(40)});assert.equal((await bootstrapPrivatePackageV1(refused.f)).error,'BOOTSTRAP_NOT_AUTHORIZED')
 const seed=fixture({seed:'sha256:'+'f'.repeat(64)});assert.equal((await bootstrapPrivatePackageV1(seed.f)).error,'BOOTSTRAP_SEED_UNVERIFIED');assert.equal(seed.calls.includes('open'),false)
 const copy=fixture({copied:'sha256:'+'f'.repeat(64)}),r=await bootstrapPrivatePackageV1(copy.f)
 assert.equal(r.error,'BOOTSTRAP_COPY_MISMATCH');assert.equal(r.publication,'PUSH_SUCCEEDED_NOT_YET_VERIFIED');assert.equal(copy.calls.at(-1),'close')
})
test('public package or anonymous access fails, and logout failure still removes credentials',async()=>{
 assert.equal((await bootstrapPrivatePackageV1(fixture({visibility:'public'}).f)).error,'BOOTSTRAP_PRIVATE_BINDING_REQUIRED')
 assert.equal((await bootstrapPrivatePackageV1(fixture({anonymous:200,anonManifest:200}).f)).error,'BOOTSTRAP_ANONYMOUS_ACCESS_UNPROVEN')
 const {f,calls}=fixture({logout:true}),r=await bootstrapPrivatePackageV1(f)
 assert.equal(r.result,'FAIL');assert.equal(r.credential_cleanup,'FAIL');assert.equal(calls.at(-1),'close')
})
test('transport rejects malformed inputs before any port exists',()=>{
 for(const input of [{reviewedSource:'main'},{token:'short'},{actor:'-bad'},{crane:null}])
  assert.throws(()=>bootstrapPortsV1({reviewedSource:source,approvedSource:source,token,actor:'Asier-Comba',crane:()=>'',openAuth:async()=>{},closeAuth:async()=>{},...input}),{message:'BOOTSTRAP_TRANSPORT_INPUT_INVALID'})
})
