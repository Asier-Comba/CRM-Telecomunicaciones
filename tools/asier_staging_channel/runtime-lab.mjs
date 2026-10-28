import {spawnSync} from 'node:child_process'
import {readFileSync,writeFileSync,lstatSync,mkdtempSync,rmSync} from 'node:fs'
import {join,resolve,sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createPublicBuildBinding} from '../../scripts/platform/build-binding.mjs'
import {stagingEasyPanelOriginV1,stagingSupabaseUrlV1} from '../../src/lib/server/product-staging-admission-v1.ts'
import {localDockerCallV1} from '../asier_staging_network/local-docker.mjs'
export function dockerObjectAbsent(result,kind,name){
 if(result.status!==1||typeof result.stderr!=='string')return false
 return [`Error: No such ${kind}: ${name}`,`Error response from daemon: No such ${kind}: ${name}`,`Error: No such object: ${name}`,`Error response from daemon: No such object: ${name}`].includes(result.stderr.trim())
}
export function cleanupRuntimeLab({built,attempted,runAttempted,tag,container},call){
 let clean=true
 if(runAttempted){const removed=call('docker',['container','rm','-f',container]);clean=removed.status===0||dockerObjectAbsent(removed,'container',container)}
 const imageClean=built?call('docker',['image','rm',tag]).status===0:!attempted
 return clean&&imageClean
}

