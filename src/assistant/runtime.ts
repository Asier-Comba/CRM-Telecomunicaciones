import { createHash } from 'node:crypto'

import type {
  AccessClass,
  AuditEvent,
  AuditSink,
  CapabilityDefinition,
  CapabilityRequest,
  CapabilityResult,
  ConfirmationBinding,
  ConfirmationStore,
  ExecutionContext,
  IdempotencyBinding,
  IdempotencyInspection,
  IdempotencyReservation,
  IdempotencyStore,
  ResultStatus,
} from './contracts.js'
import { CapabilityRegistry } from './registry.js'
import { containsTenantSelector, validateObject, validateValue } from './schema.js'

const CONFIRMATION_TTL_MS = 5 * 60 * 1000
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{16,128}$/

type RuntimeDependencies = {
  registry: CapabilityRegistry
  confirmations: ConfirmationStore
  idempotency: IdempotencyStore
  audit: AuditSink
}

type TraceState = Pick<AuditEvent, 'reasonCode' | 'confirmationState' | 'idempotencyState'>

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right))
    return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${canonical(nested)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function argumentsDigest(input: Record<string, unknown>): string {
  return createHash('sha256').update(canonical(input)).digest('hex')
}

function failure(
  capability: string,
  status: ResultStatus,
  code: string,
  message: string,
  retryable = false,
): CapabilityResult {
  return { status, capability, error: { code, message, retryable } }
}

function denial(): CapabilityResult {
  return failure('assistant.capability', 'FORBIDDEN', 'capability_forbidden', 'No tienes permiso para realizar esa operación.')
}

function binding(context: ExecutionContext, capability: string, digest: string): ConfirmationBinding {
  return {
    actorId: context.actorId,
    workspaceId: context.workspaceId,
    capability,
    argumentsDigest: digest,
  }
}

function idempotencyResult(
  capability: string,
  decision: IdempotencyInspection | Exclude<IdempotencyReservation, { status: 'reserved' }>,
): CapabilityResult | null {
  if (decision.status === 'replay') return { ...decision.result, replayed: true }
  if (decision.status === 'conflict') {
    return failure(capability, 'CONFLICT', 'idempotency_conflict', 'La clave de idempotencia pertenece a otra operación.')
  }
  if (decision.status === 'in_progress') {
    return failure(capability, 'CONFLICT', 'idempotency_in_progress', 'La operación ya está en curso.', true)
  }
  return null
}

export class AssistantRuntime {
  readonly #registry: CapabilityRegistry
  readonly #confirmations: ConfirmationStore
  readonly #idempotency: IdempotencyStore
  readonly #audit: AuditSink

  constructor(dependencies: RuntimeDependencies) {
    this.#registry = dependencies.registry
    this.#confirmations = dependencies.confirmations
    this.#idempotency = dependencies.idempotency
    this.#audit = dependencies.audit
  }

  async execute(context: ExecutionContext, request: CapabilityRequest): Promise<CapabilityResult> {
    const startedAt = Date.now()
    const initialTrace: TraceState = {
      reasonCode: 'request_received',
      confirmationState: 'not_applicable',
      idempotencyState: 'not_applicable',
    }
    const definition = this.#registry.get(request.capability)

    if (!definition) {
      return this.#finish(context, request.capability, 'UNKNOWN', denial(), startedAt, {
        ...initialTrace,
        reasonCode: 'capability_unknown',
      })
    }

    if (!context.permissions.has(definition.permission)) {
      return this.#finish(context, definition.name, definition.accessClass, denial(), startedAt, {
        ...initialTrace,
        reasonCode: 'permission_denied',
      })
    }

    if (containsTenantSelector(request.input)) {
      const result = failure(definition.name, 'POLICY_BLOCK', 'tenant_selector_forbidden', 'El espacio de trabajo se resuelve en el servidor.')
      return this.#finish(context, definition.name, definition.accessClass, result, startedAt, {
        ...initialTrace,
        reasonCode: 'tenant_selector_forbidden',
      })
    }

    const validation = validateObject(definition.inputSchema, request.input)
    if (!validation.ok) {
      const result = failure(definition.name, 'INVALID_INPUT', validation.code, 'Los datos de la operación no son válidos.')
      return this.#finish(context, definition.name, definition.accessClass, result, startedAt, {
        ...initialTrace,
        reasonCode: validation.code,
      })
    }

    let authorization
    try {
      authorization = await definition.authorize(context, request.input)
    } catch {
      const result = failure(definition.name, 'UNAVAILABLE', 'authorization_unavailable', 'No se pudo verificar el acceso.', true)
      return this.#finish(context, definition.name, definition.accessClass, result, startedAt, {
        ...initialTrace,
        reasonCode: 'authorization_unavailable',
      })
    }
    if (!authorization.allowed) {
      return this.#finish(context, definition.name, definition.accessClass, denial(), startedAt, {
        ...initialTrace,
        reasonCode: authorization.reason,
      })
    }

    const write = definition.accessClass !== 'READ'
    if (write && (!request.idempotencyKey || !IDEMPOTENCY_KEY.test(request.idempotencyKey))) {
      const result = failure(definition.name, 'INVALID_INPUT', 'invalid_idempotency_key', 'La operación necesita una clave de idempotencia válida.')
      return this.#finish(context, definition.name, definition.accessClass, result, startedAt, {
        ...initialTrace,
        reasonCode: 'invalid_idempotency_key',
      })
    }

    const digest = argumentsDigest(request.input)
    const operationBinding: IdempotencyBinding = binding(context, definition.name, digest)
    const trace: TraceState = { ...initialTrace }

    if (write && request.idempotencyKey) {
      let inspection: IdempotencyInspection
      try {
        inspection = await this.#idempotency.inspect(operationBinding, request.idempotencyKey)
      } catch {
        const result = failure(definition.name, 'UNAVAILABLE', 'idempotency_unavailable', 'No se pudo verificar la operación.', true)
        return this.#finish(context, definition.name, definition.accessClass, result, startedAt, {
          ...trace,
          reasonCode: 'idempotency_unavailable',
        })
      }
      const early = idempotencyResult(definition.name, inspection)
      if (early) {
        trace.reasonCode = early.replayed ? 'idempotency_replay' : early.error?.code ?? 'idempotency_rejected'
        trace.idempotencyState = inspection.status === 'replay'
          ? 'replayed'
          : inspection.status === 'empty'
            ? 'not_applicable'
            : inspection.status
        return this.#finish(context, definition.name, definition.accessClass, early, startedAt, trace)
      }
    }

    if (definition.confirmationPolicy === 'preview_confirm') {
      if (!request.confirmationId) {
        try {
          const issue = await this.#confirmations.issue(
            operationBinding,
            new Date(context.now.getTime() + CONFIRMATION_TTL_MS),
          )
          const result: CapabilityResult = {
            status: 'CONFIRMATION_REQUIRED',
            capability: definition.name,
            confirmation: {
              confirmationId: issue.confirmationId,
              capability: definition.name,
              expiresAt: issue.expiresAt,
            },
          }
          return this.#finish(context, definition.name, definition.accessClass, result, startedAt, {
            ...trace,
            reasonCode: 'confirmation_issued',
            confirmationState: 'issued',
          })
        } catch {
          const result = failure(definition.name, 'UNAVAILABLE', 'confirmation_unavailable', 'No se pudo preparar la confirmación.', true)
          return this.#finish(context, definition.name, definition.accessClass, result, startedAt, {
            ...trace,
            reasonCode: 'confirmation_unavailable',
            confirmationState: 'rejected',
          })
        }
      }

      let confirmation
      try {
        confirmation = await this.#confirmations.consume(request.confirmationId, operationBinding, context.now)
      } catch {
        const result = failure(definition.name, 'UNAVAILABLE', 'confirmation_unavailable', 'No se pudo verificar la confirmación.', true)
        return this.#finish(context, definition.name, definition.accessClass, result, startedAt, {
          ...trace,
          reasonCode: 'confirmation_unavailable',
          confirmationState: 'rejected',
        })
      }
      if (confirmation.status !== 'consumed') {
        const result = failure(definition.name, 'INVALID_CONFIRMATION', 'invalid_confirmation', 'La confirmación no es válida o ha caducado.')
        return this.#finish(context, definition.name, definition.accessClass, result, startedAt, {
          ...trace,
          reasonCode: `confirmation_${confirmation.status}`,
          confirmationState: 'rejected',
        })
      }
      trace.confirmationState = 'accepted'
    }

    let reservationId: string | null = null
    if (write && request.idempotencyKey) {
      let reservation: IdempotencyReservation
      try {
        reservation = await this.#idempotency.reserve(operationBinding, request.idempotencyKey)
      } catch {
        const result = failure(definition.name, 'UNAVAILABLE', 'idempotency_unavailable', 'No se pudo reservar la operación.', true)
        return this.#finish(context, definition.name, definition.accessClass, result, startedAt, {
          ...trace,
          reasonCode: 'idempotency_unavailable',
        })
      }
      if (reservation.status !== 'reserved') {
        const early = idempotencyResult(definition.name, reservation)
        if (!early) throw new Error('invalid_idempotency_decision')
        trace.reasonCode = early.replayed ? 'idempotency_replay' : early.error?.code ?? 'idempotency_rejected'
        trace.idempotencyState = reservation.status === 'replay' ? 'replayed' : reservation.status
        return this.#finish(context, definition.name, definition.accessClass, early, startedAt, trace)
      }
      reservationId = reservation.reservationId
      trace.idempotencyState = 'reserved'
    }

    let result: CapabilityResult
    try {
      const data = await definition.handler(context, request.input)
      const outputValidation = validateValue(definition.outputSchema, data)
      if (!outputValidation.ok) {
        result = failure(definition.name, 'INTERNAL_ERROR', 'invalid_capability_output', 'La operación devolvió un resultado no válido.')
        trace.reasonCode = outputValidation.code
        if (reservationId) await this.#idempotency.fail(reservationId, result)
        return this.#finish(context, definition.name, definition.accessClass, result, startedAt, trace)
      }

      result = { status: 'SUCCESS', capability: definition.name, data }
      trace.reasonCode = 'capability_success'
      if (reservationId) {
        try {
          await this.#idempotency.complete(reservationId, result)
        } catch {
          result = failure(definition.name, 'INTERNAL_ERROR', 'idempotency_commit_failed', 'La operación requiere reconciliación.')
          trace.reasonCode = 'idempotency_commit_failed'
        }
      }
    } catch {
      result = failure(definition.name, 'INTERNAL_ERROR', 'capability_failed', 'La operación no se pudo completar.')
      trace.reasonCode = 'capability_failed'
      if (reservationId) {
        try {
          await this.#idempotency.fail(reservationId, result)
        } catch {
          trace.reasonCode = 'idempotency_failure_record_failed'
        }
      }
    }

    return this.#finish(context, definition.name, definition.accessClass, result, startedAt, trace)
  }

  async cancelConfirmation(
    context: ExecutionContext,
    request: Pick<CapabilityRequest, 'capability' | 'input'> & { confirmationId: string },
  ): Promise<CapabilityResult> {
    const startedAt = Date.now()
    const definition = this.#registry.get(request.capability)
    const trace: TraceState = {
      reasonCode: 'confirmation_cancel_requested',
      confirmationState: 'rejected',
      idempotencyState: 'not_applicable',
    }
    if (!definition || !context.permissions.has(definition.permission)) {
      return this.#finish(context, request.capability, definition?.accessClass ?? 'UNKNOWN', denial(), startedAt, {
        ...trace,
        reasonCode: definition ? 'permission_denied' : 'capability_unknown',
      })
    }
    const digest = argumentsDigest(request.input)
    const decision = await this.#confirmations.cancel(
      request.confirmationId,
      binding(context, definition.name, digest),
      context.now,
    )
    if (decision.status !== 'cancelled') {
      const result = failure(definition.name, 'INVALID_CONFIRMATION', 'invalid_confirmation', 'La confirmación no es válida o ha caducado.')
      return this.#finish(context, definition.name, definition.accessClass, result, startedAt, {
        ...trace,
        reasonCode: `confirmation_${decision.status}`,
      })
    }
    return this.#finish(context, definition.name, definition.accessClass, {
      status: 'SUCCESS',
      capability: definition.name,
      data: { cancelled: true },
    }, startedAt, {
      ...trace,
      reasonCode: 'confirmation_cancelled',
      confirmationState: 'accepted',
    })
  }

  async #finish(
    context: ExecutionContext,
    capability: string,
    accessClass: AccessClass | 'UNKNOWN',
    result: CapabilityResult,
    startedAt: number,
    trace: TraceState,
  ): Promise<CapabilityResult> {
    await this.#audit.emit({
      event: 'assistant.capability.completed',
      requestId: context.requestId,
      actorId: context.actorId,
      workspaceId: context.workspaceId,
      capability,
      accessClass,
      status: result.status,
      reasonCode: trace.reasonCode,
      confirmationState: trace.confirmationState,
      idempotencyState: trace.idempotencyState,
      durationMs: Math.max(0, Date.now() - startedAt),
    })
    return result
  }
}
