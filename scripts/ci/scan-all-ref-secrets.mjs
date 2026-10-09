import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

const hash = value => createHash('sha256').update(value).digest('hex')
function git(repo,args) {
 const r=spawnSync('git',args,{cwd:repo,encoding:'utf8',maxBuffer:32*1024*1024,timeout:60000})
 if(r.error||r.status!==0)throw new Error('GIT_INVENTORY_FAILED')
 return r.stdout.trim()
}
export function snapshot(repo) {
 if(git(repo,['rev-parse','--is-shallow-repository'])!=='false')throw new Error('SHALLOW_HISTORY_REJECTED')
 const refs=git(repo,['for-each-ref','--format=%(refname) %(objectname)','refs/heads','refs/remotes','refs/tags']).split('\n').filter(Boolean).sort()
 const head=git(repo,['rev-parse','HEAD'])
 const commits=git(repo,['rev-list','--all','HEAD']).split('\n').filter(Boolean).sort()
 if(!refs.length||!commits.length)throw new Error('EMPTY_HISTORY_REJECTED')
 return {head,refs,commits,identity:hash(JSON.stringify({head,refs,commits}))}
}
export function redactFinding(f) {
 if(!f||typeof f.RuleID!=='string'||!/^[a-z0-9_-]{1,100}$/.test(f.RuleID)||!/^[a-f0-9]{40}$/.test(f.Commit)||typeof f.File!=='string'||!Number.isSafeInteger(f.StartLine)||f.StartLine<1)throw new Error('SCANNER_REPORT_INVALID')
 // Neither Match, Secret, description, author, email nor raw path is published.
 return {id:hash(`${f.Commit}\0${f.File}\0${f.RuleID}\0${f.StartLine}`),rule:f.RuleID,commit:f.Commit,file_sha256:hash(f.File),line:f.StartLine,classification:'UNTRIAGED_NOT_PROOF_OF_LIVE_CREDENTIAL'}
}
export function scan(repo,scanner='gitleaks') {
 const before=snapshot(repo),scratch=mkdtempSync(join(tmpdir(),'w4-secret-audit-'))
 try {
  const env={...process.env};delete env.GITLEAKS_CONFIG;delete env.GITLEAKS_CONFIG_TOML
  const version=spawnSync(scanner,['version'],{encoding:'utf8',env,timeout:15000})
  if(version.error||version.status!==0||version.stdout.trim()!=='8.24.3')throw new Error('SCANNER_VERSION_REJECTED')
  const config=join(scratch,'default.toml'),ignore=join(scratch,'.gitleaksignore'),report=join(scratch,'private.json')
  writeFileSync(config,'[extend]\nuseDefault = true\n',{mode:0o600});writeFileSync(ignore,'# No repository exceptions permitted.\n',{mode:0o600})
  env.GIT_CONFIG_COUNT='1';env.GIT_CONFIG_KEY_0='core.excludesFile';env.GIT_CONFIG_VALUE_0=ignore
  // 8.24.3 always loads source/.gitleaksignore even with an explicit ignore path.
  // Point the history scanner at the Git directory, never the working tree.
  const source=git(repo,['rev-parse','--absolute-git-dir'])
  // Traversing every ancestor alone does not show merge-resolution additions.
  // Separate parent diffs also cover content introduced in the merge itself.
  const args=['git',source,'--log-opts=--all --full-history --diff-merges=separate --no-ext-diff --no-textconv HEAD','--config',config,'--gitleaks-ignore-path',ignore,'--ignore-gitleaks-allow','--redact=100','--no-banner','--no-color','--log-level=error','--exit-code=2','--report-format=json','--report-path',report]
  // Capture scanner output privately. Even redacted logs may contain surrounding PII.
  const run=spawnSync(scanner,args,{cwd:repo,env,encoding:'utf8',timeout:300000,maxBuffer:32*1024*1024})
  if(run.error)throw new Error('SCANNER_EXECUTION_FAILED')
  if(![0,2].includes(run.status))throw new Error('SCANNER_EXIT_REJECTED_'+run.status)
  if(run.stderr.trim())throw new Error(/permission denied|access is denied/i.test(run.stderr)?'SCANNER_PERMISSION_REFUSED':'SCANNER_DIAGNOSTIC_REJECTED')
  let raw;try{raw=JSON.parse(readFileSync(report,'utf8'))}catch{throw new Error('SCANNER_REPORT_MISSING')}
  if(!Array.isArray(raw))throw new Error('SCANNER_REPORT_INVALID')
  const findings=[...new Map(raw.map(redactFinding).map(f=>[f.id,f])).values()].sort((a,b)=>a.id.localeCompare(b.id))
  if((run.status===0)!==(findings.length===0))throw new Error('SCANNER_EXIT_REPORT_MISMATCH')
  const after=snapshot(repo);if(after.identity!==before.identity)throw new Error('REFS_CHANGED_DURING_SCAN')
  return {version:1,status:findings.length?'BLOCKED_FINDINGS':'PASS_REACHABLE_TEXT_SCAN',scanner:'gitleaks-8.24.3',head:before.head,scope:'ALL_LOCAL_HEADS_REMOTE_TRACKING_TAGS_AND_HEAD_FULL_ANCESTRY',snapshot_sha256:before.identity,ref_count:before.refs.length,commit_count:before.commits.length,refs:before.refs,findings,exceptions_applied:0,raw_output_published:false,limitations:['Remote refs must be refreshed before invoking this command.','Deleted unreachable refs, forks, Git LFS objects and hosted artifacts are outside this scan.','Pattern scan is not proof of no PII or no undiscovered credential.'],production_ready:false}
 } finally {rmSync(scratch,{recursive:true,force:true})}
}
export function publicSummary(result) {
 return {version:result.version,status:result.status,scanner:result.scanner,head:result.head,scope:result.scope,snapshot_sha256:result.snapshot_sha256,ref_count:result.ref_count,commit_count:result.commit_count,finding_count:result.findings.length,exceptions_applied:0,raw_output_published:false,production_ready:false,limitations:result.limitations}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 try {const result=scan(process.cwd(),process.env.W4_GITLEAKS_BIN||'gitleaks'),summary=publicSummary(result);if(process.env.W4_PRIVATE_REPORT)writeFileSync(process.env.W4_PRIVATE_REPORT,JSON.stringify(result,null,2)+'\n',{mode:0o600});if(process.env.W4_SAFE_REPORT)writeFileSync(process.env.W4_SAFE_REPORT,JSON.stringify(summary,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(summary));process.exitCode=result.findings.length?2:0}
 catch {console.error('ALL_REF_SECRET_AUDIT_FAILED_CLOSED');process.exitCode=1}
}

