import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  ACTIVITY_SUMMARY_TEXT_V1,
  renderActivitySummaryV1,
} from '../../src/lib/server/activity-summary-v1.ts'

const sql = await readFile('supabase/migrations/20260926163000_telecom_commercial_operations.sql', 'utf8')

test('database and renderer share the same closed activity summary codes', () => {
  assert.deepEqual(Object.keys(ACTIVITY_SUMMARY_TEXT_V1).sort(), [
    'entity.contacted',
    'entity.created',
    'entity.status_changed',
    'entity.updated',
    'system.imported',
    'system.synchronized',
  ])
  for (const code of Object.keys(ACTIVITY_SUMMARY_TEXT_V1)) assert.match(sql, new RegExp(`'${code.replace('.', '\\.')}''?`))
})

test('unknown activity codes never echo attacker-controlled text', () => {
  const untrusted = 'customer@example.test called +34 600 000 000'
  const rendered = renderActivitySummaryV1(untrusted)
  assert.equal(rendered, 'Actividad registrada')
  assert.doesNotMatch(rendered, /example|600/)
})
