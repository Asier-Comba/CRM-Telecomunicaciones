import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DURABLE_FOUNDATION_PATH, reviewDurableSource } from '../src/assistant/durable-source-probe.js'
import { CONFIRMATION_STATES, IDEMPOTENCY_STATES, OUTBOX_STATES } from '../src/assistant/durable-contracts.js'

// Synthetic source fixtures exercise the parser only, NOT a real schema.
const codes = ['effect_absence_verified_retryable', 'effect_absence_verified_terminal']
const quoted = (values: readonly string[]) => values.map(v => `'${v}'`).join(',')
const ddl = ['assistant_confirmations', 'assistant_operations', 'assistant_effect_outbox'].map((name, i) => `create table public.${name} (
state text not null default '${['issued', 'reserved', 'pending'][i]}' check (state in (${quoted([CONFIRMATION_STATES, IDEMPOTENCY_STATES, OUTBOX_STATES][i]!)})),
digest_algorithm text check (digest_algorithm='w3-canonical-json-localeCompare-sha256-v1'),
lease_expires_at timestamptz not null,
failure_code text check (failure_code is null or failure_code in (${quoted(codes)}))
);`).join('\n')
const run = (sql: string) => reviewDurableSource([{ path: DURABLE_FOUNDATION_PATH, sql }], codes)

test('foundation probe detects state, digest, absence-code and lease drift without DB claims', () => {
  assert.equal(run(ddl).status, 'foundation_shape_compatible')
  for (const changed of [ddl.replace("'completed'", "'invented'"), ddl.replace('sha256-v1', 'sha256-v2'), ddl.replaceAll(codes[0]!, 'collapsed_error'), ddl.replaceAll('timestamptz not null,', 'timestamptz,')]) assert.equal(run(changed).status, 'mismatch')
  assert.equal(run(ddl.replaceAll('state text', 'state varchar')).status, 'review_required')
  assert.equal(run(ddl).nativeDurabilityAccepted, false)
  const actual = readFileSync('src/assistant/reconciliation.ts', 'utf8')
  assert.deepEqual([...new Set([...actual.matchAll(/'(effect_absence_verified_[a-z_]+)'/g)].map(m => m[1]))].sort(), [...codes].sort())
})

test('forward migrations cannot be ignored or mistaken for effective schema acceptance', () => {
  for (const sql of ['alter table public.assistant_operations alter column lease_expires_at set not null;', 'create table public.assistant_safe_results (schema_version text);', 'alter table public.assistant_audit_intents add column changed boolean;']) {
    const result = reviewDurableSource([{ path: DURABLE_FOUNDATION_PATH, sql: ddl }, { path: 'supabase/migrations/20260929000000_forward.sql', sql }], codes)
    assert.equal(result.status, 'review_required')
    assert.equal(result.forwardMigrationsRequiringReview.length, 1)
  }
  assert.equal(reviewDurableSource([], codes).status, 'review_required')
})
