import {test} from 'node:test'
import assert from 'node:assert/strict'
import {digest,imageTag} from './contract.mjs'
import {publishVerifiedImage,sourceRepository} from './publisher.mjs'
import {createDockerPublishSession,dockerSessionActions} from './docker-session.mjs'
const token='SYNTHETIC_TOKEN_NEVER_PRINTED'
function fixture(){
 const expected={source:'a'.repeat(40),tree:'b'.repeat(40),lockfile_sha256:'c'.repeat(64),dockerfile_sha256:'d'.repeat(64),public_build_sha256:'e'.repeat(64)},bytes=v=>Buffer.from(JSON.stringify(v))
 const configBytes=bytes({architecture:'amd64',os:'linux',rootfs:{type:'layers',diff_ids:['sha256:'+'1'.repeat(64)]},config:{User:'65532:65532',WorkingDir:'/app',Entrypoint:['/nodejs/bin/node'],Cmd:['scripts/platform/entrypoint.mjs'],ExposedPorts:{'3000/tcp':{}},Env:['NODE_ENV=production','NEXT_TELEMETRY_DISABLED=1','HOSTNAME=0.0.0.0','PORT=3000','TZ=UTC'],Labels:{'org.opencontainers.image.revision':expected.source,'io.crm.source.tree':expected.tree,'io.crm.lockfile.sha256':expected.lockfile_sha256,'io.crm.dockerfile.sha256':expected.dockerfile_sha256,'io.crm.public-build.sha256':expected.public_build_sha256}}})
 const imageConfigDigest='sha256:'+digest(configBytes),manifestBytes=bytes({schemaVersion:2,mediaType:'application/vnd.oci.image.manifest.v1+json',config:{mediaType:'application/vnd.oci.image.config.v1+json',digest:imageConfigDigest,size:configBytes.length},layers:[{mediaType:'application/vnd.oci.image.layer.v1.tar+gzip',digest:'sha256:'+'2'.repeat(64),size:12}]}),raw={manifestBytes,configBytes,requestedDigest:'sha256:'+digest(manifestBytes)},calls=[]
 const pkg={name:'crm-telecom-staging',package_type:'container',visibility:'private',repository:{full_name:sourceRepository}}
 const ports={readPackage:async()=>{calls.push('package');return pkg},readTag:async tag=>{assert.equal(tag,imageTag(expected.source,expected.public_build_sha256));calls.push('tag');return null},readImage:async()=>{calls.push('readback');return raw},createSession:async()=>{calls.push('session');return{login:async value=>{assert.equal(value,token);calls.push('login')},push:async()=>{calls.push('push')},cleanup:async()=>{calls.push('cleanup')}}}}
 return{expected,imageConfigDigest,scan:{result:'PASS',source_sha:expected.source,image:imageConfigDigest,secret_findings:0,high_critical:[]},token,ports,calls,pkg,raw}
}
test('private pre/post binding and exact raw digest readback produce a receipt without deployment authority',async()=>{
 const f=fixture(),r=await publishVerifiedImage(f)
 assert.equal(r.result,'PASS');assert.equal(r.publication,'VERIFIED_PRIVATE_DIGEST');assert.equal(r.receipt.visibility,'private');assert.equal(r.receipt.manifest_digest,f.raw.requestedDigest);assert.equal(r.credential_cleanup,'PASS');assert.equal(r.deploying_authorized,false);assert.equal(JSON.stringify(r).includes(token),false)
 assert.deepEqual(f.calls,['package','tag','session','login','push','readback','package','cleanup'])
})
test('missing scan, public or wrong repository package and existing tag cannot reach login/push',async()=>{
 for(const bad of ['scan','public','repository','tag']){const f=fixture();if(bad==='scan')f.scan.result='FAIL';if(bad==='public')f.pkg.visibility='public';if(bad==='repository')f.pkg.repository.full_name='other/repo';if(bad==='tag')f.ports.readTag=async()=>f.raw.requestedDigest;const r=await publishVerifiedImage(f);assert.equal(r.result,'FAIL');assert.equal(r.publication,'NOT_ATTEMPTED');assert.equal(f.calls.includes('session'),false);assert.equal(f.calls.includes('push'),false)}
})
test('login and uncertain push errors always clean credentials and redact arbitrary exception text',async()=>{
 for(const step of ['login','push']){const f=fixture();f.ports.createSession=async()=>({login:async()=>{if(step==='login')throw Error(token)},push:async()=>{throw Error(token)},cleanup:async()=>{f.calls.push('cleanup')}});const r=await publishVerifiedImage(f);assert.equal(r.result,'FAIL');assert.equal(r.credential_cleanup,'PASS');assert.equal(r.publication,step==='push'?'OUTCOME_UNKNOWN':'NOT_ATTEMPTED');assert.equal(JSON.stringify(r).includes(token),false);assert.equal(f.calls.at(-1),'cleanup')}
})
test('changed bytes or changed post-push visibility fail with truthful partial publication and cleanup',async()=>{
 for(const kind of ['bytes','visibility','image']){const f=fixture();if(kind==='bytes')f.raw.manifestBytes=Buffer.concat([f.raw.manifestBytes,Buffer.from(' ')]);if(kind==='image'){f.imageConfigDigest='sha256:'+'9'.repeat(64);f.scan.image=f.imageConfigDigest}if(kind==='visibility'){let n=0;f.ports.readPackage=async()=>++n===1?f.pkg:{...f.pkg,visibility:'public'}}const r=await publishVerifiedImage(f);assert.equal(r.result,'FAIL');assert.equal(r.publication,'PUSH_SUCCEEDED_NOT_YET_VERIFIED');assert.equal(r.receipt,null);assert.equal(r.credential_cleanup,'PASS')}
})
test('credential cleanup failure prevents PASS after verified remote publication, without deleting remote data',async()=>{
 const f=fixture(),create=f.ports.createSession;f.ports.createSession=async()=>({...await create(),cleanup:async()=>{throw Error(token)}});const r=await publishVerifiedImage(f);assert.equal(r.result,'FAIL');assert.equal(r.publication,'VERIFIED_PRIVATE_DIGEST');assert.equal(r.credential_cleanup,'FAIL');assert.equal(r.deploying_authorized,false);assert.equal(JSON.stringify(r).includes(token),false)
})
test('ordinary execution cannot create a Docker auth directory or receive credentials',async()=>{
 await assert.rejects(()=>createDockerPublishSession({imageConfigDigest:'sha256:'+'a'.repeat(64),actor:'synthetic',env:{}}),/MANUAL_CI_SESSION_REQUIRED/)
})
test('Docker protocol uses stdin only and removes the credential config even after a failed login',async()=>{
 const f=fixture(),commands=[];let stored=false,removed=false
 f.ports.createSession=async()=>dockerSessionActions({imageConfigDigest:f.imageConfigDigest,actor:'synthetic',command(args,input){commands.push(args);if(args[0]==='login'){assert.equal(input,token+'\n');stored=true;throw Error(token)}return''},removeConfig:async()=>{stored=false;removed=true}})
 const r=await publishVerifiedImage(f);assert.equal(r.result,'FAIL');assert.equal(r.credential_cleanup,'PASS');assert.equal(stored,false);assert.equal(removed,true);assert.equal(JSON.stringify(commands).includes(token),false);assert.deepEqual(commands.map(c=>c[0]),['login','logout'])
})
test('Docker logout failure still removes credentials, while removal failure never reports cleanup PASS',async()=>{
 for(const mode of ['logout','remove']){const f=fixture();let removed=false
  f.ports.createSession=async()=>dockerSessionActions({imageConfigDigest:f.imageConfigDigest,actor:'synthetic',command(args){if(args[0]==='image'&&args[1]==='inspect')return f.imageConfigDigest;if(args[0]==='logout'&&mode==='logout')throw Error(token);return''},removeConfig:async()=>{if(mode==='remove')throw Error(token);removed=true}})
  const r=await publishVerifiedImage(f);assert.equal(r.result,'FAIL');assert.equal(r.publication,'VERIFIED_PRIVATE_DIGEST');assert.equal(r.credential_cleanup,'FAIL');assert.equal(removed,mode==='logout');assert.equal(JSON.stringify(r).includes(token),false)
 }
})
test('changed local image cannot be tagged or pushed and credentials are cleaned',async()=>{
 const f=fixture(),commands=[];let removed=false
 f.ports.createSession=async()=>dockerSessionActions({imageConfigDigest:f.imageConfigDigest,actor:'synthetic',command(args){commands.push(args);if(args[0]==='image'&&args[1]==='inspect')return'sha256:'+'9'.repeat(64);return''},removeConfig:async()=>{removed=true}})
 const r=await publishVerifiedImage(f);assert.equal(r.result,'FAIL');assert.equal(r.publication,'OUTCOME_UNKNOWN');assert.equal(removed,true);assert.equal(commands.some(args=>args[0]==='push'||args[1]==='tag'),false)
})
test('changing the local alias after inspection cannot change the image selected for tagging',async()=>{
 const f=fixture(),bad='sha256:'+'9'.repeat(64),reference=imageTag(f.expected.source,f.expected.public_build_sha256);let alias=f.imageConfigDigest,destination,pushed
 f.ports.createSession=async()=>dockerSessionActions({imageConfigDigest:f.imageConfigDigest,actor:'synthetic',command(args){
  if(args[0]==='image'&&args[1]==='inspect'){const value=args[2]===reference?destination:args[2]===f.imageConfigDigest?f.imageConfigDigest:alias;alias=bad;return value}
  if(args[0]==='image'&&args[1]==='tag')destination=args[2]===f.imageConfigDigest?f.imageConfigDigest:alias
  if(args[0]==='push')pushed=destination
  return''
 },removeConfig:async()=>{}})
 const result=await publishVerifiedImage(f);assert.equal(pushed,f.imageConfigDigest);assert.equal(result.result,'PASS')
})
test('a changed destination tag is rejected before any push',async()=>{
 const f=fixture(),reference=imageTag(f.expected.source,f.expected.public_build_sha256);let pushed=false,tagged=false
 f.ports.createSession=async()=>dockerSessionActions({imageConfigDigest:f.imageConfigDigest,actor:'synthetic',command(args){
  if(args[0]==='image'&&args[1]==='inspect')return args[2]===reference&&tagged?'sha256:'+'9'.repeat(64):f.imageConfigDigest
  if(args[0]==='image'&&args[1]==='tag')tagged=true
  if(args[0]==='push')pushed=true
  return''
 },removeConfig:async()=>{}})
 const result=await publishVerifiedImage(f);assert.equal(result.result,'FAIL');assert.equal(pushed,false);assert.equal(result.credential_cleanup,'PASS')
})
