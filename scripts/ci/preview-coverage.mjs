import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync,readdirSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

const projects=['desktop','mobile']
const policy={workers:1,retries:0,test_timeout_ms:180000}
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const reject=code=>{throw new Error(code)}
function binding(source,run,attempt){
 if(!/^[a-f0-9]{40}$/.test(source??'')||!/^\d+$/.test(run??'')||!/^\d+$/.test(attempt??''))reject('PREVIEW_SOURCE_RUN_BINDING_REQUIRED')
 return {source_sha:source,run_id:run,run_attempt:attempt}
}
function cases(report,executed=false){
 if(!report||!Array.isArray(report.suites)||!Array.isArray(report.errors)||report.errors.length)reject('PREVIEW_REPORT_INCOMPLETE')
 if(report.config?.workers!==1||!Array.isArray(report.config.projects)||!report.config.projects.length)reject('PREVIEW_POLICY_MISMATCH')
 for(const p of report.config.projects)if(!projects.includes(p.name)||p.retries!==0||p.timeout!==180000||p.repeatEach!==1)reject('PREVIEW_POLICY_MISMATCH')
 const rows=[]
 function visit(suites){
  for(const suite of suites){
   if(!Array.isArray(suite.specs)||suite.suites!==undefined&&!Array.isArray(suite.suites))reject('PREVIEW_SUITE_INVALID')
   for(const spec of suite.specs){
    if(!/^[a-zA-Z0-9_-]{1,160}$/.test(spec.id??'')||!Array.isArray(spec.tests)||!spec.tests.length)reject('PREVIEW_CASE_ID_REQUIRED')
    for(const test of spec.tests){
     if(!projects.includes(test.projectName)||test.expectedStatus!=='passed')reject('PREVIEW_CASE_SKIPPED_OR_UNKNOWN')
     if(executed&&(test.status!=='expected'||!Array.isArray(test.results)||test.results.length!==1||test.results[0].status!=='passed'||test.results[0].retry!==0))reject('PREVIEW_CASE_NOT_SINGLE_PASS')
     rows.push({id:spec.id,project:test.projectName})
    }
   }
   visit(suite.suites??[])
  }
 }
 visit(report.suites)
 rows.sort((a,b)=>a.project.localeCompare(b.project)||a.id.localeCompare(b.id))
 if(!rows.length||new Set(rows.map(r=>r.project+':'+r.id)).size!==rows.length)reject('PREVIEW_EMPTY_OR_DUPLICATE_CASES')
 if(executed&&(!report.stats||report.stats.unexpected!==0||report.stats.flaky!==0||report.stats.skipped!==0||report.stats.expected!==rows.length))reject('PREVIEW_RESULT_COUNTS_INCOMPLETE')
 return rows
}
export function manifest(report,source,run,attempt){
 const tests=cases(report)
 if(projects.some(p=>!tests.some(t=>t.project===p)))reject('PREVIEW_PROJECT_MISSING')
 const inventory={projects,policy,tests}
 return {version:1,...binding(source,run,attempt),...inventory,inventory_sha256:digest(inventory)}
}
function validateManifest(m,source,run,attempt){
 if(m?.version!==1||JSON.stringify(binding(source,run,attempt))!==JSON.stringify({source_sha:m.source_sha,run_id:m.run_id,run_attempt:m.run_attempt})||JSON.stringify(m.projects)!==JSON.stringify(projects)||JSON.stringify(m.policy)!==JSON.stringify(policy)||!Array.isArray(m.tests)||digest({projects:m.projects,policy:m.policy,tests:m.tests})!==m.inventory_sha256)reject('PREVIEW_MANIFEST_BINDING_MISMATCH')
 if(!m.tests.length||m.tests.some(t=>!projects.includes(t.project)||!/^[a-zA-Z0-9_-]{1,160}$/.test(t.id??''))||new Set(m.tests.map(t=>t.project+':'+t.id)).size!==m.tests.length||projects.some(p=>!m.tests.some(t=>t.project===p)))reject('PREVIEW_MANIFEST_CASES_INVALID')
}
export function shard(report,m,project,source,run,attempt){
 validateManifest(m,source,run,attempt)
 if(!projects.includes(project))reject('PREVIEW_PROJECT_UNKNOWN')
 const actual=cases(report,true),expected=m.tests.filter(t=>t.project===project)
 if(JSON.stringify(actual)!==JSON.stringify(expected))reject('PREVIEW_PROJECT_COVERAGE_MISMATCH')
 return {version:1,...binding(source,run,attempt),project,inventory_sha256:m.inventory_sha256,tests:actual,status:'PASS',policy}
}
export function union(entries,source,run,attempt,jobsResult){
 if(jobsResult!=='success'||!Array.isArray(entries)||entries.length!==2)reject('PREVIEW_ALL_JOBS_SUCCESS_REQUIRED')
 const seen=new Set(),all=[];let inventory
 for(const {manifest:m,proof:p} of entries){
  validateManifest(m,source,run,attempt)
  if(inventory&&JSON.stringify(inventory)!==JSON.stringify(m))reject('PREVIEW_MANIFESTS_DIFFER')
  inventory=m
  if(p?.version!==1||p.status!=='PASS'||p.source_sha!==source||p.run_id!==run||p.run_attempt!==attempt||!projects.includes(p.project)||seen.has(p.project)||p.inventory_sha256!==m.inventory_sha256||JSON.stringify(p.policy)!==JSON.stringify(policy)||JSON.stringify(p.tests)!==JSON.stringify(m.tests.filter(t=>t.project===p.project)))reject('PREVIEW_PROOF_BINDING_OR_COVERAGE_MISMATCH')
  seen.add(p.project);all.push(...p.tests)
 }
 if(seen.size!==2||all.length!==inventory.tests.length)reject('PREVIEW_UNION_INCOMPLETE')
 return {version:1,...binding(source,run,attempt),status:'PASS',projects,inventory_sha256:inventory.inventory_sha256,case_count:all.length,project_counts:Object.fromEntries(projects.map(p=>[p,all.filter(t=>t.project===p).length])),policy,scope:'SYNTHETIC_PREVIEW_ONLY_NOT_AUTH_STAGING_OR_RELEASE'}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{
  const [command,...args]=process.argv.slice(2),[source,run,attempt]=[process.env.GITHUB_SHA,process.env.GITHUB_RUN_ID,process.env.GITHUB_RUN_ATTEMPT]
  const read=p=>JSON.parse(readFileSync(p,'utf8'))
  let result,output
  if(command==='manifest'){result=manifest(read(args[0]),source,run,attempt);output=args[1]}
  else if(command==='shard'){result=shard(read(args[0]),read(args[1]),args[2],source,run,attempt);output=args[3]}
  else if(command==='union'){
   const dirs=readdirSync(args[0],{withFileTypes:true}).filter(d=>d.isDirectory())
   result=union(dirs.map(d=>({manifest:read(join(args[0],d.name,'preview-manifest.json')),proof:read(join(args[0],d.name,'preview-proof.json'))})),source,run,attempt,process.env.PREVIEW_JOBS_RESULT);output=args[1]
  }else reject('PREVIEW_COMMAND_UNKNOWN')
  if(!output)reject('PREVIEW_OUTPUT_REQUIRED')
  writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600})
  console.log(JSON.stringify({status:result.status??'COLLECTED',source_sha:source,case_count:result.case_count??result.tests.length,values_included:false}))
 }catch(e){console.error(JSON.stringify({status:'FAIL',code:/^PREVIEW_[A-Z_]+$/.test(e.message)?e.message:'PREVIEW_EVIDENCE_INVALID',values_included:false}));process.exitCode=1}
}
