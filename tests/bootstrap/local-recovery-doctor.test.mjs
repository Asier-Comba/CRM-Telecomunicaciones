import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { dockerStatus, localRecoveryReport } from '../../scripts/local-recovery-doctor.mjs'

test('recovery doctor preserves actual tracked and untracked changes and does not disclose environment contents', async () => {
  const parent = realpathSync(tmpdir()), cwd = mkdtempSync(join(parent, 'crm-local-doctor-test-'))
  try {
    const git = args => { const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false }); assert.equal(result.status, 0); return result.stdout.trim() }
    git(['init', '--quiet'])
    writeFileSync(join(cwd, 'package.json'), '{}\n'); writeFileSync(join(cwd, 'package-lock.json'), '{}\n')
    mkdirSync(join(cwd, 'supabase')); writeFileSync(join(cwd, 'supabase/config.toml'), 'project_id = "crm-telecom-local"\n')
    mkdirSync(join(cwd, 'scripts/security/supabase-local'), { recursive: true }); writeFileSync(join(cwd, 'scripts/security/supabase-local/run-stack.mjs'), '')
    git(['add', '.']); git(['-c', 'user.name=Synthetic test', '-c', 'user.email=synthetic@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Synthetic fixture'])
    const before = git(['rev-parse', 'HEAD']), secret = 'never-print-test-secret@example.invalid'
    writeFileSync(join(cwd, 'package.json'), '{"synthetic_change":true}\n'); writeFileSync(join(cwd, '.env.local'), secret)
    const run = (file, args) => file === 'git' ? { ok: true, text: git(args) } : { ok: false, text: secret }
    const report = await localRecoveryReport({ cwd, run, env: { SUPABASE_ACCESS_TOKEN: secret }, freeBytes: 1024 ** 3, totalBytes: 16 * 1024 ** 3, probePort: async () => 'NOT_LISTENING' })
    assert.equal(report.source, before); assert.equal(git(['rev-parse', 'HEAD']), before)
    assert.match(git(['status', '--porcelain=v1']), /package\.json/); assert.match(git(['status', '--porcelain=v1']), /\.env\.local/)
    assert.equal(report.working_tree, 'CHANGES_PRESERVED_REVIEW_REQUIRED')
    assert.equal(report.full_stack_preflight, 'BLOCKED_REVIEW_REPORT')
    assert.equal(report.hosted_binding, 'PRESENT_REVIEW_REQUIRED'); assert.equal(report.local_environment_file, 'PRESENT_REVIEW_REQUIRED')
    assert.equal(report.acceptance, 'NOT_ESTABLISHED'); assert.ok(!JSON.stringify(report).includes(secret))
  } finally {
    const target = realpathSync(cwd)
    assert.equal(resolve(target, '..'), parent); assert.ok(target.startsWith(join(parent, 'crm-local-doctor-test-')))
    rmSync(target, { recursive: true, force: true })
  }
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
