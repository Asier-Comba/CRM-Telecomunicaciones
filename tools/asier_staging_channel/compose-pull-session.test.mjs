import test from 'node:test'
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
import {digest,imageRepository} from './contract.mjs'
import {prefetchComposeImageV1} from './compose-pull-session.mjs'
import {sourceRepository} from './publisher.mjs'

function fixture(){
 const bytes=value=>Buffer.from(JSON.stringify(value)),calls=[],token='SYNTHETIC_PULL_NEVER_LOGGED',parent=resolve('owned-pull-temp'),path=resolve(parent,'crm-compose-pull-owned')
 const expected={source:'a'.repeat(40),tree:'b'.repeat(40),lockfile_sha256:'c'.repeat(64),dockerfile_sha256:'d'.repeat(64),public_build_sha256:'e'.repeat(64)}
 const labels=Object.fromEntries(Object.entries({source:'org.opencontainers.image.revision',tree:'io.crm.source.tree',lockfile_sha256:'io.crm.lockfile.sha256',dockerfile_sha256:'io.crm.dockerfile.sha256',public_build_sha256:'io.crm.public-build.sha256'}).map(([key,name])=>[name,expected[key]]))
 const configBytes=bytes({architecture:'amd64',os:'linux',rootfs:{type:'layers',diff_ids:['sha256:'+'1'.repeat(64)]},config:{User:'65532:65532',WorkingDir:'/app',Entrypoint:['/nodejs/bin/node'],Cmd:['scripts/platform/entrypoint.mjs'],ExposedPorts:{'3000/tcp':{}},Env:['NODE_ENV=production','NEXT_TELEMETRY_DISABLED=1','HOSTNAME=0.0.0.0','PORT=3000','TZ=UTC'],Labels:labels}})
 const imageConfig='sha256:'+digest(configBytes),manifestBytes=bytes({schemaVersion:2,mediaType:'application/vnd.oci.image.manifest.v1+json',config:{mediaType:'application/vnd.oci.image.config.v1+json',digest:imageConfig,size:configBytes.length},layers:[{mediaType:'application/vnd.oci.image.layer.v1.tar+gzip',digest:'sha256:'+'2'.repeat(64),size:12}]})
 const image={manifestBytes,configBytes,requestedDigest:'sha256:'+digest(manifestBytes)},reference=imageRepository+'@'+image.requestedDigest
 const receipt={version:'staging.image.receipt.v1',...expected,image_config_digest:imageConfig,manifest_digest:image.requestedDigest,image_reference:reference,visibility:'private'}
 const pkg={name:'crm-telecom-staging',package_type:'container',visibility:'private',repository:{full_name:sourceRepository}}
 const config={path,realpath:path,mode:0o700,isDirectory:true,isSymlink:false,empty:true}
 const ports={authorizePull:async()=>true,assertLocalTarget:async()=>true,verifyReceipt:async()=>true,readPackage:async()=>pkg,readImage:async()=>image,createConfig:async()=>{calls.push('config');return config},removeConfig:async value=>{assert.equal(value,path);calls.push('remove')},configAbsent:async()=>true,spawn:(bin,args,options)=>{
  assert.equal(bin,'docker');assert.deepEqual(args.slice(0,4),['--host','unix:///var/run/docker.sock','--config',path]);assert.equal(options.shell,false);assert.deepEqual(Object.keys(options.env).sort(),['HOME','LANG','LC_ALL','PATH','TMPDIR'])
  const command=args.slice(4);calls.push(command)
  if(command[0]==='login'){assert.equal(options.input,token+'\n');assert.equal(JSON.stringify(args).includes(token),false)}
  if(command[0]==='image')return{status:0,stdout:JSON.stringify({Id:imageConfig,Os:'linux',Architecture:'amd64',RepoDigests:[reference]}),stderr:''}
  return{status:0,stdout:'',stderr:''}
 }}
 return{receipt,expected,actor:'synthetic',token,env:{PATH:'synthetic-path',RUNNER_TEMP:parent,GITHUB_TOKEN:'excluded'},ports,calls,pkg,image,config}
}
test('prefetch uses exact digest stdin-only login local socket own config and never executes Compose',async()=>{
 const f=fixture(),result=await prefetchComposeImageV1(f)
 assert.equal(result.result,'PASS');assert.equal(result.pull,'VERIFIED_LOCAL_DIGEST');assert.equal(result.image_reference,f.receipt.image_reference);assert.equal(result.credential_cleanup,'PASS');assert.equal(result.deploying_authorized,false)
 assert.deepEqual(f.calls.filter(Array.isArray).map(args=>args[0]),['login','pull','image','logout'])
 assert.deepEqual(f.calls.find(args=>Array.isArray(args)&&args[0]==='pull'),['pull','--platform','linux/amd64',f.receipt.image_reference]);assert.equal(f.calls.at(-1),'remove');assert.equal(JSON.stringify(result).includes(f.token),false)
})
test('unsigned receipts remote selectors and unauthorized targets cannot create credentials or call Docker',async()=>{
 for(const kind of ['receipt','selector','authorize','target','signature','privacy','registry']){
  const f=fixture();if(kind==='receipt')f.receipt.image_reference=imageRepository+':latest';if(kind==='selector')f.env.DOCKER_HOST='tcp://unapproved.invalid:2375';if(kind==='authorize')f.ports.authorizePull=async()=>false;if(kind==='target')f.ports.assertLocalTarget=async()=>false;if(kind==='signature')f.ports.verifyReceipt=async()=>false;if(kind==='privacy')f.pkg.visibility='public';if(kind==='registry')f.image.requestedDigest='sha256:'+'f'.repeat(64)
  assert.equal((await prefetchComposeImageV1(f)).result,'FAIL');assert.deepEqual(f.calls,[])
 }
})
test('foreign config path is never used or removed; unsafe permissions fail without login',async()=>{
 for(const kind of ['path','mode','symlink']){
  const f=fixture();if(kind==='path')f.config.path=resolve('outside-ownership');if(kind==='mode')f.config.mode=0o777;if(kind==='symlink')f.config.isSymlink=true
  const result=await prefetchComposeImageV1(f);assert.equal(result.result,'FAIL');assert.equal(f.calls.some(Array.isArray),false)
  if(kind!=='mode')assert.equal(f.calls.includes('remove'),false)
 }
})
test('failed login and partial pull always attempt logout and independent config removal',async()=>{
 for(const stage of ['login','pull','logout']){
  const f=fixture(),spawn=f.ports.spawn
  f.ports.spawn=(bin,args,options)=>{const result=spawn(bin,args,options);return args[4]===stage?{status:1,stdout:'',stderr:f.token}:result}
  const result=await prefetchComposeImageV1(f);assert.equal(result.result,'FAIL');assert.equal(f.calls.includes('remove'),true);assert.equal(f.calls.some(args=>Array.isArray(args)&&args[0]==='logout'),true);assert.equal(JSON.stringify(result).includes(f.token),false)
  if(stage==='pull')assert.equal(result.pull,'OUTCOME_UNKNOWN');if(stage==='logout')assert.equal(result.credential_cleanup,'FAIL')
 }
})
test('wrong local digest post-pull privacy changes or unconfirmed config absence never yield PASS',async()=>{
 for(const kind of ['image','privacy','remove','readback']){
  const f=fixture(),spawn=f.ports.spawn
  if(kind==='image')f.ports.spawn=(bin,args,options)=>args[4]==='image'?{status:0,stdout:JSON.stringify({Id:'sha256:'+'f'.repeat(64),Os:'linux',Architecture:'amd64',RepoDigests:[f.receipt.image_reference]}),stderr:''}:spawn(bin,args,options)
  if(kind==='privacy'){let count=0;f.ports.readPackage=async()=>++count===1?f.pkg:{...f.pkg,visibility:'public'}}
  if(kind==='remove')f.ports.removeConfig=async()=>{throw Error(f.token)}
  if(kind==='readback')f.ports.configAbsent=async()=>false
  const result=await prefetchComposeImageV1(f);assert.equal(result.result,'FAIL');assert.equal(result.deploying_authorized,false);assert.equal(JSON.stringify(result).includes(f.token),false)
 }
})

test('mutable config-port metadata cannot redirect credential cleanup after login',async()=>{
 const f=fixture(),spawn=f.ports.spawn
 f.ports.spawn=(bin,args,options)=>{const result=spawn(bin,args,options);if(args[4]==='login')f.config.path=resolve('outside-ownership');return result}
 const result=await prefetchComposeImageV1(f)
 assert.equal(result.result,'PASS');assert.equal(result.credential_cleanup,'PASS');assert.equal(f.calls.at(-1),'remove')
})
