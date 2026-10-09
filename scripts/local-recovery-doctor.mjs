import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { freemem, totalmem } from 'node:os'
import { createConnection } from 'node:net'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const minimumFreeBytes = 7 * 1024 ** 3
const command = (file, args, cwd, env = process.env) => {
  const result = spawnSync(file, args, { cwd, env, shell: false, encoding: 'utf8', timeout: 5000, maxBuffer: 65536, windowsHide: true })
  return { ok: result.status === 0 && !result.error, text: result.status === 0 && !result.error ? (result.stdout ?? '').trim() : '' }
}

export function localDockerEndpoint(value) {
  return value === 'unix:///var/run/docker.sock' || /^npipe:\/\/\/\/\.\/pipe\/(docker_engine|dockerDesktopLinuxEngine)$/.test(value)
}

export function gitRefreshStatus(cwd, run = command) {
  // Local metadata only: no remote URLs, branch names, fetch or network request.
  const mapping = run('git', ['config', '--get-all', 'remote.origin.fetch'], cwd)
  return mapping.ok && mapping.text.split(/\r?\n/).some(value => value === '+refs/heads/*:refs/remotes/origin/*' || value === 'refs/heads/*:refs/remotes/origin/*')
    ? 'CONVENTIONAL_MAPPING_OBSERVED_REMOTE_HEAD_NOT_VERIFIED'
    : 'EXPLICIT_BRANCH_FETCH_REQUIRED'
}

