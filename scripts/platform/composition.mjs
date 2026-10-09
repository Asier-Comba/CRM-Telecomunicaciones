import {spawnSync} from 'node:child_process'
import {readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {root, readJson} from './lib.mjs'

export const sources = {
  platform: '85d3a60a7b34af4aac5465f3b30130f742e49900',
  product: '1c5cd51b4f96f83c0bf938026226aa53369f2d0e',
}
const platformPaths = ['src/app/api/health/live/route.ts', 'src/app/api/health/ready/route.ts', 'src/app/fonts.css', 'src/app/layout.tsx']
function git(args) {
  const result = spawnSync('git', args, {cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 30000})
  if (result.status !== 0) throw new Error('COMPOSITION_GIT_FAILED')
  return result.stdout
}
function tree(source, path) {
  return Object.fromEntries(git(['ls-tree', '-r', '-z', source, '--', path]).split('\0').filter(Boolean).map(row => {
    const [metadata, name] = row.split('\t'); return [name, metadata.split(' ')[2]]
  }))
}
export function unionMigrations(platform, product) {
  const shared = Object.keys(platform).filter(name => name in product).sort()
  if (shared.some(name => platform[name] !== product[name])) throw new Error('SHARED_MIGRATION_CHANGED')
  const union = {...platform, ...product}
  if (new Set(Object.keys(union).map(name => name.split('/').at(-1).slice(0, 14))).size !== Object.keys(union).length) throw new Error('MIGRATION_VERSION_COLLISION')
  return {shared: shared.length, platform_only: Object.keys(platform).filter(name => !(name in product)).sort(), product_only: Object.keys(product).filter(name => !(name in platform)).sort(), union}
}
export function checkComposition(expected, actual) {
  if (Object.keys(expected).length !== Object.keys(actual).length || Object.entries(expected).some(([path, blob]) => actual[path] !== blob)) throw new Error('COMPOSITION_BLOB_DRIFT')
  return {result: 'PASS', files: Object.keys(expected).length}
}
export function composition() {
  const pm = tree(sources.platform, 'supabase/migrations'), qm = tree(sources.product, 'supabase/migrations')
  const migrations = unionMigrations(pm, qm)
  const product = tree(sources.product, 'src'), platform = tree(sources.platform, 'src')
  for (const path of platformPaths) {
    if (!platform[path]) throw new Error('PLATFORM_PROVENANCE_MISSING')
    product[path] = platform[path]
  }
  const index = Object.fromEntries(git(['ls-files', '-s', '-z', '--', 'src', 'supabase/migrations']).split('\0').filter(Boolean).map(row => {
    const [metadata, path] = row.split('\t'), fields = metadata.split(' ')
    if (fields[2] !== '0') throw new Error('UNRESOLVED_COMPOSITION')
    return [path, fields[1]]
  }))
  checkComposition({...product, ...migrations.union}, index)
  if (git(['diff', '--name-only', '--', 'src', 'supabase/migrations']).trim()) throw new Error('UNSTAGED_SOURCE_DRIFT')
  const listed = readJson('docs/master/contracts/backend-bootstrap-requirements.json').database.migrations
  const names = Object.keys(migrations.union).map(path => path.split('/').at(-1)).sort()
  if (JSON.stringify(listed) !== JSON.stringify(names)) throw new Error('BOOTSTRAP_MIGRATION_DRIFT')
  const manifest = readJson('scripts/security/native-postgres/function-privileges.json')
  const functions = manifest.functions.filter(f => f.signature.startsWith('public.'))
  if (functions.some(f => f.definer && f.public)) throw new Error('PUBLIC_DEFINER_EXECUTION')
  return {
    version: 4, sources, merge_base: git(['merge-base', sources.platform, sources.product]).trim(),
    status: 'STATIC_COMPOSITION_CANDIDATE', composition_accepted: false,
    migrations: {platform: Object.keys(pm).length, product: Object.keys(qm).length, shared: migrations.shared, union: names.length, platform_only: migrations.platform_only, product_only: migrations.product_only, applied_database: 'NOT_PROVEN'},
    source_blobs: {product_paths_preserved: Object.keys(product).length - platformPaths.length, platform_paths_preserved: platformPaths, migration_blobs_identical: true},
    public_rpc_manifest: {count: functions.length, actual_database_comparison: 'REQUIRES_EXACT_CI'},
    acceptance: {native_db: 'REQUIRES_EXACT_CI', supabase: 'REQUIRES_EXACT_CI', recovery: 'REQUIRES_EXACT_CI', product_browser: 'REQUIRES_EXACT_CI', independent_review: 'PENDING', staging: 'NOT_PROVEN', production: 'NOT_AUTHORIZED'},
    ai_writes: 'NOT_ACCEPTED_DO_NOT_ACTIVATE', external_effects: 'NONE',
  }
}
if (process.argv[1]?.endsWith('composition.mjs')) {
  try {
    const report = composition(), content = JSON.stringify(report, null, 2) + '\n'
    const path = join(root, 'docs/master/platform/ENTERPRISE_4_COMPATIBILITY.json')
    if (process.argv.includes('--write')) writeFileSync(path, content)
    else if (readFileSync(path, 'utf8').replaceAll('\r\n', '\n') !== content) throw new Error('COMPOSITION_REPORT_DRIFT')
    console.log(content.trim())
  } catch { console.error('{"status":"FAIL","error":"COMPOSITION_CHECK_FAILED"}'); process.exitCode = 1 }
}
