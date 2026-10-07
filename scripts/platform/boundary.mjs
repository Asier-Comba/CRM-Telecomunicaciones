import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {join} from 'node:path'
import {randomBytes} from 'node:crypto'
import {files,readJson,root,safeError} from './lib.mjs'
import {cleanBuildCache} from './clean-build-cache.mjs'
export function scanCanaries(paths,canaries){
 let checked=0
 for(const path of paths){
  const bytes=readFileSync(path);checked++
  if(canaries.some(v=>bytes.includes(v)||bytes.includes(Buffer.from(v).toString('base64'))))throw new Error('PRIVATE_VALUE_IN_ARTIFACT')
 }
 return {status:'PASS',files_checked:checked,values_included:false}
}
export function portabilityScan(){
 const paths=['infra/deployment','infra/platform','infra/n8n'].flatMap(p=>files(join(root,p)))
 const problems=[]
 for(const p of paths){
  const s=readFileSync(p,'utf8')
  if(/(?:[A-Z]:\\Users\\|\/home\/(?!node\b)[a-z]+\/|[a-z0-9]{20}\.supabase\.co|@(?:gmail|hotmail|outlook|opendeusto)\.)/i.test(s))problems.push('PERSONAL_RUNTIME_BINDING')
 }
 return {status:problems.length?'BLOCKED':'PASS',errors:[...new Set(problems)],files_checked:paths.length,authorship_metadata_excluded:true}
}
if(process.argv[1]?.endsWith('boundary.mjs'))try{
 if(process.argv.includes('--build')){
  const names=readJson('infra/platform/environment-manifest.json').entries.filter(e=>e.secret).map(e=>e.name)
  const bindings=Object.fromEntries(names.map(n=>[n,`w5_canary_${randomBytes(32).toString('hex')}`]))
  const r=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build'],{cwd:root,env:{...process.env,...bindings,NEXT_TELEMETRY_DISABLED:'1'},encoding:'utf8',timeout:600000,maxBuffer:32*1024*1024})
  const values=Object.values(bindings)
  if(values.some(v=>(r.stdout??'').includes(v)||(r.stderr??'').includes(v)))throw new Error('PRIVATE_VALUE_IN_BUILD_LOG')
  if(r.status!==0)throw new Error('BOUNDARY_BUILD_FAILED')
  cleanBuildCache()
  const paths=files(join(root,'.next')).filter(p=>!p.includes(`${process.platform==='win32'?'\\':'/'}node_modules${process.platform==='win32'?'\\':'/'}`))
  console.log(JSON.stringify({...scanCanaries(paths,values),classes:names.length,scope:'BUILD_STATIC_SERVER_CACHE_LOGS',screenshots:'EXISTING_W2_SYNTHETIC_CI_ARTIFACTS_NOT_SCANNED'}))
 }else{const r=portabilityScan();console.log(JSON.stringify(r));if(r.status!=='PASS')process.exitCode=1}
}catch(e){console.error(JSON.stringify({status:'FAIL',error:safeError(e)}));process.exitCode=1}
