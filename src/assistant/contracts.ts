export const CAPABILITY_CONTRACT_VERSION = 3 as const

export type AccessClass = 'READ' | 'SAFE_WRITE' | 'SENSITIVE_WRITE' | 'IRREVERSIBLE'
export type ConfirmationPolicy = 'none' | 'preview_confirm'

export type ResultStatus =
  | 'SUCCESS'
  | 'EMPTY'
  | 'PARTIAL'
  | 'AMBIGUOUS'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFIRMATION_REQUIRED'
  | 'INVALID_CONFIRMATION'
  | 'INVALID_INPUT'
  | 'CONFLICT'
  | 'POLICY_BLOCK'
  | 'UNAVAILABLE'
  | 'INTERNAL_ERROR'

export type JsonScalar = string | number | boolean | null
export type StructuredValue = JsonScalar | StructuredValue[] | { [key: string]: StructuredValue }

export type ValueSchema =
  | { type: 'string'; minLength?: number; maxLength: number; enum?: readonly string[] }
  | { type: 'number'; minimum?: number; maximum?: number }
  | { type: 'boolean' }
  | { type: 'null' }
  | { type: 'array'; items: ValueSchema; maxItems: number }
  | ObjectSchema

export type ObjectSchema = {
  type: 'object'
  properties: Readonly<Record<string, ValueSchema>>
  required: readonly string[]
  additionalProperties: false
}

export type ExecutionContext = {
  actorId: string
  workspaceId: string
  permissions: ReadonlySet<string>
  requestId: string
  now: Date
}

export type AuthorizationDecision =
  | { allowed: true }
  | { allowed: false; reason: 'resource_not_accessible' | 'policy_denied' }

export type CapabilityHandler<I extends Record<string, unknown>, R> = {
  bivarianceHack(context: ExecutionContext, input: I): Promise<R>
}['bivarianceHack']

export type OutputProjector<R, O extends StructuredValue> = {
  bivarianceHack(raw: R): O
}['bivarianceHack']

export type ResourceAuthorizer<I extends Record<string, unknown>> = {
  bivarianceHack(context: ExecutionContext, input: I): Promise<AuthorizationDecision>
}['bivarianceHack']

export type CapabilityDefinition<
  I extends Record<string, unknown> = Record<string, unknown>,
  R = unknown,
  O extends StructuredValue = StructuredValue,
> = {
  contractVersion: typeof CAPABILITY_CONTRACT_VERSION
  name: string
  description: string
  inputSchema: ObjectSchema
  outputSchema: ValueSchema
  outputPolicy: {
    sourceProjection: 'explicit_dto'
    sensitiveValueScan: 'high_confidence'
  }
  permission: string
  accessClass: AccessClass
  confirmationPolicy: ConfirmationPolicy
  idempotencyRequired: boolean
  tenantScope: {
    source: 'server_context'
    modelMayChooseWorkspace: false
  }
  authorize: ResourceAuthorizer<I>
  handler: CapabilityHandler<I, R>
  projectOutput: OutputProjector<R, O>
}

export type ConfirmationBinding = {
  actorId: string
  workspaceId: string
  capability: string
  argumentsDigest: string
}

export type ConfirmationIssue = {
  confirmationId: string
  expiresAt: string
}

export type ConfirmationDecision =
  | { status: 'consumed' | 'cancelled' }
  | { status: 'not_found' | 'expired' | 'already_used' | 'binding_mismatch' }

export interface ConfirmationStore {
  issue(binding: ConfirmationBinding, expiresAt: Date): Promise<ConfirmationIssue>
  consume(confirmationId: string, binding: ConfirmationBinding, now: Date): Promise<ConfirmationDecision>
  cancel(confirmationId: string, binding: ConfirmationBinding, now: Date): Promise<ConfirmationDecision>
}

export type CapabilityRequest = {
  capability: string
  input: Record<string, unknown>
  idempotencyKey?: string
  confirmationId?: string
}

export type CapabilityResult = {
  status: ResultStatus
  capability: string
  data?: StructuredValue
  error?: { code: string; message: string; retryable: boolean }
  confirmation?: {
    confirmationId: string
    capability: string
    expiresAt: string
  }
  replayed?: boolean
}

export type IdempotencyBinding = ConfirmationBinding

export type IdempotencyInspection =
  | { status: 'empty' }
  | { status: 'in_progress'; leaseExpiresAt: string }
  | { status: 'reconciliation_required'; reservationId: string }
  | { status: 'conflict' }
  | { status: 'replay'; result: CapabilityResult }

export type IdempotencyReservation =
  | { status: 'reserved'; reservationId: string; leaseExpiresAt: string }
  | Exclude<IdempotencyInspection, { status: 'empty' }>

export interface IdempotencyStore {
  inspect(binding: IdempotencyBinding, key: string, now: Date): Promise<IdempotencyInspection>
  reserve(binding: IdempotencyBinding, key: string, now: Date, leaseExpiresAt: Date): Promise<IdempotencyReservation>
  complete(reservationId: string, result: CapabilityResult): Promise<void>
  fail(reservationId: string, result: CapabilityResult): Promise<void>
}

export type AuditEvent = {
  event: 'assistant.capability.completed'
  requestId: string
  actorId: string
  workspaceId: string
  capability: string
  accessClass: AccessClass | 'UNKNOWN'
  status: ResultStatus
  reasonCode: string
  confirmationState: 'not_applicable' | 'issued' | 'accepted' | 'rejected'
  idempotencyState: 'not_applicable' | 'reserved' | 'replayed' | 'conflict' | 'in_progress' | 'reconciliation_required'
  durationMs: number
}

export interface AuditSink {
  emit(event: AuditEvent): Promise<void>
}
