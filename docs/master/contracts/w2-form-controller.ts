import type { FrontendSafeError } from './w2-error-taxonomy.ts'
import type {
  ProtectedRequestRef,
  TenantEpoch,
} from './w2-tenant-boundary.ts'

export type FormFieldError = Readonly<{
  fieldId: string
  code: 'required' | 'invalid_format' | 'too_long' | 'not_allowed'
  message: string
}>

type EditableForm<T extends Record<string, unknown>> = Readonly<{
  values: Readonly<T>
  dirtyFields: readonly (keyof T & string)[]
}>

export type FormControllerState<T extends Record<string, unknown>> =
  | ({ status: 'pristine' | 'editing' } & EditableForm<T>)
  | ({
      status: 'submitting'
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
    } & EditableForm<T>)
  | ({
      status: 'invalid'
      errors: readonly FormFieldError[]
      focusFieldId: string
    } & EditableForm<T>)
  | ({
      status: 'failed_retryable' | 'conflict'
      error: FrontendSafeError
    } & EditableForm<T>)
  | { status: 'succeeded'; values: null; dirtyFields: readonly [] }
  | { status: 'access_revoked'; values: null; dirtyFields: readonly [] }

export type FormControllerEvent<T extends Record<string, unknown>> =
  | { type: 'field_changed'; fieldId: keyof T & string; value: T[keyof T] }
  | {
      type: 'submit_requested'
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
    }
  | {
      type: 'validation_failed'
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
      errors: readonly FormFieldError[]
    }
  | {
      type: 'submit_failed'
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
      error: FrontendSafeError
    }
  | {
      type: 'submit_conflicted'
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
      error: FrontendSafeError
    }
  | {
      type: 'submit_succeeded'
      tenantEpoch: TenantEpoch
      requestRef: ProtectedRequestRef
    }
  | { type: 'access_revoked' }

export type FormEffect =
  | { type: 'focus'; fieldId: string }
  | { type: 'announce'; message: string; politeness: 'polite' | 'assertive' }

export type FormTransition<T extends Record<string, unknown>> = Readonly<{
  state: FormControllerState<T>
  effects: readonly FormEffect[]
}>

export const createFormState = <T extends Record<string, unknown>>(
  values: T,
): FormControllerState<T> => ({
  status: 'pristine',
  values: Object.freeze({ ...values }),
  dirtyFields: [],
})

const editable = <T extends Record<string, unknown>>(
  state: FormControllerState<T>,
): state is Extract<FormControllerState<T>, { values: Readonly<T> }> =>
  state.values !== null

const matchesSubmit = <T extends Record<string, unknown>>(
  state: FormControllerState<T>,
  event: {
    tenantEpoch: TenantEpoch
    requestRef: ProtectedRequestRef
  },
): state is Extract<FormControllerState<T>, { status: 'submitting' }> =>
  state.status === 'submitting' &&
  state.tenantEpoch === event.tenantEpoch &&
  state.requestRef === event.requestRef

export function transitionForm<T extends Record<string, unknown>>(
  current: FormControllerState<T>,
  event: FormControllerEvent<T>,
): FormTransition<T> {
  if (event.type === 'access_revoked') {
    return {
      state: { status: 'access_revoked', values: null, dirtyFields: [] },
      effects: [
        {
          type: 'announce',
          message: 'Tu acceso ha cambiado. Los datos del formulario se han retirado.',
          politeness: 'assertive',
        },
      ],
    }
  }
  if (current.status === 'access_revoked' || current.status === 'succeeded') {
    return { state: current, effects: [] }
  }

  if (event.type === 'field_changed') {
    if (current.status === 'submitting' || !editable(current)) {
      return { state: current, effects: [] }
    }
    const dirtyFields = current.dirtyFields.includes(event.fieldId)
      ? current.dirtyFields
      : [...current.dirtyFields, event.fieldId]
    return {
      state: {
        status: 'editing',
        values: Object.freeze({ ...current.values, [event.fieldId]: event.value }),
        dirtyFields,
      },
      effects: [],
    }
  }

  if (event.type === 'submit_requested') {
    return editable(current) && current.status !== 'submitting'
      ? {
          state: {
            status: 'submitting',
            values: current.values,
            dirtyFields: current.dirtyFields,
            tenantEpoch: event.tenantEpoch,
            requestRef: event.requestRef,
          },
          effects: [],
        }
      : { state: current, effects: [] }
  }

  if (!matchesSubmit(current, event)) {
    return { state: current, effects: [] }
  }

  if (event.type === 'validation_failed') {
    const unique = new Set(event.errors.map(({ fieldId }) => fieldId))
    if (
      event.errors.length === 0 ||
      unique.size !== event.errors.length ||
      event.errors.some(({ fieldId }) => !(fieldId in current.values))
    ) {
      return { state: current, effects: [] }
    }
    return {
      state: {
        status: 'invalid',
        values: current.values,
        dirtyFields: current.dirtyFields,
        errors: [...event.errors],
        focusFieldId: event.errors[0].fieldId,
      },
      effects: [
        { type: 'focus', fieldId: event.errors[0].fieldId },
        {
          type: 'announce',
          message: 'Revisa los campos indicados.',
          politeness: 'assertive',
        },
      ],
    }
  }

  if (event.type === 'submit_failed' || event.type === 'submit_conflicted') {
    return {
      state: {
        status:
          event.type === 'submit_conflicted' ? 'conflict' : 'failed_retryable',
        values: current.values,
        dirtyFields: current.dirtyFields,
        error: event.error,
      },
      effects: [
        {
          type: 'announce',
          message: event.error.title,
          politeness: event.error.announcement,
        },
      ],
    }
  }

  return {
    state: { status: 'succeeded', values: null, dirtyFields: [] },
    effects: [
      { type: 'announce', message: 'Cambios guardados.', politeness: 'polite' },
    ],
  }
}

export const formTelemetryProjection = <T extends Record<string, unknown>>(
  state: FormControllerState<T>,
): Readonly<{
  status: FormControllerState<T>['status']
  dirtyFieldCount: number
}> => ({
  status: state.status,
  dirtyFieldCount: state.dirtyFields.length,
})

