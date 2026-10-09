import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {scan,snapshot,redactFinding,publicSummary} from '../../scripts/ci/scan-all-ref-secrets.mjs'

const scanner=process.env.W4_GITLEAKS_BIN||'gitleaks'
const git=(repo,...args)=>{const r=spawnSync('git',args,{cwd:repo,encoding:'utf8'});assert.equal(r.status,0,'fixture git command must succeed');return r.stdout.trim()}
function fixture(body){const repo=mkdtempSync(join(tmpdir(),'w4-scan-fixture-'));try{git(repo,'init','-b','main');git(repo,'config','user.name','Synthetic audit');git(repo,'config','user.email','synthetic@example.invalid');writeFileSync(join(repo,'readme.txt'),'synthetic only\n');git(repo,'add','.');git(repo,'commit','-m','clean');body(repo)}finally{rmSync(repo,{recursive:true,force:true})}}
test('clean full-history scan has explicit scope and no approval claim',()=>fixture(repo=>{const r=scan(repo,scanner);assert.equal(r.findings.length,0);assert.equal(r.status,'PASS_REACHABLE_TEXT_SCAN');assert.equal(r.production_ready,false)}))
test('side-branch removed canary and tag-only history cannot hide behind first-parent or ignore files',()=>fixture(repo=>{
 const canary='ghp_'+Array.from(randomBytes(36), b=>'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b%62]).join('');git(repo,'switch','-c','side');writeFileSync(join(repo,'settings.txt'),`access_token = "${canary}"\n`);git(repo,'add','.');git(repo,'commit','-m','synthetic detector fixture');const introduced=git(repo,'rev-parse','HEAD');assert.ok(scan(repo,scanner).findings.length,'must detect current side HEAD');git(repo,'rm','settings.txt');git(repo,'commit','-m','remove synthetic detector fixture');git(repo,'tag','tag-only');git(repo,'switch','main');git(repo,'branch','-D','side');
 writeFileSync(join(repo,'.gitleaksignore'),`${introduced}:settings.txt:github-pat:1\n`)
 writeFileSync(join(repo,'.gitleaks.toml'),'title="attempted suppression"\n[allowlist]\npaths=[".*"]\n')
 const r=scan(repo,scanner);assert.ok(r.findings.some(f=>f.commit===introduced),JSON.stringify(r));assert.equal(r.exceptions_applied,0);assert.ok(!JSON.stringify(r).includes(canary));assert.ok(!JSON.stringify(r).includes('settings.txt'));assert.equal(r.status,'BLOCKED_FINDINGS')
}))
test('remote-tracking refs and second-parent ancestry are inventoried',()=>fixture(repo=>{git(repo,'switch','-c','side');writeFileSync(join(repo,'other.txt'),'side\n');git(repo,'add','.');git(repo,'commit','-m','side');const side=git(repo,'rev-parse','HEAD');git(repo,'switch','main');git(repo,'merge','--no-ff','side','-m','synthetic merge');git(repo,'update-ref','refs/remotes/origin/other',side);const s=snapshot(repo);assert.ok(s.commits.includes(side));assert.ok(s.refs.some(r=>r.startsWith('refs/remotes/origin/other ')))}))
test('shallow input is rejected before scanning',()=>fixture(repo=>{const child=join(tmpdir(),'w4-shallow-'+randomBytes(6).toString('hex'));try{const r=spawnSync('git',['clone','--depth=1','file:///'+repo.replaceAll('\\','/'),child],{encoding:'utf8'});assert.equal(r.status,0);assert.throws(()=>scan(child,scanner),/SHALLOW_HISTORY_REJECTED/)}finally{rmSync(child,{recursive:true,force:true})}}))
test('finding projection excludes sensitive and attacker controlled fields',()=>{const r=redactFinding({RuleID:'generic-api-key',Commit:'a'.repeat(40),File:'private-path',StartLine:3,Secret:'never-output',Match:'never-output',Author:'never-output',Email:'never-output'});assert.deepEqual(Object.keys(r),['id','rule','commit','file_sha256','line','classification']);assert.ok(!JSON.stringify(r).includes('never-output'));assert.throws(()=>redactFinding({RuleID:'secret text'}),/SCANNER_REPORT_INVALID/)} )
test('missing scanner fails closed',()=>fixture(repo=>assert.throws(()=>scan(repo,'missing-w4-scanner'),/SCANNER_VERSION_REJECTED/)))
test('public report never discloses finding locations or reviewer metadata',()=>{const r=publicSummary({version:1,status:'BLOCKED_FINDINGS',findings:[{Secret:'private',File:'private',commit:'private'}],refs:['private'],head:'a'.repeat(40),limitations:[]});assert.equal(r.finding_count,1);assert.ok(!JSON.stringify(r).includes('private'));assert.equal(r.production_ready,false)})




