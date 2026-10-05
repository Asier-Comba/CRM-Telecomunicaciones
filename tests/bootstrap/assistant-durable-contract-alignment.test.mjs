import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const foundation = await readFile(
  'supabase/migrations/20260927183000_assistant_durable_foundation.sql',
  'utf8',
)
const alignment = await readFile(
  'supabase/migrations/20260929212000_align_assistant_durable_contract.sql',
  'utf8',
)

test('published durable foundation remains immutable and alignment is forward-only', () => {
  assert.match(foundation, /lease_expires_at timestamptz,/)
  assert.doesNotMatch(foundation, /effect_absence_verified_retryable/)
  assert.match(alignment, /drop constraint assistant_operations_failure_code_check/)
})

test('W3 verified-absence reconciliation outcomes are persisted without translation', () => {
  assert.match(alignment, /'effect_absence_verified_retryable'/)
  assert.match(alignment, /'effect_absence_verified_terminal'/)
  assert.doesNotMatch(alignment, /update[\s\S]*failure_code\s*=/i)
})

test('every operation receives one authoritative durable lease timestamp', () => {
  assert.match(
    alignment,
    /set lease_expires_at = created_at \+ interval '5 minutes'[\s\S]*where lease_expires_at is null/,
  )
  assert.match(
    alignment,
    /alter column lease_expires_at set default \(statement_timestamp\(\) \+ interval '5 minutes'\)/,
  )
  assert.match(alignment, /alter column lease_expires_at set not null/)
  assert.doesNotMatch(alignment, /clock_timestamp\(\)/)
})

test('alignment migration preserves the closed raw-access boundary', () => {
  assert.doesNotMatch(
    alignment,
    /\bgrant\s+(?:all|select|insert|update|delete|execute)\b/i,
  )
  assert.doesNotMatch(alignment, /\b(create|replace)\s+(?:policy|function)\b/i)
})
