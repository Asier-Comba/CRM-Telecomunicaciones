import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createGhcrReadTransport} from './ghcr-read-transport.mjs'
import {imageTag} from './contract.mjs'
const token='SYNTHETIC_GITHUB_TOKEN_ONLY',registryToken='SYNTHETIC_REGISTRY_TOKEN_ONLY',reference=imageTag('a'.repeat(40),'b'.repeat(64)),configDigest='sha256:'+'c'.repeat(64)
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers})
test('private package read sends credentials only to the exact API destination and never creates a package',async()=>{
 const calls=[],transport=createGhcrReadTransport({token,actor:'synthetic',fetchImpl:async(url,options)=>{calls.push({url,options});return json({visibility:'private'})}})
 assert.equal((await transport.readPackage()).visibility,'private');assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.github.com/users/Asier-Comba/packages/container/crm-telecom-staging');assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.method,undefined);assert.equal(calls[0].options.headers.Authorization,'Bearer '+token)
})
test('only definitive tag404 means absent; denied/unknown responses cannot permit an overwrite',async()=>{
 for(const status of [200,401,403,404,500]){let calls=0;const transport=createGhcrReadTransport({token,actor:'synthetic',fetchImpl:async(url,options)=>{calls++;if(url.startsWith('https://ghcr.io/token?'))return json({token:registryToken});assert.equal(options.method,'HEAD');return new Response(null,{status,headers:status===200?{'docker-content-digest':configDigest}:{}})}});if(status===404)assert.equal(await transport.readTag(reference),null);else if(status===200)assert.equal(await transport.readTag(reference),configDigest);else await assert.rejects(()=>transport.readTag(reference),/TAG_UNKNOWN/);assert.equal(calls,2)}
})
test('manifest/config readback follows only approved signed CDN and strips credentials from that request',async()=>{
 const calls=[],manifest={config:{digest:configDigest}},transport=createGhcrReadTransport({token,actor:'synthetic',fetchImpl:async(url,options)=>{
  calls.push({url,options})
  if(url.startsWith('https://ghcr.io/token?'))return json({token:registryToken})
  if(url.includes('/manifests/'))return json(manifest,200,{'docker-content-digest':'sha256:'+'d'.repeat(64)})
  if(url.includes('/blobs/'))return new Response(null,{status:307,headers:{location:'https://pkg-containers.githubusercontent.com/owned-fixture?synthetic=1'}})
  assert.equal(url,'https://pkg-containers.githubusercontent.com/owned-fixture?synthetic=1');assert.equal(options.headers,undefined);return json({synthetic:true})
 }})
 const result=await transport.readImage(reference);assert.equal(JSON.parse(result.configBytes).synthetic,true);assert.equal(calls.length,4);assert.equal(calls[2].options.redirect,'manual');assert.equal(calls[3].options.redirect,'error');assert.equal(calls[3].options.headers,undefined)
})
test('unknown redirect destinations and credentials in URLs fail closed without forwarding tokens',async()=>{
 for(const location of ['http://pkg-containers.githubusercontent.com/file','https://unapproved.example.invalid/file','https://user:pass@pkg-containers.githubusercontent.com/file','https://pkg-containers.githubusercontent.com:444/file']){
  let external=false;const transport=createGhcrReadTransport({token,actor:'synthetic',fetchImpl:async url=>{if(url.startsWith('https://ghcr.io/token?'))return json({token:registryToken});if(url.includes('/manifests/'))return json({config:{digest:configDigest}});if(url.includes('/blobs/'))return new Response(null,{status:307,headers:{location}});external=true;throw Error('SYNTHETIC_UNEXPECTED_EXTERNAL_REQUEST')}})
  await assert.rejects(()=>transport.readImage(reference),/REDIRECT_INVALID/);assert.equal(external,false)
 }
})
test('a second CDN redirect cannot be followed or receive registry credentials',async()=>{
 let calls=0;const transport=createGhcrReadTransport({token,actor:'synthetic',fetchImpl:async(url,options)=>{
  calls++;if(url.startsWith('https://ghcr.io/token?'))return json({token:registryToken})
  if(url.includes('/manifests/'))return json({config:{digest:configDigest}})
  if(url.includes('/blobs/'))return new Response(null,{status:307,headers:{location:'https://pkg-containers.githubusercontent.com/owned'}})
  assert.equal(url,'https://pkg-containers.githubusercontent.com/owned');assert.equal(options.headers,undefined);assert.equal(options.redirect,'error');return new Response(null,{status:307,headers:{location:'https://unapproved.example.invalid'}})
 }});await assert.rejects(()=>transport.readImage(reference),/CONFIG_UNAVAILABLE/);assert.equal(calls,4)
})
test('missing private metadata, oversized data and invalid image references cannot become accepted evidence',async()=>{
 const transport=createGhcrReadTransport({token,actor:'synthetic',fetchImpl:async()=>new Response(null,{status:404})});await assert.rejects(()=>transport.readPackage(),/PACKAGE_UNAVAILABLE/)
 await assert.rejects(()=>transport.readTag('ghcr.io/other/app:tag'),/REFERENCE_INVALID/)
 const large=createGhcrReadTransport({token,actor:'synthetic',fetchImpl:async()=>new Response('x'.repeat(1024*1024+1))});await assert.rejects(()=>large.readPackage(),/RESPONSE_TOO_LARGE/)
})
