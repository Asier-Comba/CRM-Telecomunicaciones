import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { dockerStatus, localRecoveryReport, gitRefreshStatus } from '../../scripts/local-recovery-doctor.mjs'

test('recovery doctor preserves actual tracked and untracked changes and does not disclose environment contents', async () => {
  const parent = realpathSync(tmpdir()), cwd = mkdtempSync(join(parent, 'crm-local-doctor-test-'))
  try {
    const git = args => { const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false }); assert.equal(result.status, 0); return result.stdout.trim() }
    git(['init', '--quiet'])
    writeFileSync(join(cwd, 'package.json'), '{}\n'); writeFileSync(join(cwd, 'package-lock.json'), '{}\n')
    mkdirSync(join(cwd, 'supabase')); writeFileSync(join(cwd, 'supabase/config.toml'), 'project_id = "crm-telecom-local"\n')
    mkdirSync(join(cwd, 'scripts/security/supabase-local'), { recursive: true }); writeFileSync(join(cwd, 'scripts/security/supabase-local/run-stack.mjs'), '')
    git(['add', '.']); git(['-c', 'user.name=Synthetic test', '-c', 'user.email=synthetic@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Synthetic fixture'])
    git(['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'])
    const before = git(['rev-parse', 'HEAD']), secret = 'never-print-test-secret@example.invalid'
    writeFileSync(join(cwd, 'package.json'), '{"synthetic_change":true}\n'); writeFileSync(join(cwd, '.env.local'), secret)
    const run = (file, args) => file === 'git' ? { ok: true, text: git(args) } : { ok: false, text: secret }
    const report = await localRecoveryReport({ cwd, run, env: { SUPABASE_ACCESS_TOKEN: secret }, freeBytes: 1024 ** 3, totalBytes: 16 * 1024 ** 3, probePort: async () => 'NOT_LISTENING' })
    assert.equal(report.source, before); assert.equal(git(['rev-parse', 'HEAD']), before)
    assert.match(git(['status', '--porcelain=v1']), /package\.json/); assert.match(git(['status', '--porcelain=v1']), /\.env\.local/)
    assert.equal(report.working_tree, 'CHANGES_PRESERVED_REVIEW_REQUIRED')
    assert.equal(report.git_refresh, 'CONVENTIONAL_MAPPING_OBSERVED_REMOTE_HEAD_NOT_VERIFIED')
    assert.equal(report.full_stack_preflight, 'BLOCKED_REVIEW_REPORT')
    assert.equal(report.hosted_binding, 'PRESENT_REVIEW_REQUIRED'); assert.equal(report.local_environment_file, 'PRESENT_REVIEW_REQUIRED')
    assert.equal(report.acceptance, 'NOT_ESTABLISHED'); assert.ok(!JSON.stringify(report).includes(secret))
  } finally {
    const target = realpathSync(cwd)
    assert.equal(resolve(target, '..'), parent); assert.ok(target.startsWith(join(parent, 'crm-local-doctor-test-')))
    rmSync(target, { recursive: true, force: true })
  }
})

