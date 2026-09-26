import assert from 'node:assert/strict'
import test from 'node:test'

import { validateClientTelemetry } from './w2-client-telemetry.ts'

const vocabulary = {
  statusCodes: new Set(['success', 'invalid_response', 'forbidden']),
  blockKinds: new Set(['answer', 'notice', 'table']),
}

const validEnvelope = {
  contractVersion: 1,
  statusCode: 'success',
  blockKind: 'table',
  correlationId: 'fixtureCorrelation_123456',
  durationBucket: '250_999ms',
  retryOutcome: 'not_attempted',
  releaseVersion: 'fixture-1.0.0',
  environment: 'test',
}

test('accepts the exact W4 browser telemetry allowlist', () => {
  assert.deepEqual(
    validateClientTelemetry(validEnvelope, vocabulary),
    validEnvelope,
  )
})

test('rejects customer, entity, workspace and URL identifiers', () => {
  for (const forbidden of [
    { workspaceId: 'workspace-fixture' },
    { entityId: 'customer-fixture' },
    { customerId: 'customer-fixture' },
    { url: '/clientes/customer-fixture' },
  ]) {
    assert.equal(
      validateClientTelemetry({ ...validEnvelope, ...forbidden }, vocabulary),
      null,
    )
  }
})

test('rejects prompt, answer, payload and provider details', () => {
  for (const forbidden of [
    { prompt: 'contenido sintético' },
    { answer: 'contenido sintético' },
    { payload: { any: 'value' } },
    { providerError: 'detalle no permitido' },
    { headers: { authorization: 'redacted' } },
  ]) {
    assert.equal(
      validateClientTelemetry({ ...validEnvelope, ...forbidden }, vocabulary),
      null,
    )
  }
})

test('rejects unknown codes, blocks, duration buckets and outcomes', () => {
  assert.equal(
    validateClientTelemetry(
      { ...validEnvelope, statusCode: 'provider_error_raw' },
      vocabulary,
    ),
    null,
  )
  assert.equal(
    validateClientTelemetry(
      { ...validEnvelope, blockKind: 'tool_result' },
      vocabulary,
    ),
    null,
  )
  assert.equal(
    validateClientTelemetry(
      { ...validEnvelope, durationBucket: '873ms' },
      vocabulary,
    ),
    null,
  )
  assert.equal(
    validateClientTelemetry(
      { ...validEnvelope, retryOutcome: 'maybe' },
      vocabulary,
    ),
    null,
  )
})

test('requires bounded opaque correlation and trusted build labels', () => {
  assert.equal(
    validateClientTelemetry(
      { ...validEnvelope, correlationId: 'workspace-1/customer-2' },
      vocabulary,
    ),
    null,
  )
  assert.equal(
    validateClientTelemetry(
      { ...validEnvelope, releaseVersion: 'release?token=value' },
      vocabulary,
    ),
    null,
  )
})
