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

const context = {
  serverWorkspaceId: 'workspace-synthetic-1',
  scopeLabel: 'Mi cartera',
  windowLabel: 'Hoy',
  statusCatalog,
}

test('adapts stable v0 states without claiming known pagination', () => {
  const result = adaptDashboardTelecomV0(input(), context)

  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.equal(result.page.data.tasks.status, 'ready')
  if (result.page.data.tasks.status !== 'ready') return

  assert.deepEqual(result.page.data.tasks.completeness, { kind: 'unknown' })
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

test('never throws for malformed runtime JSON and rejects global shape failures', () => {
  const missingField = input() as unknown as Record<string, unknown>
  delete missingField.generated_at
  const extraField = { ...input(), raw_url: '/workspace/foreign' }
  const wrongNestedType = { ...input(), meetings: 'not-a-section' }
  const badWorkspaceId = { ...input(), workspace_id: '../foreign' }
  const oversized = {
    ...input(),
    tasks: {
      ...(input().tasks as object),
      state: 'ready',
      items: Array.from({ length: 201 }, (_, index) => ({
        id: `task-${index}`,
        customer_id: null,
        title: 'Tarea sintética',
        due_at: null,
        status: 'pending',
      })),
      source_updated_at: timestamp,
      error: null,
    },
  }

  for (const candidate of [
    null,
    [],
    {},
    missingField,
    extraField,
    wrongNestedType,
    badWorkspaceId,
    oversized,
  ]) {
    assert.doesNotThrow(() => adaptDashboardTelecomV0(candidate, context))
    const result = adaptDashboardTelecomV0(candidate, context)
    if (candidate === wrongNestedType || candidate === oversized) {
      assert.equal(result.ok, true)
    } else {
      assert.equal(result.ok, false)
    }
  }
})

test('one malformed item rejects its section and preserves valid widgets', () => {
  const source = input() as unknown as Record<string, unknown>
  source.tasks = {
    state: 'ready',
    items: Array.from({ length: 50 }, (_, index) => ({
      id: index === 24 ? '../foreign-task' : `task-synthetic-${index}`,
      customer_id: null,
      title: `Seguimiento ${index}`,
      due_at: '2026-09-26T10:00:00Z',
      status: 'pending',
    })),
    source_updated_at: timestamp,
    error: null,
  }

  const result = adaptDashboardTelecomV0(source, context)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.page.data.tasks.status, 'error')
  assert.equal(result.page.data.meetings.status, 'empty')
})

test('rejects impossible section dates without Date normalization', () => {
  const source = input()
  if (source.tasks.state !== 'ready') return
  source.tasks.items[0].due_at = '2026-02-31T10:00:00Z'

  const result = adaptDashboardTelecomV0(source, context)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.page.data.tasks.status, 'error')
})

test('denies a response outside the server-resolved workspace', () => {
  const result = adaptDashboardTelecomV0(input(), {
    ...context,
    serverWorkspaceId: 'workspace-foreign',
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.code, 'forbidden')
})
