import { spawnSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

// Deliberately CI-only: no hosted URL/token/password and no reusable local DB.
const project = 'crm-telecom-local'
let stage = 'preflight', started = false, appServer
const evidence = { environment: 'LOCAL_SUPABASE_DOCKER', result: 'NOT_RUN', auth: 'NOT_TESTED', jwt: 'NOT_TESTED', postgrest: 'NOT_TESTED', rpc: 'NOT_TESTED', storage: 'NOT_TESTED' }
function command(bin, args, options = {}) {
  const r = spawnSync(bin, args, { encoding: 'utf8', timeout: 120_000, maxBuffer: 20 * 1024 * 1024, ...options })
  if (r.status !== 0) {
    // Provider/CLI payloads may contain ephemeral credentials. Never echo them.
    const migration = ((r.stdout || '') + (r.stderr || '')).match(/\b\d{14}_[a-z0-9_]+\.sql\b/)?.[0]
    if (migration) evidence.last_observed_migration = migration
    throw new Error('COMMAND_FAILED')
  }
  return r.stdout.trim()
}
try {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.CI !== 'true') throw new Error('CI_ONLY')
  if (process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_DB_PASSWORD || existsSync('supabase/.temp/project-ref')) throw new Error('HOSTED_CONFIGURATION_FORBIDDEN')
  if (!readFileSync('supabase/config.toml', 'utf8').includes(`project_id = "${project}"`)) throw new Error('PROJECT_MISMATCH')
  if (command('docker', ['ps', '-a', '--format', '{{.Names}}']).split('\n').some(n => n.includes(project))) throw new Error('REQUIRES_EMPTY_RUNNER')
  evidence.cli = command('supabase', ['--version'])
  if (evidence.cli !== '2.119.0') throw new Error('CLI_VERSION_MISMATCH')
  evidence.sha = command('git', ['rev-parse', 'HEAD'])
  evidence.config_sha256 = createHash('sha256').update(readFileSync('supabase/config.toml')).digest('hex')
  const migrations = readdirSync('supabase/migrations').filter(n => n.endsWith('.sql')).sort()
  evidence.migration_head = migrations.at(-1); evidence.migration_count = migrations.length
  stage = 'stack_start'; started = true
  // Official --exclude service names. Keep gateway, Auth, PostgREST, DB, Storage.
  command('supabase', ['start', '--exclude', 'realtime,imgproxy,studio,postgres-meta,edge-runtime,logflare,vector,supavisor,mailpit'], { timeout: 600_000 })
  stage = 'stack_status'
  const status = JSON.parse(command('supabase', ['status', '--output', 'json']))
  const url = status.API_URL || status.api?.url
  if (url !== 'http://127.0.0.1:54321') throw new Error('NON_LOOPBACK_API')
  const anon = status.ANON_KEY || status.auth?.anon_key
  const service = status.SERVICE_ROLE_KEY || status.auth?.service_role_key
  if (!anon || !service) throw new Error('LOCAL_KEYS_UNAVAILABLE')
  const services = command('docker', ['ps', '--format', '{{.Names}}|{{.Image}}']).split('\n').map(s => s.split('|')).filter(([n]) => n.includes(project))
  evidence.service_images = services.map(([, image]) => image).sort()
  const db = services.find(([, image]) => /supabase\/postgres:/.test(image))?.[0]
  if (!db) throw new Error('DB_CONTAINER_UNAVAILABLE')
  evidence.db = command('docker', ['exec', db, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-c', 'show server_version'])
  const applied = command('docker', ['exec', db, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-c', 'select count(*) from supabase_migrations.schema_migrations'])
  if (Number(applied) !== migrations.length) throw new Error('MIGRATION_COUNT_MISMATCH')
  evidence.zero_to_head = 'PASS'
  stage='app_transport_start'
  const appUrl='http://127.0.0.1:3108'
  appServer=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3108'],{stdio:'ignore',env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,PRODUCT_V1_ENABLED:'true'}})
  let appReady=false
  for(let attempt=0;attempt<40;attempt++){try{const response=await fetch(appUrl+'/api/product/v1/commands',{method:'POST',signal:AbortSignal.timeout(1000)});if(response.status===403){appReady=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,250))}
  if(!appReady)throw new Error('APP_TRANSPORT_NOT_READY')
  stage = 'http_acceptance'
  if (existsSync('scripts/security/supabase-local/acceptance.mjs')) {
    const { acceptance } = await import('./acceptance.mjs')
    Object.assign(evidence, await acceptance({ url, anon, service, db, command, report: evidence, appUrl }))
  } else evidence.result = 'STACK_PROVEN_HTTP_ACCEPTANCE_PENDING'
} catch (error) {
  evidence.result = 'FAIL'; evidence.failed_stage = stage
  evidence.error = /^[A-Z][A-Z0-9_]{0,180}$/.test(error.message) ? error.message : 'BOUNDED_ACCEPTANCE_FAILURE'
  process.exitCode = 1
} finally {
  if(appServer){appServer.kill('SIGTERM');await new Promise(resolve=>{if(appServer.exitCode!==null)return resolve();appServer.once('exit',resolve);setTimeout(()=>{appServer.kill('SIGKILL');resolve()},5000).unref()})}
  if (started) {
    try { command('supabase', ['stop', '--no-backup', '--project-id', project]); evidence.teardown = 'PASS' }
    catch { evidence.teardown = 'FAIL'; process.exitCode = 1 }
  }
  const safe = JSON.stringify(evidence, null, 2)
  if (process.env.RUNNER_TEMP) writeFileSync(resolve(process.env.RUNNER_TEMP, 'w4-supabase-safe-evidence.json'), safe + '\n')
  console.log(safe)
}
