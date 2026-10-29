import {spawnSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdtempSync,lstatSync,appendFileSync} from 'node:fs'
import {chmod,mkdtemp,readdir,realpath,rm,access,lstat} from 'node:fs/promises'
import {join,resolve,sep,isAbsolute} from 'node:path'
import {fileURLToPath} from 'node:url'
import {imageRepository} from './contract.mjs'
import {sourceRepository} from './publisher.mjs'
import {buildCandidateLayoutV1,candidateTag} from './candidate-build.mjs'
import {verifyOciLayoutV1} from './oci-layout.mjs'
import {createCraneSession} from './crane-session.mjs'
import {createGhcrReadTransport} from './ghcr-read-transport.mjs'
import {publishCandidateV1} from './publish-driver.mjs'
import {prefetchComposeImageV1} from './compose-pull-session.mjs'
import {bootstrapPrivatePackageV1} from './bootstrap-private-package.mjs'
import {bootstrapPortsV1} from './bootstrap-transport.mjs'
import {scanResultV1,ghAttestationVerifyV1,anonymousProbeV1,privacyResultV1} from './candidate-verifiers.mjs'
import {localDockerCallV1,runnerDockerSocketV1} from '../asier_staging_network/local-docker.mjs'

const publicNames=['NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
const codes=/^(BOOTSTRAP_|SOURCE_|TREE_|LAB_TAG|IMAGE_|LAYOUT_|OCI_|STAGING_|CANDIDATE_|PROVENANCE_|SCAN_|GHCR_|PULL_|PUBLISH_)[A-Z0-9_]*$/

/** Protected manual job only. The run's own commit must be the reviewed source,
 * so the Sigstore certificate's source digest is the built source, and the
 * protected environment must carry the same owner-approved SHA (two keys).
 */
export function publishGateV1(env){
 const source=env.REVIEWED_SOURCE_SHA
 if(process.platform!=='linux'||env.CI!=='true'||env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_REPOSITORY!==sourceRepository||env.RUNNER_ENVIRONMENT!=='github-hosted'||env.RUNNER_OS!=='Linux'||typeof env.RUNNER_TEMP!=='string'||!isAbsolute(env.RUNNER_TEMP))throw Error('PUBLISH_PROTECTED_DISPATCH_REQUIRED')
 if(!/^[a-f0-9]{40}$/.test(source??'')||env.GITHUB_SHA!==source||env.STAGING_IMAGE_APPROVED_SOURCE!==source)throw Error('PUBLISH_SOURCE_NOT_APPROVED')
 return source
}
const statePath=env=>join(resolve(env.RUNNER_TEMP),'crm-candidate-state.json')
function dockerCaller(env,config){const docker=localDockerCallV1(env,config);return (bin,args,options={})=>bin==='docker'?docker(args,{maxBuffer:16*1024*1024,timeout:25*60*1000,...options}):spawnSync(bin,args,{encoding:'utf8',maxBuffer:16*1024*1024,timeout:15*60*1000,...options})}

export async function buildPhase(env=process.env){
 const source=publishGateV1(env),temp=resolve(env.RUNNER_TEMP)
 if(!lstatSync('/var/run/docker.sock').isSocket())throw Error('PUBLISH_LOCAL_SOCKET_REQUIRED')
 // Browser-public values only (repository variables). Never logged or stored.
 const bindings=Object.fromEntries(publicNames.map(name=>[name,env['STAGING_PUBLIC_'+name.slice('NEXT_PUBLIC_'.length)]]))
 const own=prefix=>mkdtempSync(join(temp,prefix))
 const candidate=await buildCandidateLayoutV1({source,bindings,call:dockerCaller(env,own('crm-docker-publish-')),own})
 if(candidate.scan?.result!=='PASS')throw Error('SCAN_RESULT_INVALID')
 const scanPath=join(own('crm-candidate-scan-'),'scan.json');writeFileSync(scanPath,candidate.scanBytes,{flag:'wx'})
 const manifestDigest=candidate.verified.evidence.manifest_digest,manifestBlob=join(candidate.layout,'blobs','sha256',manifestDigest.slice(7))
 writeFileSync(statePath(env),JSON.stringify({expected:candidate.expected,image_config_digest:candidate.imageConfigDigest,manifest_digest:manifestDigest,layout:candidate.layout,scan:scanPath,manifest_blob:manifestBlob})+'\n',{flag:'wx'})
 appendFileSync(env.GITHUB_OUTPUT,`subject_digest=${manifestDigest}\nmanifest_blob=${manifestBlob}\n`)
 return {result:'BUILT_NOT_PUBLISHED',expected:candidate.expected,image_config_digest:candidate.imageConfigDigest,manifest_digest:manifestDigest,scan:'PASS'}
}

export async function publishPhase(env=process.env){
 const source=publishGateV1(env),temp=resolve(env.RUNNER_TEMP)
 const state=JSON.parse(readFileSync(statePath(env),'utf8'))
 const inside=path=>typeof path==='string'&&resolve(path).startsWith(temp+sep)
 if(state.expected?.source!==source||![state.layout,state.scan,state.manifest_blob,env.BUNDLE_PATH,env.CRANE_BIN].every(inside))throw Error('PUBLISH_STATE_INVALID')
 // Re-verify bytes between steps: the attested digest must still be the layout.
 const verified=await verifyOciLayoutV1({root:state.layout,expected:state.expected})
 if(verified.evidence.manifest_digest!==state.manifest_digest||verified.evidence.image_config_digest!==state.image_config_digest)throw Error('LAYOUT_CHANGED_AFTER_ATTESTATION')
 const token=env.GH_TOKEN,actor=env.GITHUB_ACTOR,transport=createGhcrReadTransport({token,actor})
 const scanBytes=readFileSync(state.scan)
 const ports={
  authorizePublication:async expected=>expected.source===source,
  readSource:async()=>({source,tree:state.expected.tree,lockfileBytes:readFileSync('package-lock.json'),dockerfileBytes:readFileSync('infra/deployment/Dockerfile'),publicValues:Object.fromEntries(publicNames.map(name=>[name,env['STAGING_PUBLIC_'+name.slice('NEXT_PUBLIC_'.length)]]))}),
  readEvidence:async()=>({image:verified.image,scanBytes,provenanceBytes:readFileSync(env.BUNDLE_PATH)}),
  verifyEvidence:async({subjects})=>{scanResultV1(JSON.parse(scanBytes.toString('utf8')),subjects);ghAttestationVerifyV1({gh:env.GH_BIN,artifactPath:state.manifest_blob,bundlePath:env.BUNDLE_PATH,subjects,env});return {...subjects}},
  publisher:{...transport,createSession:()=>createCraneSession({repository:imageRepository,layoutRoot:state.layout,manifestDigest:state.manifest_digest,crane:env.CRANE_BIN,env})}
 }
 const published=await publishCandidateV1({expected:state.expected,env,token,ports})
 const report={version:'staging.image.publication.report.v1',source,tree:state.expected.tree,result:'FAIL',publication:published.publication,credential_cleanup:published.credential_cleanup,manifest_digest:state.manifest_digest,published_manifest_digest:published.published_manifest_digest??published.receipt?.manifest_digest??null,privacy:'NOT_CHECKED',temporary_pull:'NOT_ATTEMPTED',receipt:null,deploying_authorized:false,error:published.error}
 if(published.result!=='PASS'||!published.receipt)return report
 try{
  const pkg=await transport.readPackage()
  privacyResultV1({packageVisibility:pkg?.visibility,authenticatedManifestStatus:200,...await anonymousProbeV1(published.receipt.manifest_digest)})
  report.privacy='PRIVATE_VERIFIED'
 }catch(error){report.privacy='NOT_VERIFIED';report.error=codes.test(error?.message??'')?error.message:'GHCR_PRIVACY_NOT_VERIFIED';return report}
 const pulled=await prefetchComposeImageV1({receipt:published.receipt,expected:state.expected,actor,token,env,ports:{
  authorizePull:async()=>true,
  assertLocalTarget:async socket=>socket===runnerDockerSocketV1&&lstatSync('/var/run/docker.sock').isSocket(),
  verifyReceipt:async receipt=>receipt.manifest_digest===state.manifest_digest&&receipt.image_config_digest===state.image_config_digest,
  readPackage:transport.readPackage,readImage:transport.readImage,
  createConfig:async parent=>{const path=await mkdtemp(join(parent,'crm-compose-pull-'));await chmod(path,0o700);const st=await lstat(path);return {path,realpath:await realpath(path),mode:st.mode&0o777,isDirectory:st.isDirectory(),isSymlink:st.isSymbolicLink(),empty:(await readdir(path)).length===0}},
  removeConfig:async path=>rm(path,{recursive:true}),
  configAbsent:async path=>{try{await access(path);return false}catch(error){return error?.code==='ENOENT'}},
  spawn:spawnSync}})
 report.temporary_pull=pulled.pull
 // The runner is discarded, but remove the pulled copy and the build tag anyway.
 const cleanup=dockerCaller(env,mkdtempSync(join(temp,'crm-docker-cleanup-')))
 cleanup('docker',['image','rm',published.receipt.image_reference]);cleanup('docker',['image','rm',candidateTag])
 if(pulled.result!=='PASS'){report.error=pulled.error;return report}
 report.result='PASS';report.receipt=published.receipt
 return report
}

// First creation of the private package with the pinned public seed only. Its own
// owner key (STAGING_IMAGE_BOOTSTRAP_APPROVED_SOURCE) cannot approve a candidate.
export async function bootstrapPhase(env=process.env){
 const source=publishGateV1({...env,STAGING_IMAGE_APPROVED_SOURCE:env.STAGING_IMAGE_BOOTSTRAP_APPROVED_SOURCE}),temp=await realpath(resolve(env.RUNNER_TEMP))
 if(!inside(temp,env.CRANE_BIN))throw Error('PUBLISH_STATE_INVALID')
 const anonymous=await mkdtemp(join(temp,'crm-crane-anon-')),auth=await mkdtemp(join(temp,'crm-crane-auth-'));await chmod(auth,0o700)
 const crane=(args,{auth:useAuth=false,input}={})=>{const folder=useAuth?auth:anonymous;const r=spawnSync(env.CRANE_BIN,args,{env:{PATH:env.PATH,HOME:folder,DOCKER_CONFIG:folder},encoding:'utf8',timeout:20*60*1000,maxBuffer:1024*1024,input,shell:false});if(r.status!==0)throw Error('BOOTSTRAP_CRANE_FAILED');return args[0]==='config'?r.stdout:r.stdout.trim()}
 const removed=async folder=>{await rm(folder,{recursive:true});try{await access(folder)}catch(error){if(error?.code==='ENOENT')return;throw error}throw Error('STAGING_AUTH_DIRECTORY_REMAINS')}
 try{
  const ports=bootstrapPortsV1({reviewedSource:source,approvedSource:env.STAGING_IMAGE_BOOTSTRAP_APPROVED_SOURCE,token:env.GH_TOKEN,actor:env.GITHUB_ACTOR,crane,openAuth:async()=>{},closeAuth:async()=>removed(auth)})
  return await bootstrapPrivatePackageV1({reviewedSource:source,env,token:env.GH_TOKEN,ports})
 }finally{await rm(anonymous,{recursive:true,force:true});await rm(auth,{recursive:true,force:true})}
}
const inside=(root,path)=>typeof path==='string'&&resolve(path).startsWith(root+sep)

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const phase=process.argv[2],env=process.env
 try{
  const report=phase==='build'?await buildPhase(env):phase==='publish'?await publishPhase(env):phase==='bootstrap'?await bootstrapPhase(env):(()=>{throw Error('PUBLISH_PHASE_INVALID')})()
  console.log(JSON.stringify(report))
  if(phase==='publish'){writeFileSync(join(resolve(env.RUNNER_TEMP),'staging-image-publication.safe.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});if(report.receipt)writeFileSync(join(resolve(env.RUNNER_TEMP),'staging-image-receipt.json'),JSON.stringify(report.receipt,null,2)+'\n',{flag:'wx'})}
  if(phase==='build'?report.result!=='BUILT_NOT_PUBLISHED':report.result!=='PASS')process.exitCode=1
 }catch(error){console.error(JSON.stringify({result:'FAIL',phase,error:codes.test(error?.message??'')?error.message:'PUBLISH_SAFE_FAILURE'}));process.exitCode=1}
}