// Fresh disposable Actions runner only. No registry login/push or hosted action.
export function runRuntimeLab(env=process.env){
 if(process.platform!=='linux'||env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='pull_request'||env.GITHUB_REPOSITORY!=='Asier-Comba/CRM-Telecomunicaciones'||!env.RUNNER_TEMP||!/^[a-f0-9]{40}$/.test(env.EXPECTED_SOURCE??''))throw Error('RUNTIME_LAB_NOT_AUTHORIZED')
 const result={contract:'staging.runtime.lab.v1',scope:'LAB_ONLY_PROPOSED_POLICY_NEGATIVE',status:'FAIL',source:env.EXPECTED_SOURCE,tree:null,image_id:null,build:false,nonroot:false,official_entrypoint:false,proposed_policy_denied:false,helper_roles_denied:{ingress:false,egress:false},published:false,deployed:false,cleanup:false,error:null}
 let dockerConfig,dockerCall
 const call=(bin,args)=>bin==='docker'?dockerCall(args,{maxBuffer:16*1024*1024,timeout:15*60*1000}):spawnSync(bin,args,{encoding:'utf8',maxBuffer:16*1024*1024,timeout:10000})
 const tag='crm-runtime-lab:'+env.EXPECTED_SOURCE
 let built=false,attempted=false,runAttempted=false
 const container='crm-runtime-lab-'+env.EXPECTED_SOURCE
 try{
  const head=call('git',['rev-parse','HEAD']);if(head.status!==0||head.stdout.trim()!==env.EXPECTED_SOURCE)throw Error('SOURCE_MISMATCH')
  localDockerCallV1(env,join(env.RUNNER_TEMP,'crm-docker-selection-preflight'))
  if(env.RUNNER_ENVIRONMENT!=='github-hosted'||env.RUNNER_OS!=='Linux'||!lstatSync('/var/run/docker.sock').isSocket())throw Error('HOSTED_RUNNER_LOCAL_SOCKET_REQUIRED')
  dockerConfig=mkdtempSync(join(resolve(env.RUNNER_TEMP),'crm-docker-runtime-'));dockerCall=localDockerCallV1(env,dockerConfig)
  result.tree=call('git',['rev-parse','HEAD^{tree}']).stdout.trim();if(!/^[a-f0-9]{40}$/.test(result.tree))throw Error('TREE_INVALID')
  if(JSON.parse(readFileSync('infra/platform/product-staging-runtime-policy.json','utf8')).status!=='PROPOSED')throw Error('LAB_REQUIRES_PROPOSED_POLICY')
  if(!dockerObjectAbsent(call('docker',['image','inspect',tag]),'image',tag))throw Error('LAB_TAG_EXISTS_OR_ABSENCE_UNPROVEN')
  const bindings={NEXT_PUBLIC_APP_URL:stagingEasyPanelOriginV1,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only'}
  result.public_build_sha256=createPublicBuildBinding(bindings).public_sha256
  attempted=true
  const build=call('docker',['build','--platform','linux/amd64','-f','infra/deployment/Dockerfile','-t',tag,...Object.entries(bindings).flatMap(([k,v])=>['--build-arg',k+'='+v]),'.'])
  if(build.status!==0)throw Error('IMAGE_BUILD_FAILED')
  built=true;result.build=true
  const inspected=call('docker',['image','inspect',tag]);if(inspected.status!==0)throw Error('IMAGE_INSPECT_FAILED')
  const [image]=JSON.parse(inspected.stdout)
  if(image.Os!=='linux'||image.Architecture!=='amd64'||image.Config.User!=='65532:65532')throw Error('IMAGE_PLATFORM_OR_USER_INVALID')
  result.nonroot=true;result.image_id=image.Id
  if(JSON.stringify(image.Config.Entrypoint)!=='["/nodejs/bin/node"]'||JSON.stringify(image.Config.Cmd)!=='["scripts/platform/entrypoint.mjs"]'||image.Config.WorkingDir!=='/app')throw Error('OFFICIAL_ENTRYPOINT_REQUIRED')
  result.official_entrypoint=true
  const runtime={...bindings,PLATFORM_TARGET:'STAGING',APP_ENV:'staging',PRODUCT_V1_ENABLED:'true',PRODUCT_V1_ORIGIN:stagingEasyPanelOriginV1,PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_PRIVATE_EGRESS_ENABLED:'true',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001',BACKUP_RETENTION_DAYS:'7'}
  if(!dockerObjectAbsent(call('docker',['container','inspect',container]),'container',container))throw Error('LAB_CONTAINER_EXISTS_OR_ABSENCE_UNPROVEN')
  runAttempted=true
  const denied=call('docker',['run','--name',container,'--rm','--network','none','--memory','256m','--cpus','1',...Object.entries(runtime).flatMap(([k,v])=>['--env',k+'='+v]),image.Id])
  if(denied.status!==1||!denied.stderr.includes('HOSTED_PRODUCT_RUNTIME_NOT_ACCEPTED')||denied.stderr.includes('MODULE_NOT_FOUND')||denied.stderr.includes('ENVIRONMENT_INVALID'))throw Error('PROPOSED_POLICY_NOT_CORRECTLY_DENIED')
  result.proposed_policy_denied=true
  for(const role of ['ingress','egress']){
   if(!dockerObjectAbsent(call('docker',['container','inspect',container]),'container',container))throw Error('LAB_CONTAINER_EXISTS_OR_ABSENCE_UNPROVEN')
   const helper=call('docker',['run','--name',container,'--rm','--network','none','--memory','256m','--cpus','1',...Object.entries(runtime).flatMap(([k,v])=>['--env',k+'='+v]),image.Id,'tools/asier_staging_network/runtime.mjs',role])
   if(helper.status!==1||!helper.stderr.split(/\r?\n/).includes('GATEWAY_RUNTIME_ADMISSION_DENIED')||/MODULE_NOT_FOUND/.test(helper.stderr))throw Error('HELPER_POLICY_NOT_CORRECTLY_DENIED')
   result.helper_roles_denied[role]=true
  }
  result.status='PASS'
 }catch(error){const allowed=['SOURCE_MISMATCH','TREE_INVALID','LAB_REQUIRES_PROPOSED_POLICY','LAB_TAG_EXISTS_OR_ABSENCE_UNPROVEN','LAB_CONTAINER_EXISTS_OR_ABSENCE_UNPROVEN','IMAGE_BUILD_FAILED','IMAGE_INSPECT_FAILED','IMAGE_PLATFORM_OR_USER_INVALID','OFFICIAL_ENTRYPOINT_REQUIRED','PROPOSED_POLICY_NOT_CORRECTLY_DENIED','HELPER_POLICY_NOT_CORRECTLY_DENIED','ALTERNATIVE_ENGINE_SELECTION_FORBIDDEN','HOSTED_RUNNER_LOCAL_SOCKET_REQUIRED'];result.error=allowed.includes(error?.message)?error.message:'LAB_FAILED'}
 finally{
  result.cleanup=cleanupRuntimeLab({built,attempted,runAttempted,tag,container},call)
  if(dockerConfig){const parent=resolve(env.RUNNER_TEMP),target=resolve(dockerConfig);if(!target.startsWith(parent+sep)||!target.slice(parent.length+1).startsWith('crm-docker-runtime-'))result.cleanup=false;else try{rmSync(target,{recursive:true})}catch{result.cleanup=false}}
  if(!result.cleanup)result.status='FAIL'
  writeFileSync(join(env.RUNNER_TEMP,'staging-runtime-lab.safe.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
 }
 return result
}
if(process.argv[1]===fileURLToPath(import.meta.url)){try{const r=runRuntimeLab();console.log(JSON.stringify(r));if(r.status!=='PASS')process.exitCode=1}catch{console.error('RUNTIME_LAB_NOT_AUTHORIZED');process.exitCode=1}}
