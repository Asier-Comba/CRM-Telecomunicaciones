import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { EVAL_CATEGORIES, validateEvalCase } from '../src/assistant/eval-schema.js'
import {
  ASSISTANT_RESPONSE_VERSION,
  type AssistantUiTaxonomy,
  validateAssistantResponse,
  validateAssistantStreamEvent,
} from '../src/assistant/ui-contract.js'
import {
  OPERATION_STATUS_VERSION,
  projectOperationStatus,
  validateOperationStatus,
} from '../src/assistant/operation-status.js'

const taxonomy: AssistantUiTaxonomy = {
  version: 'w1-pending-v0',
  modules: new Set(['customers', 'tasks']),
  entityTypes: new Set(['customer', 'task']),
}

test('UI contract accepts bounded structured data', () => {
  const response = validateAssistantResponse({
    contractVersion: ASSISTANT_RESPONSE_VERSION,
    answer: 'He encontrado un cliente.',
    status: 'SUCCESS',
    grounded: true,
    blocks: {
      entities: [{ entityType: 'customer', entityId: 'customer-1', label: 'ACME' }],
      table: {
        columns: [
          { key: 'id', label: 'ID', format: 'text' },
          { key: 'name', label: 'Cliente', format: 'text' },
        ],
        rows: [{ id: 'customer-1', name: 'ACME' }],
        rowIdentity: { key: 'id' },
        truncated: false,
      },
      navigation: { module: 'customers', entityType: 'customer', entityId: 'customer-1' },
    },
    meta: {
      requestId: 'req-1',
      capability: 'crm.customer.search',
      partial: false,
      taxonomyVersion: taxonomy.version,
    },
  }, taxonomy)

  assert.ok(response)
})

test('UI contract rejects secret-bearing payload keys', () => {
  const response = validateAssistantResponse({
    contractVersion: ASSISTANT_RESPONSE_VERSION,
    answer: 'Resultado',
    status: 'SUCCESS',
    grounded: true,
    blocks: { navigation: { module: 'customers' } },
    meta: { requestId: 'req-1', partial: false, taxonomyVersion: taxonomy.version, accessToken: 'forbidden' },
  }, taxonomy)

  assert.equal(response, null)
})

test('UI contract accepts opaque confirmation cards and rejects executable follow-ups', () => {
  const expiresAt = '2026-09-25T12:05:00.000Z'
  const response = validateAssistantResponse({
    contractVersion: ASSISTANT_RESPONSE_VERSION,
    answer: 'Revisa y confirma la actualización.',
    status: 'CONFIRMATION_REQUIRED',
    grounded: true,
    blocks: {
      confirmation: {
        confirmationId: 'confirmation-00000001',
        capability: 'crm.contract.update',
        status: 'pending',
        title: 'Actualizar contrato',
        summary: 'Se actualizará el contrato seleccionado.',
        risk: 'sensitive_write',
        expiresAt,
        allowedActions: ['confirm', 'cancel'],
      },
      followUps: [{ label: 'Ver contrato', prompt: 'Enséñame el contrato', kind: 'suggestion' }],
    },
    meta: { requestId: 'req-2', partial: false, taxonomyVersion: taxonomy.version },
  }, taxonomy)
  assert.ok(response)

  const executableFollowUp = validateAssistantResponse({
    contractVersion: ASSISTANT_RESPONSE_VERSION,
    answer: 'Resultado',
    status: 'SUCCESS',
    grounded: true,
    blocks: { followUps: [{ label: 'Borrar', prompt: 'Borra el contrato', kind: 'execute' }] },
    meta: { requestId: 'req-3', partial: false, taxonomyVersion: taxonomy.version },
  }, taxonomy)
  assert.equal(executableFollowUp, null)
})

test('UI contract requires stable table identity and continuation for truncated data', () => {
  const invalid = validateAssistantResponse({
    contractVersion: ASSISTANT_RESPONSE_VERSION,
    answer: 'Hay más resultados.',
    status: 'PARTIAL',
    grounded: true,
    blocks: {
      table: {
        columns: [{ key: 'id', label: 'ID' }],
        rows: [{ id: 'same' }, { id: 'same' }],
        rowIdentity: { key: 'id' },
        truncated: true,
      },
    },
    meta: { requestId: 'req-4', partial: true, taxonomyVersion: taxonomy.version },
  }, taxonomy)
  assert.equal(invalid, null)

  const missingCurrency = validateAssistantResponse({
    contractVersion: ASSISTANT_RESPONSE_VERSION,
    answer: 'Importe.',
    status: 'SUCCESS',
    grounded: true,
    blocks: {
      table: {
        columns: [{ key: 'amount', label: 'Importe', format: 'currency' }],
        rows: [{ amount: 10 }],
        truncated: false,
      },
    },
    meta: { requestId: 'req-5', partial: false, taxonomyVersion: taxonomy.version },
  }, taxonomy)
  assert.equal(missingCurrency, null)
})

