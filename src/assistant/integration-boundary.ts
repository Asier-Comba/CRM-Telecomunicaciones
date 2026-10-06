import { containsHighConfidenceSecret } from './schema.ts'

export type IntegrationRequest = Readonly<{ registeredIntegrationRef: string; registeredAction: string; commandRef: string }>
export type IntegrationPrincipal = Readonly<{
  actorId: string; workspaceId: string; authentication: 'service_principal'
  principalVersion: number; expiresAtMs: number; revoked: boolean
  capabilityScopes: readonly string[]
}>
export type RegisteredIntegrationAction = Readonly<{
  registeredIntegrationRef: string; registeredAction: string; requiredCapability: string
  enabled: boolean
}>
export type PreparedIntegrationCommand = Readonly<{
  commandRef: string; actorId: string; workspaceId: string
  registeredIntegrationRef: string; registeredAction: string
  state: 'draft' | 'previewed' | 'confirmed'
  argumentsDigest: string; confirmationRef: string | null; confirmationExpiresAtMs: number | null
}>
export type IntegrationCommit = Readonly<{
  principal: IntegrationPrincipal; command: PreparedIntegrationCommand
  action: RegisteredIntegrationAction; nowMs: number
}>
export type IntegrationCommitReceipt = Readonly<{
  status: 'queued' | 'replayed'; commandRef: string; actorId: string; workspaceId: string
  operationRef: string; outboxRef: string; auditRef: string
}>
export interface AtomicIntegrationOutbox {
  /** One durable transaction: reauthorize current principal/version; verify command/confirmation binding;
   * consume confirmation; reserve command idempotency; enqueue registered command; append audit outbox.
   * Replays return the original receipt. No HTTP or external effect occurs in this transaction.
   */
  commitConfirmedCommand(commit: IntegrationCommit): Promise<unknown>
}
export interface IntegrationBoundaryDependencies {
  /** Authentication is resolved by the server, never constructed from a model/browser payload. */
  resolvePrincipal(): Promise<unknown>
  resolveRegisteredAction(integrationRef: string, action: string): Promise<unknown>
  resolvePreparedCommand(commandRef: string, principal: IntegrationPrincipal): Promise<unknown>
  outbox: AtomicIntegrationOutbox
  nowMs(): number
}
export type IntegrationBoundaryResult =
  | { ok: true; state: 'pending'; operationRef: string }
  | { ok: false; code: 'INVALID_INPUT' | 'FORBIDDEN' | 'PREVIEW_REQUIRED' | 'CONFIRMATION_REQUIRED' | 'UNAVAILABLE' }

const opaque = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{15,159}$/.test(v) && !containsHighConfidenceSecret(v)
const actionName = (v: unknown): v is string => typeof v === 'string' && /^[a-z][a-z0-9_.]{2,79}$/.test(v) && !containsHighConfidenceSecret(v)
const millis = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 8640000000000000
function closed(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) return false
  const fields = Object.getOwnPropertyDescriptors(value)
  return Reflect.ownKeys(value).length === keys.length && Object.keys(fields).length === keys.length && keys.every((key) => Object.hasOwn(fields, key) && 'value' in fields[key]! && fields[key]!.enumerable)
}
function request(value: unknown): value is IntegrationRequest {
  return closed(value, ['registeredIntegrationRef', 'registeredAction', 'commandRef']) && opaque(value.registeredIntegrationRef) && actionName(value.registeredAction) && opaque(value.commandRef)
}
function scopes(value: unknown): value is readonly string[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > 32 || Reflect.ownKeys(value).length !== value.length + 1) return false
  const fields = Object.getOwnPropertyDescriptors(value)
  return Array.from({ length: value.length }, (_, index) => fields[String(index)]).every((field) => field && 'value' in field && actionName(field.value))
}
function principal(value: unknown, now: number): value is IntegrationPrincipal {
  return closed(value, ['actorId', 'workspaceId', 'authentication', 'principalVersion', 'expiresAtMs', 'revoked', 'capabilityScopes']) && opaque(value.actorId) && opaque(value.workspaceId) && value.authentication === 'service_principal' && Number.isSafeInteger(value.principalVersion) && typeof value.principalVersion === 'number' && value.principalVersion >= 1 && millis(value.expiresAtMs) && value.expiresAtMs > now && value.revoked === false && scopes(value.capabilityScopes)
}
function registered(value: unknown): value is RegisteredIntegrationAction {
  return closed(value, ['registeredIntegrationRef', 'registeredAction', 'requiredCapability', 'enabled']) && opaque(value.registeredIntegrationRef) && actionName(value.registeredAction) && actionName(value.requiredCapability) && value.enabled === true
}
function prepared(value: unknown): value is PreparedIntegrationCommand {
  return closed(value, ['commandRef', 'actorId', 'workspaceId', 'registeredIntegrationRef', 'registeredAction', 'state', 'argumentsDigest', 'confirmationRef', 'confirmationExpiresAtMs']) && opaque(value.commandRef) && opaque(value.actorId) && opaque(value.workspaceId) && opaque(value.registeredIntegrationRef) && actionName(value.registeredAction) && typeof value.state === 'string' && ['draft', 'previewed', 'confirmed'].includes(value.state) && typeof value.argumentsDigest === 'string' && /^[a-f0-9]{64}$/.test(value.argumentsDigest) && (value.confirmationRef === null || opaque(value.confirmationRef)) && (value.confirmationExpiresAtMs === null || millis(value.confirmationExpiresAtMs))
}

