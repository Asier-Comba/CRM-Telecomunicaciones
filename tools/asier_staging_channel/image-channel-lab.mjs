import {spawn,spawnSync} from 'node:child_process'
import {readFileSync,writeFileSync,lstatSync,mkdtempSync,rmSync,existsSync,readdirSync} from 'node:fs'
import {join,resolve,sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import {digest,imageTag,publicBuildIdentity} from './contract.mjs'
import {registryImageEvidence} from './oci-evidence.mjs'
import {verifyOciLayoutV1,labReceiptV1} from './oci-layout.mjs'
import {createCraneSession,labRepository} from './crane-session.mjs'
import {dockerObjectAbsent} from './runtime-lab.mjs'
import {stagingEasyPanelOriginV1,stagingSupabaseUrlV1} from '../../src/lib/server/product-staging-admission-v1.ts'
import {localDockerCallV1} from '../asier_staging_network/local-docker.mjs'

const labels={source:'org.opencontainers.image.revision',tree:'io.crm.source.tree',lockfile_sha256:'io.crm.lockfile.sha256',dockerfile_sha256:'io.crm.dockerfile.sha256',public_build_sha256:'io.crm.public-build.sha256'}
const errors=['SOURCE_MISMATCH','SOURCE_DIRTY','TREE_INVALID','HOSTED_RUNNER_LOCAL_SOCKET_REQUIRED','ALTERNATIVE_ENGINE_SELECTION_FORBIDDEN','LAB_TAG_EXISTS_OR_ABSENCE_UNPROVEN','IMAGE_BUILD_FAILED','IMAGE_INSPECT_FAILED','IMAGE_SAVE_FAILED','LAYOUT_CONFIG_NOT_BUILT_IMAGE','REGISTRY_UNAVAILABLE','REGISTRY_TAG_EXISTS_OR_UNKNOWN','REGISTRY_READBACK_FAILED','REGISTRY_DIGEST_CHANGED','LOCAL_IMAGE_REMOVAL_FAILED','PULL_BY_DIGEST_FAILED','PULLED_IMAGE_MISMATCH','CRANE_REQUIRED']

async function registry(path,options={}){
 const response=await fetch('http://127.0.0.1:5055'+path,{redirect:'error',signal:AbortSignal.timeout(10000),...options})
 return {status:response.status,digest:response.headers.get('docker-content-digest'),bytes:Buffer.from(await response.arrayBuffer())}
}
const manifestAccept={Accept:'application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json'}

/** Fresh disposable pull_request runner only: REAL build of the existing
 * Dockerfile, real OCI layout/layer verification, real image scan, real
 * digest-preserving push to a loopback registry, readback and pull by digest.
 * Never GHCR, never credentials, never a consumable receipt or deployment.
 */
export async function runImageChannelLab(env=process.env){
 if(process.platform!=='linux'||env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='pull_request'||env.GITHUB_REPOSITORY!=='Asier-Comba/CRM-Telecomunicaciones'||!env.RUNNER_TEMP||!/^[a-f0-9]{40}$/.test(env.EXPECTED_SOURCE??''))throw Error('IMAGE_CHANNEL_LAB_NOT_AUTHORIZED')
 const result={contract:'staging.image.channel.lab.v1',scope:'LAB_ONLY_SYNTHETIC_PUBLIC_BINDINGS_LOCAL_REGISTRY',status:'FAIL',source:env.EXPECTED_SOURCE,tree:null,identity:null,tools:{},build:false,image_config_digest:null,layout_verified:false,layers:null,scan:null,registry_push:'NOT_ATTEMPTED',registry_manifest_digest:null,digest_preserved:false,overwrite_guard:false,pull_by_digest:false,receipt:null,ghcr_contacted:false,credentials_used:false,published:false,deployed:false,cleanup:false,error:null}
 const temp=resolve(env.RUNNER_TEMP),owned=[]
 const own=prefix=>{const path=mkdtempSync(join(temp,prefix));owned.push(path);return path}
 let dockerCall,registryProcess,built=false,pulledReference=null
 const tag='crm-w5-package:test'
 const call=(bin,args,options={})=>bin==='docker'?dockerCall(args,{maxBuffer:16*1024*1024,timeout:25*60*1000,...options}):spawnSync(bin,args,{encoding:'utf8',maxBuffer:16*1024*1024,timeout:15*60*1000,...options})
 try{
  const crane=env.CRANE_BIN
  if(typeof crane!=='string'||!crane.startsWith(temp+sep)||!existsSync(crane))throw Error('CRANE_REQUIRED')
  const head=call('git',['rev-parse','HEAD']);if(head.status!==0||head.stdout.trim()!==env.EXPECTED_SOURCE)throw Error('SOURCE_MISMATCH')
  if(call('git',['status','--porcelain','--untracked-files=no']).stdout!=='')throw Error('SOURCE_DIRTY')
  result.tree=call('git',['rev-parse','HEAD^{tree}']).stdout.trim();if(!/^[a-f0-9]{40}$/.test(result.tree))throw Error('TREE_INVALID')
  localDockerCallV1(env,join(temp,'crm-docker-selection-preflight'))
  if(env.RUNNER_ENVIRONMENT!=='github-hosted'||env.RUNNER_OS!=='Linux'||!lstatSync('/var/run/docker.sock').isSocket())throw Error('HOSTED_RUNNER_LOCAL_SOCKET_REQUIRED')
  dockerCall=localDockerCallV1(env,own('crm-docker-lab-'))
  result.tools={docker:call('docker',['version','--format','{{.Server.Version}}']).stdout.trim(),storage_driver:call('docker',['info','--format','{{.Driver}}']).stdout.trim(),crane:spawnSync(crane,['version'],{encoding:'utf8'}).stdout.trim()}
  // Synthetic publishable key: this image can never match a real public build.
  const bindings={NEXT_PUBLIC_APP_URL:stagingEasyPanelOriginV1,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only'}
  const expected={source:env.EXPECTED_SOURCE,tree:result.tree,lockfile_sha256:digest(readFileSync('package-lock.json')),dockerfile_sha256:digest(readFileSync('infra/deployment/Dockerfile')),public_build_sha256:publicBuildIdentity(bindings)}
  result.identity=expected
  if(!dockerObjectAbsent(call('docker',['image','inspect',tag]),'image',tag))throw Error('LAB_TAG_EXISTS_OR_ABSENCE_UNPROVEN')
  built=true
  const build=call('docker',['build','--platform','linux/amd64','--provenance=false','--sbom=false','-f','infra/deployment/Dockerfile','-t',tag,...Object.entries(labels).flatMap(([field,label])=>['--label',label+'='+expected[field]]),...Object.entries(bindings).flatMap(([k,v])=>['--build-arg',k+'='+v]),'.'])
  if(build.status!==0)throw Error('IMAGE_BUILD_FAILED')
  result.build=true
  const id=call('docker',['image','inspect',tag,'--format','{{.Id}}']);if(id.status!==0)throw Error('IMAGE_INSPECT_FAILED')
  result.image_config_digest=id.stdout.trim()
  // Existing scanner/evidence gate, unchanged. A FAIL is recorded, never waived.
  const scan=call('node',['scripts/platform/image-scan.mjs'],{env:{...process.env}})
  try{result.scan=JSON.parse(scan.stdout.trim().split('\n').at(-1))}catch{result.scan={result:'FAIL',error:'IMAGE_SECURITY_SCAN_NOT_PROVEN'}}
  const archive=join(own('crm-oci-archive-'),'image.tar'),layout=own('crm-oci-layout-')
  if(call('docker',['image','save','--output',archive,tag]).status!==0||call('tar',['-xf',archive,'-C',layout,'--no-same-owner','--no-same-permissions']).status!==0)throw Error('IMAGE_SAVE_FAILED')
  rmSync(archive)
  const verified=await verifyOciLayoutV1({root:layout,expected})
  if(verified.evidence.image_config_digest!==result.image_config_digest)throw Error('LAYOUT_CONFIG_NOT_BUILT_IMAGE')
  result.layout_verified=true;result.layers=verified.layers.map(({digest,size,media_type})=>({digest,size,media_type}))
  registryProcess=spawn(crane,['registry','serve','--address','127.0.0.1:5055'],{stdio:'ignore',env:{PATH:env.PATH,HOME:own('crm-crane-home-')}})
  let ready=false
  for(let attempt=0;attempt<50&&!ready;attempt++){try{ready=(await registry('/v2/')).status===200}catch{await new Promise(r=>setTimeout(r,200))}}
  if(!ready)throw Error('REGISTRY_UNAVAILABLE')
  const reference=imageTag(expected.source,expected.public_build_sha256).replace('ghcr.io/asier-comba/crm-telecom-staging',labRepository)
  const path='/v2/crm-telecom-staging/manifests/'+reference.split(':').at(-1)
  // Same rule as the GHCR transport: only a definitive 404 means absent.
  if((await registry(path,{method:'HEAD',headers:manifestAccept})).status!==404)throw Error('REGISTRY_TAG_EXISTS_OR_UNKNOWN')
  result.overwrite_guard=true
  const session=await createCraneSession({repository:labRepository,layoutRoot:layout,manifestDigest:verified.evidence.manifest_digest,crane,env})
  result.registry_push='OUTCOME_UNKNOWN'
  try{await session.push(reference)}finally{await session.cleanup()}
  result.registry_push='PUSHED_NOT_YET_VERIFIED'
  const manifest=await registry(path,{headers:manifestAccept});if(manifest.status!==200)throw Error('REGISTRY_READBACK_FAILED')
  const config=await registry('/v2/crm-telecom-staging/blobs/'+JSON.parse(manifest.bytes).config.digest);if(config.status!==200)throw Error('REGISTRY_READBACK_FAILED')
  const readback=registryImageEvidence({manifestBytes:manifest.bytes,configBytes:config.bytes,requestedDigest:manifest.digest,expected})
  result.registry_manifest_digest=readback.manifest_digest
  if(readback.manifest_digest!==verified.evidence.manifest_digest||readback.image_config_digest!==result.image_config_digest)throw Error('REGISTRY_DIGEST_CHANGED')
  result.digest_preserved=true;result.registry_push='VERIFIED_LOCAL_DIGEST'
  // Remove every local copy so the pull must fetch the pushed bytes by digest.
  if(call('docker',['image','rm',tag]).status!==0||!dockerObjectAbsent(call('docker',['image','inspect',result.image_config_digest]),'image',result.image_config_digest))throw Error('LOCAL_IMAGE_REMOVAL_FAILED')
  built=false
  pulledReference=labRepository+'@'+readback.manifest_digest
  if(call('docker',['pull','--platform','linux/amd64',pulledReference]).status!==0)throw Error('PULL_BY_DIGEST_FAILED')
  const [pulled]=JSON.parse(call('docker',['image','inspect',pulledReference]).stdout)
  if(pulled?.Id!==result.image_config_digest||!pulled.RepoDigests?.includes(pulledReference))throw Error('PULLED_IMAGE_MISMATCH')
  result.pull_by_digest=true
  result.receipt=labReceiptV1({evidence:verified.evidence,layers:verified.layers,registryManifestDigest:readback.manifest_digest,pulledImageId:pulled.Id})
  result.status=result.scan?.result==='PASS'?'PASS':'FAIL'
  if(result.status!=='PASS')result.error='IMAGE_SCAN_NOT_PASS'
 }catch(error){result.error=errors.includes(error?.message)||/^(OCI_|STAGING_)/.test(error?.message??'')?error.message:'LAB_FAILED'}
 finally{
  let clean=true
  if(registryProcess){registryProcess.kill('SIGTERM')}
  if(dockerCall){
   if(pulledReference){const removed=call('docker',['image','rm',pulledReference]);clean&&=removed.status===0||dockerObjectAbsent(removed,'image',pulledReference)}
   if(built){const removed=call('docker',['image','rm',tag]);clean&&=removed.status===0||dockerObjectAbsent(removed,'image',tag)}
  }
  for(const path of owned){
   if(!resolve(path).startsWith(temp+sep)){clean=false;continue}
   // No login happened: an auths entry would be an unexpected credential write.
   if(/crm-docker-lab-/.test(path)&&existsSync(join(path,'config.json'))&&JSON.parse(readFileSync(join(path,'config.json'),'utf8')).auths&&Object.keys(JSON.parse(readFileSync(join(path,'config.json'),'utf8')).auths).length)clean=false
   try{rmSync(path,{recursive:true});if(existsSync(path))clean=false}catch{clean=false}
  }
  if(readdirSync(temp).some(name=>/^crm-crane-auth-/.test(name)))clean=false
  result.cleanup=clean
  if(!clean)result.status='FAIL'
  writeFileSync(join(temp,'staging-image-channel-lab.safe.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
 }
 return result
}
if(process.argv[1]===fileURLToPath(import.meta.url)){try{const r=await runImageChannelLab();console.log(JSON.stringify(r));if(r.status!=='PASS')process.exitCode=1}catch{console.error('IMAGE_CHANNEL_LAB_NOT_AUTHORIZED');process.exitCode=1}}
