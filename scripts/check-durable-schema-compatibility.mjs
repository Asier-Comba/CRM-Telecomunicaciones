/** Run npm run build first. Static review only, never DB/adapter acceptance. */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { reviewDurableSource } from '../dist/src/assistant/durable-source-probe.js'
const sha = process.argv[2]
if (!/^[a-f0-9]{40}$/.test(sha ?? '')) { console.error('Expected exact platform SHA'); process.exit(2) }
try {
  const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', sha, '--', 'supabase/migrations'], { encoding: 'utf8' }).trim().split('\n').filter(p => p.endsWith('.sql')).sort()
  const migrations = paths.map(path => ({ path, sql: execFileSync('git', ['show', `${sha}:${path}`], { encoding: 'utf8' }) }))
  const runtime = readFileSync(new URL('../src/assistant/reconciliation.ts', import.meta.url), 'utf8')
  const emitted = [...new Set([...runtime.matchAll(/'(effect_absence_verified_[a-z_]+)'/g)].map(m => m[1]))]
  const report = reviewDurableSource(migrations, emitted)
  console.log(JSON.stringify({ sourceSha: sha, ...report }, null, 2))
  process.exitCode = report.status === 'review_required' ? 2 : report.status === 'mismatch' ? 1 : 0
} catch { console.error('STATIC_REVIEW_REQUIRED: source unavailable; no compatibility conclusion.'); process.exitCode = 2 }
