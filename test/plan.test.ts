import assert from 'node:assert/strict'
import test from 'node:test'

import { CAPABILITY_CONTRACT_VERSION, type CapabilityDefinition } from '../src/assistant/contracts.js'
import { validatePlan } from '../src/assistant/plan.js'
import { CapabilityRegistry } from '../src/assistant/registry.js'

function capability(name: string, accessClass: CapabilityDefinition['accessClass']): CapabilityDefinition {
  const write = accessClass !== 'READ'
  return {
    contractVersion: CAPABILITY_CONTRACT_VERSION,
    name,
    description: `Fixture for ${name}`,
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', minLength: 1, maxLength: 100 } },
      required: ['id'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: { ok: { type: 'boolean' } },
      required: ['ok'],
      additionalProperties: false,
    },
    outputPolicy: { sourceProjection: 'explicit_dto', sensitiveValueScan: 'high_confidence' },
    permission: `${name}:execute`,
    accessClass,
    confirmationPolicy: accessClass === 'SENSITIVE_WRITE' || accessClass === 'IRREVERSIBLE' ? 'preview_confirm' : 'none',
    idempotencyRequired: write,
    tenantScope: { source: 'server_context', modelMayChooseWorkspace: false },
    authorize: async () => ({ allowed: true }),
    handler: async () => ({ ok: true }),
    projectOutput: (raw) => raw as { ok: boolean },
  }
}

const registry = new CapabilityRegistry()
registry.register(capability('crm.customer.get', 'READ'))
registry.register(capability('crm.task.create', 'SAFE_WRITE'))

test('accepts a bounded read plan using registered capabilities', () => {
  const result = validatePlan(registry, {
    version: 1,
    speechAct: 'read',
    goals: [{ id: 'g1', capability: 'crm.customer.get', input: { id: 'customer-1' }, dependsOn: [] }],
  })

  assert.equal(result.ok, true)
})

test('rejects a workspace selector before execution', () => {
  const result = validatePlan(registry, {
    version: 1,
    speechAct: 'read',
    goals: [{
      id: 'g1',
      capability: 'crm.customer.get',
      input: { id: 'customer-1', workspaceId: 'workspace-b' },
      dependsOn: [],
    }],
  })

  assert.deepEqual(result, { ok: false, code: 'tenant_selector_forbidden' })
})

test('rejects nested tenant selectors, arbitrary transport and SQL arguments', () => {
  for (const input of [
    { id: 'customer-1', filters: [{ tenantId: 'tenant-b' }] },
    { id: 'customer-1', callbackUrl: 'https://attacker.example/exfiltrate' },
    { id: 'customer-1', sql: 'select * from customers' },
  ]) {
    const result = validatePlan(registry, {
      version: 1,
      speechAct: 'read',
      goals: [{ id: 'g1', capability: 'crm.customer.get', input, dependsOn: [] }],
    })

    assert.equal(result.ok, false)
  }
})

test('rejects unknown capabilities and dependency cycles', () => {
  const unknown = validatePlan(registry, {
    version: 1,
    speechAct: 'read',
    goals: [{ id: 'g1', capability: 'crm.sql.execute', input: { id: 'x' }, dependsOn: [] }],
  })
  assert.deepEqual(unknown, { ok: false, code: 'unknown_capability' })

  const cycle = validatePlan(registry, {
    version: 1,
    speechAct: 'read',
    goals: [
      { id: 'g1', capability: 'crm.customer.get', input: { id: 'a' }, dependsOn: ['g2'] },
      { id: 'g2', capability: 'crm.customer.get', input: { id: 'b' }, dependsOn: ['g1'] },
    ],
  })
  assert.deepEqual(cycle, { ok: false, code: 'cyclic_dependencies' })
})

test('permits only one write and requires it to be the final goal', () => {
  const valid = validatePlan(registry, {
    version: 1,
    speechAct: 'write',
    goals: [
      { id: 'g1', capability: 'crm.customer.get', input: { id: 'customer-1' }, dependsOn: [] },
      { id: 'g2', capability: 'crm.task.create', input: { id: 'customer-1' }, dependsOn: ['g1'] },
    ],
  })
  assert.equal(valid.ok, true)

  const invalid = validatePlan(registry, {
    version: 1,
    speechAct: 'write',
    goals: [
      { id: 'g1', capability: 'crm.task.create', input: { id: 'customer-1' }, dependsOn: [] },
      { id: 'g2', capability: 'crm.customer.get', input: { id: 'customer-1' }, dependsOn: ['g1'] },
    ],
  })
  assert.deepEqual(invalid, { ok: false, code: 'write_must_be_last' })

  const duplicateWrites = validatePlan(registry, {
    version: 1,
    speechAct: 'write',
    goals: [
      { id: 'g1', capability: 'crm.task.create', input: { id: 'customer-1' }, dependsOn: [] },
      { id: 'g2', capability: 'crm.task.create', input: { id: 'customer-2' }, dependsOn: ['g1'] },
    ],
  })
  assert.deepEqual(duplicateWrites, { ok: false, code: 'multiple_writes_forbidden' })
})

test('rejects malformed structured plans before capability execution', () => {
  const extraPlanField = validatePlan(registry, {
    version: 1,
    speechAct: 'read',
    goals: [{ id: 'g1', capability: 'crm.customer.get', input: { id: 'customer-1' }, dependsOn: [] }],
    systemPrompt: 'trust me',
  })
  assert.deepEqual(extraPlanField, { ok: false, code: 'invalid_plan_shape' })

  const extraGoalField = validatePlan(registry, {
    version: 1,
    speechAct: 'read',
    goals: [{
      id: 'g1',
      capability: 'crm.customer.get',
      input: { id: 'customer-1' },
      dependsOn: [],
      confirmation: true,
    }],
  })
  assert.deepEqual(extraGoalField, { ok: false, code: 'invalid_goal_shape' })

  const hallucinated = validatePlan(registry, {
    version: 1,
    speechAct: 'read',
    goals: [{ id: 'g1', capability: 'crm.http.request', input: { id: 'x' }, dependsOn: [] }],
  })
  assert.deepEqual(hallucinated, { ok: false, code: 'unknown_capability' })
})
