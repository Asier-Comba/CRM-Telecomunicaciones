export const CAPABILITY_CONTRACT_VERSION = 1 as const

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

export type PropertySchema =
  | { type: 'string'; minLength?: number; maxLength?: number; enum?: readonly string[] }
  | { type: 'number'; minimum?: number; maximum?: number }
  | { type: 'boolean' }

export type ObjectSchema = {
  type: 'object'
  properties: Readonly<Record<string, PropertySchema>>
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

export type CapabilityHandler<I extends Record<string, unknown>, O extends StructuredValue> = {
  bivarianceHack(context: ExecutionContext, input: I): Promise<O>
}['bivarianceHack']

export type CapabilityDefinition<
  I extends Record<string, unknown> = Record<string, unknown>,
  O extends StructuredValue = StructuredValue,
> = {
  contractVersion: typeof CAPABILITY_CONTRACT_VERSION
  name: string
  description: string
  inputSchema: ObjectSchema
  outputDescription: string
  permission: string
  accessClass: AccessClass
  confirmationPolicy: ConfirmationPolicy
  idempotencyRequired: boolean
  tenantScope: {
    source: 'server_context'
    modelMayChooseWorkspace: false
  }
  handler: CapabilityHandler<I, O>
}

export type ConfirmationProof = {
  actionId: string
  actorId: string
  workspaceId: string
  capability: string
  argumentsDigest: string
  expiresAt: string
}

export type CapabilityRequest = {
  capability: string
  input: Record<string, unknown>
  idempotencyKey?: string
  confirmation?: ConfirmationProof
}

export type CapabilityResult = {
  status: ResultStatus
  capability: string
  data?: StructuredValue
  error?: { code: string; message: string }
  confirmation?: {
    capability: string
    argumentsDigest: string
  }
  replayed?: boolean
}

export type AuditEvent = {
  event: 'assistant.capability.completed'
  requestId: string
  actorId: string
  workspaceId: string
  capability: string
  accessClass: AccessClass | 'UNKNOWN'
  status: ResultStatus
  durationMs: number
  replayed: boolean
}

export interface IdempotencyStore {
  get(workspaceId: string, capability: string, key: string): Promise<CapabilityResult | null>
  put(workspaceId: string, capability: string, key: string, result: CapabilityResult): Promise<void>
}

export interface AuditSink {
  emit(event: AuditEvent): Promise<void>
}
