import {spawnSync} from 'node:child_process'
import {readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createPublicBuildBinding} from '../../scripts/platform/build-binding.mjs'
import {stagingAppOriginV1,stagingSupabaseUrlV1} from '../../src/lib/server/product-staging-admission-v1.ts'

// Fresh disposable Actions runner only. No registry login/push or hosted action.
export function runRuntimeLab(env=process.env){
 if(process.platform!=='linux'||env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='pull_request'||env.GITHUB_REPOSITORY!=='Asier-Comba/CRM-Telecomunicaciones'||!env.RUNNER_TEMP||!/^[a-f0-9]{40}$/.test(env.EXPECTED_SOURCE??''))throw Error('RUNTIME_LAB_NOT_AUTHORIZED')
 const result={contract:'staging.runtime.lab.v1',scope:'LAB_ONLY_PROPOSED_POLICY_NEGATIVE',status:'FAIL',source:env.EXPECTED_SOURCE,tree:null,image_id:null,build:false,nonroot:false,official_entrypoint:false,proposed_policy_denied:false,published:false,deployed:false,cleanup:false,error:null}
 const call=(bin,args)=>spawnSync(bin,args,{encoding:'utf8',maxBuffer:16*1024*1024,timeout:bin==='docker'?15*60*1000:10000})
 const tag='crm-runtime-lab:'+env.EXPECTED_SOURCE
 let built=false,attempted=false,runAttempted=false
 const container='crm-runtime-lab-'+env.EXPECTED_SOURCE
 try{
  const head=call('git',['rev-parse','HEAD']);if(head.status!==0||head.stdout.trim()!==env.EXPECTED_SOURCE)throw Error('SOURCE_MISMATCH')
  result.tree=call('git',['rev-parse','HEAD^{tree}']).stdout.trim();if(!/^[a-f0-9]{40}$/.test(result.tree))throw Error('TREE_INVALID')
  if(JSON.parse(readFileSync('infra/platform/product-staging-runtime-policy.json','utf8')).status!=='PROPOSED')throw Error('LAB_REQUIRES_PROPOSED_POLICY')
  if(call('docker',['image','inspect',tag]).status===0)throw Error('LAB_TAG_EXISTS')
  const bindings={NEXT_PUBLIC_APP_URL:stagingAppOriginV1,NEXT_PUBLIC_SUPABASE_URL:stagingSupabaseUrlV1,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic_test_only'}
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
  const runtime={...bindings,PLATFORM_TARGET:'STAGING',APP_ENV:'staging',PRODUCT_V1_ENABLED:'true',PRODUCT_V1_ORIGIN:stagingAppOriginV1,PRODUCT_STAGING_INTEGRATION:'true',PRODUCT_STAGING_USER_IDS:'10000000-0000-4000-8000-000000000001',BACKUP_RETENTION_DAYS:'7'}
  if(call('docker',['container','inspect',container]).status===0)throw Error('LAB_CONTAINER_EXISTS')
  runAttempted=true
  const denied=call('docker',['run','--name',container,'--rm','--network','none','--memory','256m','--cpus','1',...Object.entries(runtime).flatMap(([k,v])=>['--env',k+'='+v]),image.Id])
  if(denied.status!==1||!denied.stderr.includes('HOSTED_PRODUCT_RUNTIME_NOT_ACCEPTED')||denied.stderr.includes('MODULE_NOT_FOUND')||denied.stderr.includes('ENVIRONMENT_INVALID'))throw Error('PROPOSED_POLICY_NOT_CORRECTLY_DENIED')
  result.proposed_policy_denied=true;result.status='PASS'
 }catch(error){const allowed=['SOURCE_MISMATCH','TREE_INVALID','LAB_REQUIRES_PROPOSED_POLICY','LAB_TAG_EXISTS','IMAGE_BUILD_FAILED','IMAGE_INSPECT_FAILED','IMAGE_PLATFORM_OR_USER_INVALID','OFFICIAL_ENTRYPOINT_REQUIRED','PROPOSED_POLICY_NOT_CORRECTLY_DENIED'];result.error=allowed.includes(error?.message)?error.message:'LAB_FAILED'}
 finally{
  result.cleanup=built?call('docker',['image','rm',tag]).status===0:!attempted
  if(runAttempted){const removed=call('docker',['container','rm','-f',container]);result.cleanup=result.cleanup&&(removed.status===0||removed.status===1&&removed.stderr.includes('No such container'))}
  if(!result.cleanup)result.status='FAIL'
  writeFileSync(join(env.RUNNER_TEMP,'staging-runtime-lab.safe.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
 }
 return result
}
if(process.argv[1]===fileURLToPath(import.meta.url)){try{const r=runRuntimeLab();console.log(JSON.stringify(r));if(r.status!=='PASS')process.exitCode=1}catch{console.error('RUNTIME_LAB_NOT_AUTHORIZED');process.exitCode=1}}
