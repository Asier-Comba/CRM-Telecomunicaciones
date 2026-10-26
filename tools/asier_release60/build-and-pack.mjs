import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { assembleRuntime, newExternalOutput } from './package.mjs'
import { isolatedEnvironment, smokeRuntime } from './smoke.mjs'
import { validatePublicBuild } from '../../scripts/platform/build-public.mjs'

const root=resolve(import.meta.dirname,'../..')
const git=(...args)=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),...args],{cwd:root,maxBuffer:32*1024*1024}).toString().trim()
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
function python(...args){
  if(!process.env.ASIER60_PYTHON)throw Error('PYTHON_RUNTIME_REQUIRED')
  const result=spawnSync(process.env.ASIER60_PYTHON,[join(import.meta.dirname,'archive.py'),...args],{env:isolatedEnvironment(),encoding:'utf8',maxBuffer:1024*1024,windowsHide:true})
  if(result.status!==0){let code;try{code=JSON.parse(result.stdout).error}catch{}throw Error(/^[A-Z0-9_]+$/.test(code??'')?code:'ARCHIVE_VALIDATION_FAILED')}
  return JSON.parse(result.stdout)
}
try{
  const [expectedSha,output]=process.argv.slice(2),out=newExternalOutput(root,output??'.')
  if(!/^[0-9a-f]{40}$/.test(expectedSha??'')||git('rev-parse','HEAD')!==expectedSha)throw Error('EXACT_COMMITTED_SOURCE_REQUIRED')
  if(git('status','--porcelain','--untracked-files=normal'))throw Error('CLEAN_SOURCE_REQUIRED')
  if(existsSync(out))throw Error('NEW_OUTPUT_REQUIRED')
  for(const name of ['.env','.env.local','.env.production','.env.production.local'])if(existsSync(join(root,name)))throw Error('BUILD_DOTENV_FORBIDDEN')
  if(validatePublicBuild({}).status!=='PASS')throw Error('EXISTING_PUBLIC_BUILD_GUARD_FAILED')
  mkdirSync(out)
  const build=spawnSync(process.execPath,['scripts/platform/boundary.mjs','--build'],{cwd:root,env:{...isolatedEnvironment(),CI:'true'},encoding:'utf8',timeout:600000,maxBuffer:32*1024*1024,windowsHide:true})
  writeFileSync(join(out,'build-status.json'),JSON.stringify({exit_code:build.status,source_sha:expectedSha,validator:'EXISTING_PLATFORM_BOUNDARY_BUILD',scope:'NO_PUBLIC_BACKEND_BINDINGS'})+'\n')
  if(build.status!==0)throw Error('EXISTING_BOUNDARY_BUILD_FAILED')
  const lines=build.stdout.trim().split(/\r?\n/),boundary=JSON.parse(lines.at(-1))
  if(boundary.status!=='PASS')throw Error('EXISTING_BOUNDARY_BUILD_FAILED')
  if(git('rev-parse','HEAD')!==expectedSha||git('status','--porcelain','--untracked-files=normal'))throw Error('SOURCE_CHANGED_DURING_BUILD')
  const before=await smokeRuntime(join(root,'.next/standalone'),{entry:'server.js',staticSource:root,publicSource:root})
  writeFileSync(join(out,'before-assembly.json'),JSON.stringify(before,null,2)+'\n')
  if(before.checks.static_bytes||before.checks.public_bytes||!before.checks.liveness)throw Error('RAW_COPY_GAP_NOT_REPRODUCED')
  const runtime=join(out,'runtime'),assembled=assembleRuntime(root,runtime)
  const metadata={source_sha:expectedSha,source_tree:git('rev-parse','HEAD^{tree}'),scope:'LOCAL_UNCONFIGURED_STANDALONE_NOT_NETLIFY_OR_RELEASE',
    platform:process.platform,architecture:process.arch,node:process.versions.node,next:JSON.parse(readFileSync(join(root,'node_modules/next/package.json'))).version,
    lock_sha256:hash(execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'show','HEAD:package-lock.json'],{cwd:root})),
    dockerfile_sha256:hash(readFileSync(join(root,'infra/deployment/Dockerfile'))),build_id_sha256:hash(readFileSync(join(runtime,'.next/BUILD_ID'))),public_build:'UNCONFIGURED',boundary,assembled}
  const metadataPath=join(out,'build.json');writeFileSync(metadataPath,JSON.stringify(metadata,null,2)+'\n')
  const archive=join(out,'runtime.zip'),sealed=python('pack',runtime,archive,metadataPath)
  const again=join(out,'runtime-repeat.zip'),repeated=python('pack',runtime,again,metadataPath)
  if(sealed.archive_sha256!==repeated.archive_sha256)throw Error('ARCHIVE_NOT_DETERMINISTIC')
  const restored=join(out,'restored');python('restore',archive,expectedSha,sealed.archive_sha256,restored)
  const smoke=await smokeRuntime(restored)
  const result={...sealed,deterministic_same_build_archive:true,build_reexecution_byte_identity:'NOT_CLAIMED',before_assembly:before,restored_smoke:smoke,staging:'NOT_PROVEN',netlify_artifact:false,registry_manifest_digest:null,w4_accepted:false,release_accepted:false}
  writeFileSync(join(out,'artifact.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
  if(smoke.status!=='PASS')process.exitCode=1
}catch(error){console.error(JSON.stringify({status:'BLOCKED',error:/^[A-Z0-9_]+$/.test(error.message)?error.message:'BUILD_PACKAGE_OPERATION_FAILED'}));process.exitCode=1}
