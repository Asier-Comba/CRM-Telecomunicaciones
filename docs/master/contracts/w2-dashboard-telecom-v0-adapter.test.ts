import assert from 'node:assert/strict'
import test from 'node:test'

import {
  adaptDashboardTelecomV0,
  type DashboardReadModelV0Input,
  type DashboardStatusCatalog,
} from './w2-dashboard-telecom-v0-adapter.ts'

const timestamp = '2026-09-26T09:00:00Z'

const statusCatalog: DashboardStatusCatalog = {
  tasks: { pending: 'Pendiente' },
  meetings: { scheduled: 'Programada' },
  renewals: { upcoming: 'Próxima' },
  permanence_alerts: { approaching: 'Próxima' },
  opportunities: { follow_up: 'Requiere seguimiento' },
}

const emptySection = {
  state: 'empty',
  items: [],
  source_updated_at: timestamp,
  error: null,
} as const

const input = (): DashboardReadModelV0Input => ({
  contract_version: 'telecom.v0',
  workspace_id: 'workspace-synthetic-1',
  generated_at: timestamp,
  tasks: {
    state: 'ready',
    items: [
      {
        id: 'task-synthetic-1',
        customer_id: 'customer-synthetic-1',
        title: 'Preparar seguimiento',
        due_at: '2026-09-26T10:00:00Z',
        status: 'pending',
      },
    ],
    source_updated_at: timestamp,
    error: null,
  },
  meetings: emptySection,
  renewals: emptySection,
  permanence_alerts: emptySection,
  opportunities: emptySection,
})

const context = { scopeLabel: 'Mi cartera', windowLabel: 'Hoy', statusCatalog }

test('adapts stable v0 states without claiming complete pagination', () => {
  const result = adaptDashboardTelecomV0(input(), context)

  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.equal(result.page.data.tasks.status, 'ready')
  if (result.page.data.tasks.status !== 'ready') return

  assert.deepEqual(result.page.data.tasks.completeness, {
    kind: 'bounded',
    hasMore: true,
  })
  assert.equal(result.page.data.tasks.data[0]?.customer, null)
  assert.deepEqual(result.page.data.tasks.data[0]?.destination, {
    kind: 'task',
    taskId: 'task-synthetic-1',
  })
})

test('does not invent contract navigation for renewal and permanence IDs', () => {
  const source = input()
  source.renewals = {
    state: 'ready',
    items: [
      {
        id: 'renewal-synthetic-1',
        customer_id: 'customer-synthetic-1',
        title: 'Revisar renovación',
        due_at: '2026-10-01T08:00:00Z',
        status: 'upcoming',
      },
    ],
    source_updated_at: timestamp,
    error: null,
  }

  const result = adaptDashboardTelecomV0(source, context)
  assert.equal(result.ok, true)
  if (!result.ok || result.page.data.renewals.status !== 'ready') return

  assert.equal(result.page.data.renewals.data[0]?.destination, undefined)
})

test('rejects unknown status values instead of inventing display semantics', () => {
  const source = input()
  if (source.tasks.state !== 'ready') return
  source.tasks.items[0].status = 'backend_private_status'

  const result = adaptDashboardTelecomV0(source, context)
  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.deepEqual(result.page.data.tasks, {
    status: 'error',
    error: {
      code: 'invalid_response',
      message: 'No se ha podido interpretar esta información.',
      retryable: false,
    },
  })
})

test('rejects route-bearing IDs outside the closed grammar', () => {
  const source = input()
  if (source.tasks.state !== 'ready') return
  source.tasks.items[0].id = '../foreign-task'

  const result = adaptDashboardTelecomV0(source, context)
  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.equal(result.page.data.tasks.status, 'error')
})

test('redacts arbitrary source errors and preserves only retryability', () => {
  const source = input()
  source.tasks = {
    state: 'error',
    items: [],
    source_updated_at: timestamp,
    error: {
      code: 'provider_exception_customer_123',
      message: 'raw provider payload containing customer data',
      retryable: true,
    },
  }

  const result = adaptDashboardTelecomV0(source, context)
  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.deepEqual(result.page.data.tasks, {
    status: 'error',
    error: {
      code: 'temporarily_unavailable',
      message: 'Esta sección no está disponible ahora mismo.',
      retryable: true,
    },
  })
})

test('rejects malformed freshness timestamps at the boundary', () => {
  const source = input()
  source.generated_at = 'today'

  const result = adaptDashboardTelecomV0(source, context)
  assert.deepEqual(result, {
    ok: false,
    error: {
      code: 'invalid_response',
      message: 'No se ha podido interpretar esta información.',
      retryable: false,
    },
  })
})