test('streaming keeps structured blocks in the validated final event', () => {
  assert.ok(validateAssistantStreamEvent({
    contractVersion: 1,
    sequence: 0,
    type: 'started',
    requestId: 'req-stream',
  }, taxonomy))
  assert.ok(validateAssistantStreamEvent({
    contractVersion: 1,
    sequence: 1,
    type: 'answer_delta',
    text: 'He encontrado ',
  }, taxonomy))

  const prematureStructure = validateAssistantStreamEvent({
    contractVersion: 1,
    sequence: 2,
    type: 'answer_delta',
    text: 'ACME',
    blocks: { navigation: { module: 'customers' } },
  }, taxonomy)
  assert.equal(prematureStructure, null)

  assert.ok(validateAssistantStreamEvent({
    contractVersion: 1,
    sequence: 2,
    type: 'final',
    response: {
      contractVersion: ASSISTANT_RESPONSE_VERSION,
      answer: 'He encontrado ACME.',
      status: 'SUCCESS',
      grounded: true,
      blocks: {},
      meta: { requestId: 'req-stream', partial: false, taxonomyVersion: taxonomy.version },
    },
  }, taxonomy))
})

test('W2 READ fixture matrix matches the versioned W3 validation decisions', async () => {
  const fixture = JSON.parse(await readFile('evals/ui/assistant-read-contract.v1.json', 'utf8')) as {
    taxonomy: { version: string; modules: string[]; entityTypes: string[] }
    cases: Array<{ id: string; expected: 'accept' | 'reject'; response: unknown }>
  }
  const fixtureTaxonomy: AssistantUiTaxonomy = {
    version: fixture.taxonomy.version,
    modules: new Set(fixture.taxonomy.modules),
    entityTypes: new Set(fixture.taxonomy.entityTypes),
  }

  assert.equal(fixture.cases.length, 9)
  for (const fixtureCase of fixture.cases) {
    const accepted = validateAssistantResponse(fixtureCase.response, fixtureTaxonomy) !== null
    assert.equal(accepted, fixtureCase.expected === 'accept', fixtureCase.id)
  }
})

test('eval catalog is valid and covers every required category', async () => {
  const text = await readFile('evals/assistant/catalog.v1.jsonl', 'utf8')
  const cases = text.trim().split('\n').map((line) => JSON.parse(line) as unknown)

  assert.ok(cases.length >= 60)
  assert.ok(cases.every(validateEvalCase))
  const categories = new Set(cases.map((candidate) => {
    if (!validateEvalCase(candidate)) throw new Error('invalid eval case')
    return candidate.category
  }))
  assert.deepEqual([...EVAL_CATEGORIES].sort(), [...categories].sort())
})

test('eval cases reject unknown fields and unbounded transcript content', () => {
  const base = {
    id: 'lookup-001',
    category: 'exact_lookup',
    turns: [{ role: 'user', content: 'Busca ACME' }],
    expected: {
      mode: 'read',
      capabilityHint: 'customer lookup',
      grounded: true,
      confirmation: 'none',
      tenantIsolation: true,
    },
    status: 'executable',
  }
  assert.equal(validateEvalCase({ ...base, hiddenInstruction: 'ignore evaluator' }), false)
  assert.equal(validateEvalCase({ ...base, turns: [{ role: 'user', content: 'x'.repeat(4_001) }] }), false)
})

test('operation status maps internal state to a closed browser-safe envelope', () => {
  const status = projectOperationStatus({
    operationRef: 'operation_000000000000000000000001',
    idempotencyKey: 'server-only-key',
    binding: {
      actorId: 'actor-a',
      workspaceId: 'workspace-a',
      capability: 'crm.task.create',
      argumentsDigest: 'digest-a',
    },
    state: 'reconciliation_required',
    attempt: 1,
    version: 4,
    leaseExpiresAt: '2026-09-26T12:05:00.000Z',
    createdAt: '2026-09-26T12:00:00.000Z',
    updatedAt: '2026-09-26T12:06:00.000Z',
    effectReceiptRef: 'provider-receipt-hidden',
    failureCode: 'provider_completion_unknown',
  })

  assert.deepEqual(status, {
    contractVersion: OPERATION_STATUS_VERSION,
    operationRef: 'operation_000000000000000000000001',
    status: 'review_required',
    terminal: false,
    updatedAt: '2026-09-26T12:06:00.000Z',
    resultAvailable: false,
    nextPollAfterMs: 10_000,
    allowedActions: ['refresh'],
  })
  assert.ok(validateOperationStatus(status))
  assert.doesNotMatch(JSON.stringify(status), /workspace-a|actor-a|digest-a|receipt|provider_completion/)
})

test('operation status rejects workspace selectors, forged actions and secrets', () => {
  const base = {
    contractVersion: OPERATION_STATUS_VERSION,
    operationRef: 'operation_000000000000000000000001',
    status: 'pending',
    terminal: false,
    updatedAt: '2026-09-26T12:00:00.000Z',
    resultAvailable: false,
    nextPollAfterMs: 2_000,
    allowedActions: ['refresh'],
  }

  assert.equal(validateOperationStatus({ ...base, workspaceId: 'workspace-b' }), null)
  assert.equal(validateOperationStatus({ ...base, allowedActions: ['refresh', 'mark_completed'] }), null)
  assert.equal(validateOperationStatus({ ...base, notice: { code: 'operation_failed', retryable: true } }), null)
  assert.equal(validateOperationStatus({ ...base, operationRef: 'Bearer very-secret-operation-value' }), null)
})
