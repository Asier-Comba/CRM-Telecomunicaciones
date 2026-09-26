import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TELECOM_CONTRACTS_V0,
  TELECOM_CONTRACT_VERSION,
} from '../../src/lib/contracts/telecom-v0.ts'

test('telecom v0 exposes the stable version and required customer fields', () => {
  assert.equal(TELECOM_CONTRACT_VERSION, 'telecom.v0')
  assert.equal(TELECOM_CONTRACTS_V0.stability, 'STABLE')
  assert.deepEqual(TELECOM_CONTRACTS_V0.entities.customer, [
    'id',
    'workspace_id',
    'legal_name',
    'display_name',
    'tax_identifier',
    'assigned_user',
    'contacts',
    'lifecycle',
    'status',
  ])
})

test('telecom v0 publishes contract, service/line and dashboard boundaries', () => {
  assert.deepEqual(TELECOM_CONTRACTS_V0.entities.contract, [
    'id',
    'workspace_id',
    'customer_id',
    'operator',
    'service_ids',
    'line_ids',
    'start_date',
    'commitment_end_date',
    'end_date',
    'renewal_window',
    'assignee',
    'lifecycle',
  ])
  assert.deepEqual(TELECOM_CONTRACTS_V0.entities.service_line, [
    'id',
    'workspace_id',
    'kind',
    'customer_id',
    'contract_id',
    'operator',
    'plan_tariff',
    'status',
  ])
  assert.deepEqual(TELECOM_CONTRACTS_V0.entities.dashboard, [
    'tasks',
    'meetings',
    'renewals',
    'permanence_alerts',
    'opportunities',
    'generated_at',
  ])
})