export function dockerStatus(cwd, run = command, env = process.env) {
  // Context inspection reads local metadata only. Never contact a remote engine.
  if (env.DOCKER_HOST && !localDockerEndpoint(env.DOCKER_HOST)) return 'REMOTE_ENDPOINT_BLOCKED'
  const inspected = env.DOCKER_HOST ? { ok: true, text: env.DOCKER_HOST } : run('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], cwd, env)
  if (!inspected.ok) return 'CLI_OR_CONTEXT_UNAVAILABLE'
  if (!localDockerEndpoint(inspected.text)) return 'REMOTE_ENDPOINT_BLOCKED'
  const info = run('docker', ['--host', inspected.text, 'info', '--format', '{{.OSType}}'], cwd, { ...env, DOCKER_CONTEXT: '', DOCKER_HOST: inspected.text })
  return !info.ok ? 'LOCAL_ENGINE_STOPPED_OR_UNAVAILABLE' : info.text === 'linux' ? 'LOCAL_LINUX_ENGINE_AVAILABLE' : 'LINUX_ENGINE_REQUIRED'
}

async function portStatus(port) {
  return new Promise(resolveStatus => {
    const socket = createConnection({ host: '127.0.0.1', port })
    let settled = false
    const finish = value => { if (!settled) { settled = true; socket.destroy(); resolveStatus(value) } }
    socket.once('connect', () => finish('LISTENING_UNVERIFIED'))
    socket.once('error', error => finish(error.code === 'ECONNREFUSED' ? 'NOT_LISTENING' : 'UNAVAILABLE'))
    socket.setTimeout(800, () => finish('UNAVAILABLE'))
  })
}

export async function localRecoveryReport({ cwd = root, run = command, freeBytes = freemem(), totalBytes = totalmem(), env = process.env, probePort = portStatus } = {}) {
  const gitHead = run('git', ['rev-parse', 'HEAD'], cwd)
  const gitChanges = run('git', ['status', '--porcelain=v1', '--untracked-files=normal'], cwd)
  const projectFiles = ['package.json', 'package-lock.json', 'supabase/config.toml', 'scripts/security/supabase-local/run-stack.mjs']
  let localProject = false
  try { localProject = readFileSync(resolve(cwd, 'supabase/config.toml'), 'utf8').includes('project_id = "crm-telecom-local"') } catch { /* Missing configuration is a blocker. */ }
  const supabase = run('supabase', ['--version'], cwd)
  const cli = supabase.ok && supabase.text === '2.119.0' ? 'PINNED_VERSION_AVAILABLE' : supabase.ok ? 'VERSION_MISMATCH' : 'NOT_AVAILABLE_ON_PATH'
  const docker = dockerStatus(cwd, run, env)
  const ports = {}
  for (const port of [3108, 3109, 54321]) ports[String(port)] = await probePort(port)
  const source = gitHead.ok && /^[0-9a-f]{40}$/.test(gitHead.text) ? gitHead.text : null
  const report = {
    scope: 'READ_ONLY_LOCAL_RECOVERY_PREFLIGHT', source,
    node24: process.versions.node.split('.')[0] === '24',
    working_tree: !gitChanges.ok ? 'UNAVAILABLE' : gitChanges.text ? 'CHANGES_PRESERVED_REVIEW_REQUIRED' : 'CLEAN',
    git_refresh: gitRefreshStatus(cwd, run),
    project_files: projectFiles.every(file => existsSync(resolve(cwd, file))) && localProject ? 'PRESENT_LOCAL_PROJECT' : 'MISSING_OR_WRONG_PROJECT',
    dependencies: existsSync(resolve(cwd, 'node_modules/next/dist/bin/next')) ? 'PRESENT_UNVERIFIED' : 'MISSING',
    memory: { free_gib: Math.floor(freeBytes / 1024 ** 3 * 100) / 100, total_gib: Math.floor(totalBytes / 1024 ** 3 * 100) / 100, full_stack_budget: freeBytes >= minimumFreeBytes ? 'AVAILABLE' : 'BELOW_7_GIB_GUIDE' },
    docker, supabase_cli: cli, ports,
    hosted_binding: existsSync(resolve(cwd, 'supabase/.temp/project-ref')) || !!env.SUPABASE_ACCESS_TOKEN || !!env.SUPABASE_DB_PASSWORD ? 'PRESENT_REVIEW_REQUIRED' : 'NOT_OBSERVED',
    local_environment_file: existsSync(resolve(cwd, '.env.local')) ? 'PRESENT_REVIEW_REQUIRED' : 'NOT_OBSERVED',
    private_file_tests: process.platform === 'win32' ? 'POSIX_PERMISSIONS_NOT_ESTABLISHED_ON_WINDOWS' : 'NOT_TESTED',
    acceptance: 'NOT_ESTABLISHED', installation: 'NOT_ESTABLISHED', business_ai_writes: 'NO_ENABLE_ACTION',
  }
  report.full_stack_preflight = source && report.node24 && report.working_tree === 'CLEAN' && report.project_files === 'PRESENT_LOCAL_PROJECT' && report.dependencies === 'PRESENT_UNVERIFIED' && report.memory.full_stack_budget === 'AVAILABLE' && docker === 'LOCAL_LINUX_ENGINE_AVAILABLE' && cli === 'PINNED_VERSION_AVAILABLE' && report.hosted_binding === 'NOT_OBSERVED' && report.local_environment_file === 'NOT_OBSERVED' && Object.values(ports).every(status => status === 'NOT_LISTENING') ? 'PREREQUISITES_OBSERVED_ACCEPTANCE_STILL_REQUIRED' : 'BLOCKED_REVIEW_REPORT'
  return report
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 2) { console.error('Uso: node scripts/local-recovery-doctor.mjs'); process.exitCode = 2 }
  else {
    const report = await localRecoveryReport()
    console.log(JSON.stringify(report, null, 2))
    console.log('\nDiagnóstico de recuperación; no arranca servicios ni modifica archivos. Un puerto abierto no demuestra que el CRM esté listo. Conserva cualquier cambio local antes de actualizar la rama. Consulta docs/master/LOCAL_RECOVERY_WINDOWS_20261009.md.')
    if (report.full_stack_preflight === 'BLOCKED_REVIEW_REPORT') process.exitCode = 1
  }
}