/** Offline boundary only. Construct with trusted server resolvers; it cannot dispatch a provider call. */
export class IntegrationBoundary {
  constructor(private readonly dependencies: IntegrationBoundaryDependencies) {}

  async enqueue(input: unknown): Promise<IntegrationBoundaryResult> {
    try {
      if (!request(input)) return { ok: false, code: 'INVALID_INPUT' }
      const requested = Object.freeze({ ...input })
      const now = this.dependencies.nowMs()
      if (!millis(now)) return { ok: false, code: 'UNAVAILABLE' }
      const candidate = await this.dependencies.resolvePrincipal()
      if (!principal(candidate, now)) return { ok: false, code: 'FORBIDDEN' }
      const authenticated = Object.freeze({ ...candidate, capabilityScopes: Object.freeze([...candidate.capabilityScopes]) })
      const registration = await this.dependencies.resolveRegisteredAction(requested.registeredIntegrationRef, requested.registeredAction)
      if (!registered(registration) || registration.registeredIntegrationRef !== requested.registeredIntegrationRef || registration.registeredAction !== requested.registeredAction || !authenticated.capabilityScopes.includes(registration.requiredCapability)) return { ok: false, code: 'FORBIDDEN' }
      const action = Object.freeze({ ...registration })
      const commandValue = await this.dependencies.resolvePreparedCommand(requested.commandRef, authenticated)
      if (!prepared(commandValue) || commandValue.actorId !== authenticated.actorId || commandValue.workspaceId !== authenticated.workspaceId || commandValue.commandRef !== requested.commandRef || commandValue.registeredIntegrationRef !== action.registeredIntegrationRef || commandValue.registeredAction !== action.registeredAction) return { ok: false, code: 'FORBIDDEN' }
      const command = Object.freeze({ ...commandValue })
      if (command.state === 'draft') return { ok: false, code: 'PREVIEW_REQUIRED' }
      const commitNow = this.dependencies.nowMs()
      if (!millis(commitNow) || commitNow < now || authenticated.expiresAtMs <= commitNow) return { ok: false, code: 'FORBIDDEN' }
      if (command.state !== 'confirmed' || !command.confirmationRef || command.confirmationExpiresAtMs === null || command.confirmationExpiresAtMs <= commitNow) return { ok: false, code: 'CONFIRMATION_REQUIRED' }
      const receipt = await this.dependencies.outbox.commitConfirmedCommand(Object.freeze({ principal: authenticated, command, action, nowMs: commitNow }))
      if (!closed(receipt, ['status', 'commandRef', 'actorId', 'workspaceId', 'operationRef', 'outboxRef', 'auditRef']) || typeof receipt.status !== 'string' || !['queued', 'replayed'].includes(receipt.status) || receipt.commandRef !== command.commandRef || receipt.actorId !== authenticated.actorId || receipt.workspaceId !== authenticated.workspaceId || !opaque(receipt.operationRef) || !opaque(receipt.outboxRef) || !opaque(receipt.auditRef)) return { ok: false, code: 'UNAVAILABLE' }
      return { ok: true, state: 'pending', operationRef: receipt.operationRef }
    } catch { return { ok: false, code: 'UNAVAILABLE' } }
  }
}

/** Future worker contract: receipt verification and its audit event must persist atomically.
 * Provider clients, endpoints, credentials and raw payloads stay inside registered server adapters.
 */
export interface IntegrationDeliveryLedger {
  recordVerifiedReceipt(input: Readonly<{ outboxRef: string; operationRef: string; verifiedReceiptRef: string; expectedVersion: number }>, principal: IntegrationPrincipal): Promise<'recorded' | 'replayed' | 'denied' | 'reconciliation_required'>
}
