import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createMaskedSensitiveField,
  sensitiveCopyAnnouncement,
  sensitiveFieldTelemetryProjection,
  toSensitiveCopyIntent,
  transitionSensitiveField,
  type CopyCapability,
  type RevealCapability,
  type SensitiveRequestRef,
} from './w2-sensitive-field.ts'

const reveal = 'reveal_capability_opaque' as RevealCapability
const copy = 'copy_capability_opaque' as CopyCapability
const request = 'sensitive_request_001' as SensitiveRequestRef
const raw = 'synthetic@example.invalid'

const revealing = () => {
  const masked = createMaskedSensitiveField('s••••••c@e••••••.invalid', reveal)
  return transitionSensitiveField(masked, {
    type: 'reveal_requested',
    requestRef: request,
    capability: reveal,
  })
}

const revealed = () =>
  transitionSensitiveField(revealing(), {
    type: 'server_reveal_received',
    requestRef: request,
    revealedValue: raw,
    copyCapability: copy,
    receivedAt: '2026-09-26T12:00:00Z',
    expiresAt: '2026-09-26T12:05:00Z',
  })

test('masked presentation contains no raw value', () => {
  const state = createMaskedSensitiveField('***123', reveal)
  assert.deepEqual(state, {
    visibility: 'masked',
    maskedText: '***123',
    revealCapability: reveal,
  })
  assert.equal(JSON.stringify(state).includes(raw), false)
})

test('reveal requires exact capability and matching request correlation', () => {
  const masked = createMaskedSensitiveField('***123', reveal)
  const wrong = transitionSensitiveField(masked, {
    type: 'reveal_requested',
    requestRef: request,
    capability: 'wrong_capability' as RevealCapability,
  })
  assert.deepEqual(wrong, masked)

  const late = transitionSensitiveField(revealing(), {
    type: 'server_reveal_received',
    requestRef: 'old_request' as SensitiveRequestRef,
    revealedValue: raw,
    copyCapability: copy,
    receivedAt: '2026-09-26T12:00:00Z',
    expiresAt: '2026-09-26T12:05:00Z',
  })
  assert.equal(late.visibility, 'revealing')
})

test('invalid or expired reveal response returns to masked without raw data', () => {
  for (const [receivedAt, expiresAt] of [
    ['2026-09-26T12:00:00Z', '2026-09-26T11:59:59Z'],
    ['2026-09-26T12:00:00Z', '2026-02-31T12:05:00Z'],
  ]) {
    const state = transitionSensitiveField(revealing(), {
      type: 'server_reveal_received',
      requestRef: request,
      revealedValue: raw,
      copyCapability: copy,
      receivedAt,
      expiresAt,
    })
    assert.equal(state.visibility, 'masked')
    assert.equal(JSON.stringify(state).includes(raw), false)
  }
})

test('reveal then revoke scrubs raw value and capabilities from state', () => {
  const state = revealed()
  assert.equal(state.visibility, 'revealed')
  const revoked = transitionSensitiveField(state, { type: 'access_revoked' })

  assert.equal(revoked.visibility, 'masked')
  assert.equal(JSON.stringify(revoked).includes(raw), false)
  assert.equal(JSON.stringify(revoked).includes(String(copy)), false)
})

test('copy requires current revealed value and exact live capability', () => {
  const state = revealed()
  assert.deepEqual(
    toSensitiveCopyIntent(state, copy, '2026-09-26T12:04:00Z'),
    {
      value: raw,
      auditCapability: copy,
      browserTelemetry: 'forbidden',
    },
  )
  assert.equal(
    toSensitiveCopyIntent(
      state,
      'wrong_copy' as CopyCapability,
      '2026-09-26T12:04:00Z',
    ),
    null,
  )
  assert.equal(
    toSensitiveCopyIntent(state, copy, '2026-09-26T12:05:00Z'),
    null,
  )
})

test('telemetry and copy announcement never contain sensitive values', () => {
  const state = revealed()
  const telemetry = sensitiveFieldTelemetryProjection(state)
  const announcement = sensitiveCopyAnnouncement()

  assert.deepEqual(telemetry, { visibility: 'revealed' })
  assert.deepEqual(announcement, {
    message: 'Copiado',
    politeness: 'polite',
    atomic: true,
  })
  assert.equal(JSON.stringify({ telemetry, announcement }).includes(raw), false)
})
