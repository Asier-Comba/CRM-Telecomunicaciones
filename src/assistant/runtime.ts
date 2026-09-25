import { createHash } from 'node:crypto'

import type {
  AuditSink,
  CapabilityDefinition,
  CapabilityRequest,
  CapabilityResult,
  ConfirmationProof,
  ExecutionContext,
  IdempotencyStore,
  ResultStatus,
  StructuredValue,
} from './contracts.js'
import { CapabilityRegistry } from './registry.js'
import { containsTenantSelector, validateObject } from './schema.js'

type RuntimeDependencies = {
  registry: CapabilityRegistry
  idempotency: IdempotencyStore
  audit: AuditSink
}

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

function confirmationMatches(
  proof: ConfirmationProof,
  context: ExecutionContext,
  definition: CapabilityDefinition,
  digest: string,
): boolean {
  const expiry = Date.parse(proof.expiresAt)
  return proof.actorId === context.actorId &&
    proof.workspaceId === context.workspaceId &&
    proof.capability === definition.name &&
    proof.argumentsDigest === digest &&
    Boolean(proof.actionId) &&
    Number.isFinite(expiry) &&
    expiry > context.now.getTime()
}

function failure(capability: string, status: ResultStatus, code: string, message: string): CapabilityResult {
  return { status, capability, error: { code, message } }
}

export class AssistantRuntime {
  readonly #registry: CapabilityRegistry
  readonly #idempotency: IdempotencyStore
  readonly #audit: AuditSink

  constructor(dependencies: RuntimeDependencies) {
    this.#registry = dependencies.registry
    this.#idempotency = dependencies.idempotency
    this.#audit = dependencies.audit
  }

  async execute(context: ExecutionContext, request: CapabilityRequest): Promise<CapabilityResult> {
    const startedAt = Date.now()
    const definition = this.#registry.get(request.capability)
    let result: CapabilityResult

    if (!definition) {
      result = failure(request.capability, 'NOT_FOUND', 'capability_not_found', 'No puedo realizar esa operación.')
      await this.#emit(context, request.capability, 'UNKNOWN', result, startedAt)
      return result
    }

    if (!context.permissions.has(definition.permission)) {
      result = failure(definition.name, 'FORBIDDEN', 'capability_forbidden', 'No tienes permiso para realizar esa operación.')
      await this.#emit(context, definition.name, definition.accessClass, result, startedAt)
      return result
    }

    if (containsTenantSelector(request.input)) {
      result = failure(definition.name, 'POLICY_BLOCK', 'tenant_selector_forbidden', 'El espacio de trabajo se resuelve en el servidor.')
      await this.#emit(context, definition.name, definition.accessClass, result, startedAt)
      return result
    }

    const validation = validateObject(definition.inputSchema, request.input)
    if (!validation.ok) {
      result = failure(definition.name, 'INVALID_INPUT', validation.code, 'Los datos de la operación no son válidos.')
      await this.#emit(context, definition.name, definition.accessClass, result, startedAt)
      return result
    }

    const write = definition.accessClass !== 'READ'
    if (write && !request.idempotencyKey) {
      result = failure(definition.name, 'INVALID_INPUT', 'idempotency_key_required', 'La operación necesita una clave de idempotencia.')
      await this.#emit(context, definition.name, definition.accessClass, result, startedAt)
      return result
    }

    const digest = argumentsDigest(request.input)
    if (definition.confirmationPolicy === 'preview_confirm') {
      if (!request.confirmation) {
        result = {
          status: 'CONFIRMATION_REQUIRED',
          capability: definition.name,
          confirmation: { capability: definition.name, argumentsDigest: digest },
        }
        await this.#emit(context, definition.name, definition.accessClass, result, startedAt)
        return result
      }
      if (!confirmationMatches(request.confirmation, context, definition, digest)) {
        result = failure(definition.name, 'INVALID_CONFIRMATION', 'confirmation_mismatch', 'La confirmación no es válida o ha caducado.')
        await this.#emit(context, definition.name, definition.accessClass, result, startedAt)
        return result
      }
    }

    if (write && request.idempotencyKey) {
      const previous = await this.#idempotency.get(context.workspaceId, definition.name, request.idempotencyKey)
      if (previous) {
        result = { ...previous, replayed: true }
        await this.#emit(context, definition.name, definition.accessClass, result, startedAt)
        return result
      }
    }

    try {
      const data = await definition.handler(context, request.input) as StructuredValue
      result = { status: 'SUCCESS', capability: definition.name, data }
      if (write && request.idempotencyKey) {
        await this.#idempotency.put(context.workspaceId, definition.name, request.idempotencyKey, result)
      }
    } catch {
      result = failure(definition.name, 'INTERNAL_ERROR', 'capability_failed', 'La operación no se pudo completar.')
    }

    await this.#emit(context, definition.name, definition.accessClass, result, startedAt)
    return result
  }

  async #emit(
    context: ExecutionContext,
    capability: string,
    accessClass: CapabilityDefinition['accessClass'] | 'UNKNOWN',
    result: CapabilityResult,
    startedAt: number,
  ): Promise<void> {
    await this.#audit.emit({
      event: 'assistant.capability.completed',
      requestId: context.requestId,
      actorId: context.actorId,
      workspaceId: context.workspaceId,
      capability,
      accessClass,
      status: result.status,
      durationMs: Math.max(0, Date.now() - startedAt),
      replayed: result.replayed === true,
    })
  }
}
