import assert from 'node:assert/strict'
import test from 'node:test'

import {
  initialAssistantReadState,
  transitionAssistantRead,
  type AssistantContinuationRef,
  type AssistantRequestRef,
} from './w2-assistant-read-session.ts'

const requestA = 'assistant-request-a' as AssistantRequestRef
const requestB = 'assistant-request-b' as AssistantRequestRef
const cursorA = 'assistant-cursor-a' as AssistantContinuationRef

const streaming = () => {
  const requesting = transitionAssistantRead(
    initialAssistantReadState<{ answer: string }>(),
    { type: 'request_requested', requestRef: requestA },
  )
  return transitionAssistantRead(requesting, {
    type: 'stream_started',
    requestRef: requestA,
    sequence: 0,
  })
}

test('streaming text never enables structured controls', () => {
  const state = transitionAssistantRead(streaming(), {
    type: 'answer_delta',
    requestRef: requestA,
    sequence: 1,
    text: 'Respuesta parcial sintética',
  })
  assert.equal(state.status, 'streaming')
  assert.equal(state.structuredControlsEnabled, false)
})

test('structured controls appear only after matching validated grounded final', () => {
  const state = transitionAssistantRead(streaming(), {
    type: 'validated_final',
    requestRef: requestA,
    sequence: 1,
    final: {
      response: { answer: 'Respuesta validada' },
      grounded: true,
      result: 'complete',
      hasStructuredControls: true,
    },
  })
  assert.equal(state.status, 'complete')
  assert.equal(state.structuredControlsEnabled, true)
})

test('partial grounded final is explicit and may expose validated controls', () => {
  const state = transitionAssistantRead(streaming(), {
    type: 'validated_final',
    requestRef: requestA,
    sequence: 1,
    final: {
      response: { answer: 'Resultado parcial validado' },
      grounded: true,
      result: 'partial',
      hasStructuredControls: true,
      continuationRef: cursorA,
    },
  })
  assert.equal(state.status, 'partial')
  assert.equal(state.structuredControlsEnabled, true)
})

test('ungrounded final cannot smuggle structured controls', () => {
  const current = streaming()
  const next = transitionAssistantRead(current, {
    type: 'validated_final',
    requestRef: requestA,
    sequence: 1,
    final: {
      response: { answer: 'Sin evidencia' },
      grounded: false,
      result: 'partial',
      hasStructuredControls: true,
    },
  })
  assert.deepEqual(next, current)
})

test('malformed final, permission change and revocation clear protected result state', () => {
  const malformed = transitionAssistantRead(streaming(), {
    type: 'malformed_final',
    requestRef: requestA,
    sequence: 1,
  })
  assert.deepEqual(malformed, {
    status: 'malformed_final',
    structuredControlsEnabled: false,
  })

  for (const type of [
    'permission_changed',
    'entity_disappeared',
    'access_revoked',
  ] as const) {
    const state = transitionAssistantRead(streaming(), { type })
    assert.equal(state.status, type)
    assert.equal(state.structuredControlsEnabled, false)
    assert.equal('requestRef' in state, false)
  }
})

test('expired continuation and stale result disable all structured controls', () => {
  const partial = transitionAssistantRead(streaming(), {
    type: 'validated_final',
    requestRef: requestA,
    sequence: 1,
    final: {
      response: { answer: 'Resultado parcial' },
      grounded: true,
      result: 'partial',
      hasStructuredControls: true,
      continuationRef: cursorA,
    },
  })
  const expired = transitionAssistantRead(partial, {
    type: 'continuation_expired',
    requestRef: requestA,
    continuationRef: cursorA,
  })
  assert.equal(expired.status, 'continuation_expired')
  assert.equal(expired.structuredControlsEnabled, false)

  const stale = transitionAssistantRead(partial, {
    type: 'result_became_stale',
    requestRef: requestA,
  })
  assert.equal(stale.status, 'stale')
  assert.equal(stale.structuredControlsEnabled, false)
})

test('late request and non-monotonic stream events are ignored', () => {
  const current = streaming()
  const foreign = transitionAssistantRead(current, {
    type: 'answer_delta',
    requestRef: requestB,
    sequence: 1,
    text: 'No debe aparecer',
  })
  const repeated = transitionAssistantRead(current, {
    type: 'answer_delta',
    requestRef: requestA,
    sequence: 0,
    text: 'No debe aparecer',
  })
  assert.deepEqual(foreign, current)
  assert.deepEqual(repeated, current)
})

test('stream interruption keeps validated delta text but never controls', () => {
  const withText = transitionAssistantRead(streaming(), {
    type: 'answer_delta',
    requestRef: requestA,
    sequence: 1,
    text: 'Texto parcial validado',
  })
  const interrupted = transitionAssistantRead(withText, {
    type: 'stream_interrupted',
    requestRef: requestA,
  })
  assert.deepEqual(interrupted, {
    status: 'stream_interrupted',
    requestRef: requestA,
    text: 'Texto parcial validado',
    structuredControlsEnabled: false,
  })
})

test('unsolicited or late stream starts cannot replace the active request', () => {
  const initial = initialAssistantReadState<{ answer: string }>()
  const unsolicited = transitionAssistantRead(initial, {
    type: 'stream_started',
    requestRef: requestA,
    sequence: 0,
  })
  assert.deepEqual(unsolicited, initial)

  const active = streaming()
  const late = transitionAssistantRead(active, {
    type: 'stream_started',
    requestRef: requestB,
    sequence: 0,
  })
  assert.deepEqual(late, active)
})

test('security terminal states cannot be resurrected by a new stream event', () => {
  for (const type of [
    'permission_changed',
    'entity_disappeared',
    'access_revoked',
  ] as const) {
    const terminal = transitionAssistantRead(streaming(), { type })
    const requested = transitionAssistantRead(terminal, {
      type: 'request_requested',
      requestRef: requestB,
    })
    const started = transitionAssistantRead(requested, {
      type: 'stream_started',
      requestRef: requestB,
      sequence: 0,
    })
    assert.deepEqual(started, terminal)
  }
})