test('explicit branch fetch recovers a stale tracking ref when ordinary fetch has no configured mapping', () => {
  const parent = realpathSync(tmpdir()), target = mkdtempSync(join(parent, 'crm-fetch-recovery-test-'))
  try {
    const publisher=join(target,'publisher'),consumer=join(target,'consumer'),remote=join(target,'remote.git')
    mkdirSync(publisher);mkdirSync(consumer)
    const git=(cwd,args)=>{const r=spawnSync('git',args,{cwd,encoding:'utf8',shell:false});assert.equal(r.status,0);return r.stdout.trim()}
    git(target,['init','--bare','--quiet',remote]);git(target,['--git-dir',remote,'symbolic-ref','HEAD','refs/heads/work-only'])
    git(publisher,['init','--quiet','--initial-branch=work-only']);git(consumer,['init','--quiet'])
    const commit=value=>{writeFileSync(join(publisher,'synthetic.txt'),value);git(publisher,['add','.']);git(publisher,['-c','user.name=Synthetic test','-c','user.email=synthetic@example.invalid','-c','commit.gpgsign=false','commit','--quiet','-m',value]);return git(publisher,['rev-parse','HEAD'])}
    git(publisher,['remote','add','origin',remote]);git(consumer,['remote','add','origin',remote]);git(consumer,['config','--unset-all','remote.origin.fetch'])
    const ref='refs/remotes/origin/work-only',first=commit('first');git(publisher,['push','--quiet','origin','HEAD:refs/heads/work-only'])
    git(consumer,['fetch','--quiet','origin','refs/heads/work-only:'+ref]);assert.equal(git(consumer,['rev-parse',ref]),first)
    const second=commit('second');git(publisher,['push','--quiet','origin','HEAD:refs/heads/work-only']);git(consumer,['fetch','--quiet','origin'])
    assert.equal(git(consumer,['rev-parse','FETCH_HEAD']),second);assert.equal(git(consumer,['rev-parse',ref]),first)
    assert.equal(gitRefreshStatus(consumer),'EXPLICIT_BRANCH_FETCH_REQUIRED')
    git(consumer,['fetch','--quiet','origin','refs/heads/work-only:'+ref]);assert.equal(git(consumer,['rev-parse',ref]),second)
    assert.equal(gitRefreshStatus(consumer),'EXPLICIT_BRANCH_FETCH_REQUIRED')
    git(consumer,['config','remote.origin.fetch','+refs/heads/*:refs/remotes/origin/*']);assert.equal(gitRefreshStatus(consumer),'CONVENTIONAL_MAPPING_OBSERVED_REMOTE_HEAD_NOT_VERIFIED')
  } finally {
    const resolved=realpathSync(target);assert.equal(resolve(resolved,'..'),parent);assert.ok(resolved.startsWith(join(parent,'crm-fetch-recovery-test-')))
    rmSync(resolved,{recursive:true,force:true})
  }
})

test('fetch diagnosis never exports private configuration text or contacts a remote', () => {
  const secret='private-synthetic@example.invalid',calls=[]
  for(const result of [{ok:false,text:secret},{ok:true,text:'+refs/heads/private-'+secret+':refs/private/*'},{ok:true,text:'+refs/heads/*:refs/remotes/origin/*\n'+secret}]){
    const status=gitRefreshStatus('.',(file,args)=>{calls.push([file,args]);return result})
    assert.equal(status.includes(secret),false);assert.ok(['EXPLICIT_BRANCH_FETCH_REQUIRED','CONVENTIONAL_MAPPING_OBSERVED_REMOTE_HEAD_NOT_VERIFIED'].includes(status))
  }
  assert.ok(calls.every(([file,args])=>file==='git'&&args.join(',')==='config,--get-all,remote.origin.fetch'))
})

test('doctor blocks remote Docker endpoints before contacting an engine and pins local host explicitly', () => {
  const calls = [], run = (file, args, cwd, env) => { calls.push({ file, args, env }); return { ok: true, text: args[0] === 'context' ? 'ssh://private@example.invalid' : 'linux' } }
  assert.equal(dockerStatus('.', run, {}), 'REMOTE_ENDPOINT_BLOCKED'); assert.equal(calls.length, 1)
  calls.length = 0
  assert.equal(dockerStatus('.', run, { DOCKER_HOST: 'tcp://remote.invalid:2375' }), 'REMOTE_ENDPOINT_BLOCKED'); assert.equal(calls.length, 0)
  assert.equal(dockerStatus('.', run, { DOCKER_HOST: 'unix:///var/run/docker.sock', DOCKER_CONTEXT: 'remote' }), 'LOCAL_LINUX_ENGINE_AVAILABLE')
  assert.deepEqual(calls[0].args.slice(0, 3), ['--host', 'unix:///var/run/docker.sock', 'info'])
  assert.equal(calls[0].env.DOCKER_CONTEXT, '')
})
