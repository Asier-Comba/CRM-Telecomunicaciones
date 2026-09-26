import assert from 'node:assert/strict'
import test from 'node:test'

import { mapFrontendError } from './w2-error-taxonomy.ts'
import {
  createFormState,
  formTelemetryProjection,
  transitionForm,
} from './w2-form-controller.ts'
import type {
  ProtectedRequestRef,
  TenantEpoch,
} from './w2-tenant-boundary.ts'

type FixtureForm = { name: string; note: string }
const initial: FixtureForm = { name: 'Empresa sintética', note: 'Nota privada' }
const epochA = 'epoch_a' as TenantEpoch
const epochB = 'epoch_b' as TenantEpoch
const requestA = 'request_a' as ProtectedRequestRef
const requestB = 'request_b' as ProtectedRequestRef

const submitting = () => {
  const editing = transitionForm(createFormState(initial), {
    type: 'field_changed',
    fieldId: 'name',
    value: 'Empresa actualizada',
  }).state
  return transitionForm(editing, {
    type: 'submit_requested',
    tenantEpoch: epochA,
    requestRef: requestA,
  }).state
}

test('field edits are immutable and double-submit is ignored', () => {
  const state = submitting()
  const duplicate = transitionForm(state, {
    type: 'submit_requested',
    tenantEpoch: epochA,
    requestRef: requestB,
  }).state

  assert.equal(state.status, 'submitting')
  assert.deepEqual(duplicate, state)
  assert.deepEqual(initial, {
    name: 'Empresa sintética',
    note: 'Nota privada',
  })
})

test('validation focuses first invalid field and announces one safe summary', () => {
  const result = transitionForm(submitting(), {
    type: 'validation_failed',
    tenantEpoch: epochA,
    requestRef: requestA,
    errors: [
      { fieldId: 'name', code: 'required', message: 'Es obligatorio.' },
      { fieldId: 'note', code: 'too_long', message: 'Es demasiado largo.' },
    ],
  })

  assert.equal(result.state.status, 'invalid')
  assert.deepEqual(result.effects, [
    { type: 'focus', fieldId: 'name' },
    {
      type: 'announce',
      message: 'Revisa los campos indicados.',
      politeness: 'assertive',
    },
  ])
})

test('unknown validation field and late response are ignored', () => {
  const current = submitting()
  const unknownField = transitionForm(current, {
    type: 'validation_failed',
    tenantEpoch: epochA,
    requestRef: requestA,
    errors: [
      { fieldId: 'workspaceId', code: 'not_allowed', message: 'No permitido.' },
    ],
  }).state
  const late = transitionForm(current, {
    type: 'submit_succeeded',
    tenantEpoch: epochB,
    requestRef: requestB,
  }).state

  assert.deepEqual(unknownField, current)
  assert.deepEqual(late, current)
})

test('conflict retains edits and uses closed safe copy', () => {
  const error = mapFrontendError({ code: 'conflict', raw: 'database row version' })
  const result = transitionForm(submitting(), {
    type: 'submit_conflicted',
    tenantEpoch: epochA,
    requestRef: requestA,
    error,
  })

  assert.equal(result.state.status, 'conflict')
  assert.equal(result.state.values?.name, 'Empresa actualizada')
  assert.equal(JSON.stringify(result).includes('database row version'), false)
})

test('success and access revocation scrub all form values', () => {
  const succeeded = transitionForm(submitting(), {
    type: 'submit_succeeded',
    tenantEpoch: epochA,
    requestRef: requestA,
  }).state
  const revoked = transitionForm(submitting(), { type: 'access_revoked' }).state

  assert.deepEqual(succeeded, {
    status: 'succeeded',
    values: null,
    dirtyFields: [],
  })
  assert.deepEqual(revoked, {
    status: 'access_revoked',
    values: null,
    dirtyFields: [],
  })
  assert.equal(JSON.stringify({ succeeded, revoked }).includes('Nota privada'), false)
})

test('telemetry contains state and count but never form values or field names', () => {
  const state = submitting()
  const telemetry = formTelemetryProjection(state)
  assert.deepEqual(telemetry, { status: 'submitting', dirtyFieldCount: 1 })
  assert.equal(JSON.stringify(telemetry).includes('Empresa'), false)
  assert.equal(JSON.stringify(telemetry).includes('name'), false)
})
