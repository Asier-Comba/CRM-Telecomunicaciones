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
    outputDescription: 'Fixture result.',
    permission: `${name}:execute`,
    accessClass,
    confirmationPolicy: accessClass === 'SENSITIVE_WRITE' || accessClass === 'IRREVERSIBLE' ? 'preview_confirm' : 'none',
    idempotencyRequired: write,
    tenantScope: { source: 'server_context', modelMayChooseWorkspace: false },
    handler: async () => ({ ok: true }),
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
})
