import assert from 'node:assert/strict'
import test from 'node:test'

import {
  adaptServiceLinesV0,
  adaptTelecomContractsV0,
  type PortfolioAdapterContext,
  type ServiceLineV0Input,
  type TelecomContractV0Input,
} from './w2-telecom-portfolio-v0.ts'

const context: PortfolioAdapterContext = {
  serverWorkspaceId: 'workspace-synthetic-1',
  expectedCustomerId: 'customer-synthetic-1',
  sourceUpdatedAt: '2026-09-26T11:00:00Z',
}

const contract = (): TelecomContractV0Input => ({
  id: 'contract-synthetic-1',
  workspace_id: context.serverWorkspaceId,
  customer_id: context.expectedCustomerId,
  operator: { id: 'operator-synthetic-1', display_name: 'Operador Sintético' },
  service_ids: ['service-synthetic-1'],
  line_ids: ['line-synthetic-1', 'line-synthetic-2'],
  start_date: '2025-01-01',
  commitment_end_date: '2026-12-31',
  end_date: null,
  renewal_window: {
    opens_on: '2026-10-01',
    closes_on: '2026-12-31',
    status: 'not_open',
  },
  assignee: { id: 'user-synthetic-1', display_name: 'Comercial Uno' },
  lifecycle: 'active',
})

const serviceLine = (kind: 'service' | 'line'): ServiceLineV0Input => ({
  id: `${kind}-synthetic-1`,
  workspace_id: context.serverWorkspaceId,
  kind,
  customer_id: context.expectedCustomerId,
  contract_id: 'contract-synthetic-1',
  operator: { id: 'operator-synthetic-1', display_name: 'Operador Sintético' },
  plan_tariff: { id: 'plan-synthetic-1', display_name: 'Plan Empresa' },
  status: 'active',
})

test('contract summary preserves dates/status and hides display identifier', () => {
  const result = adaptTelecomContractsV0([contract()], context)
  assert.equal(result.status, 'ready')
  if (result.status !== 'ready') return
  assert.deepEqual(result.completeness, { kind: 'unknown' })
  assert.deepEqual(result.data[0]?.displayIdentifier, { visibility: 'hidden' })
  assert.deepEqual(result.data[0]?.permanence, {
    status: 'known',
    endsOn: '2026-12-31',
  })
  assert.deepEqual(result.data[0]?.renewal, {
    status: 'not_open',
    opensOn: '2026-10-01',
    closesOn: '2026-12-31',
  })
  assert.equal(result.data[0]?.serviceCount, 1)
  assert.equal(result.data[0]?.lineCount, 2)
})

test('null permanence remains not_available and never becomes an invented date', () => {
  const source = contract()
  source.commitment_end_date = null
  const result = adaptTelecomContractsV0([source], context)
  assert.equal(result.status, 'ready')
  if (result.status === 'ready') {
    assert.deepEqual(result.data[0]?.permanence, { status: 'not_available' })
  }
})

test('service and line DTOs become distinct presentation collections', () => {
  const result = adaptServiceLinesV0(
    [serviceLine('service'), serviceLine('line')],
    context,
  )
  assert.equal(result.services.status, 'ready')
  assert.equal(result.lines.status, 'ready')
  if (result.services.status === 'ready' && result.lines.status === 'ready') {
    assert.equal(result.services.data[0]?.kind, 'service')
    assert.equal(result.lines.data[0]?.kind, 'line')
    assert.deepEqual(result.lines.data[0]?.displayIdentifier, {
      visibility: 'hidden',
    })
    assert.equal(result.lines.data[0]?.planTariff?.label, 'Plan Empresa')
  }
})

test('empty portfolio is successful empty, not unsupported or error', () => {
  const contracts = adaptTelecomContractsV0([], context)
  const services = adaptServiceLinesV0([], context)
  assert.equal(contracts.status, 'empty')
  assert.equal(services.services.status, 'empty')
  assert.equal(services.lines.status, 'empty')
})

test('foreign workspace or customer fails closed for the whole section', () => {
  const foreignContract = contract()
  foreignContract.workspace_id = 'workspace-foreign'
  assert.equal(
    adaptTelecomContractsV0([foreignContract], context).status,
    'forbidden',
  )

  const foreignLine = serviceLine('line')
  foreignLine.customer_id = 'customer-foreign'
  const result = adaptServiceLinesV0([foreignLine], context)
  assert.equal(result.services.status, 'forbidden')
  assert.equal(result.lines.status, 'forbidden')
})

test('one malformed portfolio item rejects the section instead of being dropped', () => {
  const contracts = Array.from({ length: 50 }, (_, index) => ({
    ...contract(),
    id: `contract-synthetic-${index}`,
    start_date: index === 24 ? '2026-02-31' : '2025-01-01',
  }))
  assert.equal(adaptTelecomContractsV0(contracts, context).status, 'error')
})

test('closed parsers reject malformed, extra, enum and date input without throws', () => {
  const malformedContract = { ...contract(), unexpected: true }
  const invalidRenewal = {
    ...contract(),
    renewal_window: { ...contract().renewal_window, status: 'maybe' },
  }
  const reversedWindow = {
    ...contract(),
    renewal_window: {
      ...contract().renewal_window,
      opens_on: '2026-12-31',
      closes_on: '2026-10-01',
    },
  }
  const invalidLine = { ...serviceLine('line'), plan_tariff: [] }

  for (const candidate of [null, {}, malformedContract, invalidRenewal, reversedWindow]) {
    assert.doesNotThrow(() => adaptTelecomContractsV0(candidate, context))
    assert.equal(adaptTelecomContractsV0(candidate, context).status, 'error')
  }
  assert.doesNotThrow(() => adaptServiceLinesV0([invalidLine], context))
  const result = adaptServiceLinesV0([invalidLine], context)
  assert.equal(result.services.status, 'error')
  assert.equal(result.lines.status, 'error')
})
