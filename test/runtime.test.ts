import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAPABILITY_CONTRACT_VERSION,
  type AuditEvent,
  type AuditSink,
  type CapabilityDefinition,
  type CapabilityResult,
  type ExecutionContext,
  type IdempotencyStore,
} from '../src/assistant/contracts.js'
import { CapabilityRegistry } from '../src/assistant/registry.js'
import { argumentsDigest, AssistantRuntime } from '../src/assistant/runtime.js'

class MemoryIdempotency implements IdempotencyStore {
  readonly values = new Map<string, CapabilityResult>()

  async get(workspaceId: string, capability: string, key: string): Promise<CapabilityResult | null> {
    return this.values.get(`${workspaceId}:${capability}:${key}`) ?? null
  }

  async put(workspaceId: string, capability: string, key: string, result: CapabilityResult): Promise<void> {
    this.values.set(`${workspaceId}:${capability}:${key}`, result)
  }
}

class MemoryAudit implements AuditSink {
  readonly events: AuditEvent[] = []

  async emit(event: AuditEvent): Promise<void> {
    this.events.push(event)
  }
}

const context: ExecutionContext = {
  actorId: 'user-a',
  workspaceId: 'workspace-a',
  permissions: new Set(['customer:read', 'contract:update']),
  requestId: 'req-1',
  now: new Date('2026-09-25T12:00:00.000Z'),
}

function readCapability(): CapabilityDefinition<{ query: string }, { count: number }> {
  return {
    contractVersion: CAPABILITY_CONTRACT_VERSION,
    name: 'crm.customer.search',
    description: 'Searches customers inside the server-resolved workspace.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', minLength: 1, maxLength: 120 } },
      required: ['query'],
      additionalProperties: false,
    },
    outputDescription: 'A bounded list of customer references.',
    permission: 'customer:read',
    accessClass: 'READ',
    confirmationPolicy: 'none',
    idempotencyRequired: false,
    tenantScope: { source: 'server_context', modelMayChooseWorkspace: false },
    handler: async () => ({ count: 1 }),
  }
}

function sensitiveCapability(counter: { value: number }): CapabilityDefinition<{ contractId: string }, { updated: boolean }> {
  return {
    contractVersion: CAPABILITY_CONTRACT_VERSION,
    name: 'crm.contract.update',
    description: 'Updates a contract after deterministic authorization and confirmation.',
    inputSchema: {
      type: 'object',
      properties: { contractId: { type: 'string', minLength: 1, maxLength: 100 } },
      required: ['contractId'],
      additionalProperties: false,
    },
    outputDescription: 'Update result.',
    permission: 'contract:update',
    accessClass: 'SENSITIVE_WRITE',
    confirmationPolicy: 'preview_confirm',
    idempotencyRequired: true,
    tenantScope: { source: 'server_context', modelMayChooseWorkspace: false },
    handler: async () => {
      counter.value += 1
      return { updated: true }
    },
  }
}

function runtimeWith(...capabilities: CapabilityDefinition[]) {
  const registry = new CapabilityRegistry()
  capabilities.forEach((capability) => registry.register(capability))
  const audit = new MemoryAudit()
  return { runtime: new AssistantRuntime({ registry, idempotency: new MemoryIdempotency(), audit }), audit }
}

test('executes a grounded read with server context', async () => {
  const { runtime, audit } = runtimeWith(readCapability())
  const result = await runtime.execute(context, { capability: 'crm.customer.search', input: { query: 'ACME' } })

  assert.equal(result.status, 'SUCCESS')
  assert.deepEqual(result.data, { count: 1 })
  assert.equal(audit.events[0]?.workspaceId, 'workspace-a')
})

test('rejects tenant selectors even when nested', async () => {
  const { runtime } = runtimeWith(readCapability())
  const result = await runtime.execute(context, {
    capability: 'crm.customer.search',
    input: { query: 'ACME', filter: { workspaceId: 'workspace-b' } },
  })

  assert.equal(result.status, 'POLICY_BLOCK')
  assert.equal(result.error?.code, 'tenant_selector_forbidden')
})

test('does not reveal whether a capability exists when permission is missing', async () => {
  const { runtime } = runtimeWith(readCapability())
  const deniedContext = { ...context, permissions: new Set<string>() }
  const result = await runtime.execute(deniedContext, { capability: 'crm.customer.search', input: { query: 'ACME' } })

  assert.equal(result.status, 'FORBIDDEN')
  assert.equal(result.error?.code, 'capability_forbidden')
})

test('binds confirmation to actor, workspace, capability and canonical arguments', async () => {
  const counter = { value: 0 }
  const { runtime } = runtimeWith(sensitiveCapability(counter))
  const input = { contractId: 'contract-1' }
  const preview = await runtime.execute(context, {
    capability: 'crm.contract.update',
    input,
    idempotencyKey: 'idem-1',
  })

  assert.equal(preview.status, 'CONFIRMATION_REQUIRED')
  assert.equal(preview.confirmation?.argumentsDigest, argumentsDigest(input))

  const forged = await runtime.execute(context, {
    capability: 'crm.contract.update',
    input,
    idempotencyKey: 'idem-1',
    confirmation: {
      actionId: 'action-1',
      actorId: 'user-a',
      workspaceId: 'workspace-b',
      capability: 'crm.contract.update',
      argumentsDigest: argumentsDigest(input),
      expiresAt: '2026-09-25T12:05:00.000Z',
    },
  })

  assert.equal(forged.status, 'INVALID_CONFIRMATION')
  assert.equal(counter.value, 0)
})

test('replays a confirmed write idempotently', async () => {
  const counter = { value: 0 }
  const { runtime } = runtimeWith(sensitiveCapability(counter))
  const input = { contractId: 'contract-1' }
  const request = {
    capability: 'crm.contract.update',
    input,
    idempotencyKey: 'idem-1',
    confirmation: {
      actionId: 'action-1',
      actorId: 'user-a',
      workspaceId: 'workspace-a',
      capability: 'crm.contract.update',
      argumentsDigest: argumentsDigest(input),
      expiresAt: '2026-09-25T12:05:00.000Z',
    },
  }

  const first = await runtime.execute(context, request)
  const second = await runtime.execute(context, request)

  assert.equal(first.status, 'SUCCESS')
  assert.equal(second.status, 'SUCCESS')
  assert.equal(second.replayed, true)
  assert.equal(counter.value, 1)
})

test('registry rejects unsafe contract combinations', () => {
  const registry = new CapabilityRegistry()
  const invalid = { ...readCapability(), accessClass: 'SENSITIVE_WRITE', idempotencyRequired: true } as CapabilityDefinition

  assert.throws(() => registry.register(invalid), /confirmation_required_for_risky_write/)
})
