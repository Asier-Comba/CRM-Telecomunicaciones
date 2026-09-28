/** Narrow static contract probe for W5's foundation DDL. NOT a SQL interpreter,
 * database execution, migration validator or durable/security acceptance test. */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
const sha = process.argv[2]
if (!/^[a-f0-9]{40}$/.test(sha ?? '')) { console.error('Expected exact W5 SHA'); process.exit(2) }
try {
  const path = 'supabase/migrations/20260927183000_assistant_durable_foundation.sql'
  const sql = execFileSync('git', ['show', `${sha}:${path}`], { encoding: 'utf8' })
  const operation = sql.split('create table public.assistant_operations (')[1]?.split('create table public.assistant_effect_outbox (')[0]
  const whitelist = operation?.match(/failure_code text check \(failure_code is null or failure_code in \(([\s\S]*?)\)\)/)?.[1]
  if (!operation || !whitelist) throw new Error('unrecognized_foundation_shape')
  const accepted = [...whitelist.matchAll(/'([a-z_]+)'/g)].map(m => m[1])
  const runtime = readFileSync(new URL('../src/assistant/reconciliation.ts', import.meta.url), 'utf8')
  const emitted = [...new Set([...runtime.matchAll(/'(effect_absence_verified_[a-z_]+)'/g)].map(m => m[1]))]
  if (emitted.length !== 2) throw new Error('unrecognized_runtime_shape')
  const missing = emitted.filter(code => !accepted.includes(code))
  const nullableLease = /lease_expires_at timestamptz\s*,/.test(operation)
  console.log(JSON.stringify({ sourceSha: sha, sourcePath: path, evidence: 'static_source_only_no_database',
    failureCodeCompatibility: { runtimeEmits: emitted, ddlAccepts: accepted, missing, compatible: missing.length === 0 },
    leaseMapping: { ddlAllowsNull: nullableLease, w3RecordRequiresTimestamp: true, explicitMappingRequired: nullableLease },
    nativeDurabilityAccepted: false }, null, 2))
  if (missing.length || nullableLease) process.exitCode = 1
} catch { console.error('STATIC_REVIEW_REQUIRED: source shape unavailable or changed; no compatibility conclusion.'); process.exitCode = 2 }
