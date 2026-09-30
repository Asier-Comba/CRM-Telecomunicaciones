import { createHash, randomBytes } from 'node:crypto'
import { isEntityKindV1, type EntityKindV1 } from './entity-kinds.js'
import { validateTelecomInput } from './telecom-input-validation.js'
import { READ_RESULT_KINDS } from './semantic-read-plan.js'

/** Server-owned ephemeral references, NOT an authorization cache or CRM memory.
 * Call issue only with validated, authorized reader results. Resolve is followed
 * by fresh resource authorization and a real read. Never hydrate from model data.
 */
export type ReferenceScope = {
  actorId: string; workspaceId: string; sessionId: string; scopeEpoch: string
}
export type EntityReference = { kind: EntityKindV1; id: string; sourceTurn: number; sourceOperation: string }
export type ReferenceReadGuard = { current(): boolean; release(): void }
type Binding = { scope: ReferenceScope; expiresAt: number }
type Entry = Binding & (
  | { type: 'entity'; entity: EntityReference }
  | { type: 'page'; operation: string; filterDigest: string; cursor: string }
)
const bounded = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const validScope = (scope: ReferenceScope): boolean =>
  !!scope && ['actorId', 'workspaceId', 'sessionId', 'scopeEpoch'].every(key => bounded(scope[key as keyof ReferenceScope], 160))
const sameScope = (left: ReferenceScope, right: ReferenceScope): boolean =>
  left.actorId === right.actorId && left.workspaceId === right.workspaceId && left.sessionId === right.sessionId && left.scopeEpoch === right.scopeEpoch

function filterDigest(operation: string, input: unknown): string | null {
  // The planner must send null; the actual cursor is exclusively server-issued.
  if (!validateTelecomInput(operation, input).ok) return null
  const values = input as Record<string, unknown>
  if (values.continuation !== null) return null
  return createHash('sha256').update(JSON.stringify(Object.keys(values).filter(k => k !== 'continuation').sort().map(k => [k, values[k]]))).digest('hex')
}

export class SessionReferenceStore {
  readonly #entries = new Map<string, Entry>()
  readonly #reads = new Set<{ scope: ReferenceScope; valid: boolean }>()
  constructor(private readonly capacity = 500, private readonly ttlMs = 300_000) {
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 10_000 || !Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > 900_000) throw new Error('invalid_reference_policy')
  }
  /** In-flight revocation fence, not durable authorization. The server still
   * reauthorizes every read. Bounded active tickets avoid unbounded tombstones.
   * Callers MUST release in finally, including rejected/invalid plans.
   */
  beginRead(scope: ReferenceScope): ReferenceReadGuard | null {
    if (!validScope(scope) || this.#reads.size >= 128) return null
    const ticket = { scope: { ...scope }, valid: true }
    this.#reads.add(ticket)
    return {
      current: () => ticket.valid,
      release: () => { ticket.valid = false; this.#reads.delete(ticket) },
    }
  }
  #issue(entry: Entry, now: number): string | null {
    if (!Number.isSafeInteger(now) || now < 0 || !validScope(entry.scope) || !Number.isSafeInteger(entry.expiresAt)) return null
    for (const [handle, item] of this.#entries) if (item.expiresAt <= now) this.#entries.delete(handle)
    // Fail closed at capacity; do not silently evict active user references.
    if (this.#entries.size >= this.capacity) return null
    const handle = `ref_${randomBytes(24).toString('base64url')}`
    this.#entries.set(handle, { ...entry, scope: { ...entry.scope } })
    return handle
  }
  #get(handle: unknown, scope: ReferenceScope, now: number): Entry | null {
    if (typeof handle !== 'string' || !/^ref_[A-Za-z0-9_-]{32}$/.test(handle) || !validScope(scope) || !Number.isSafeInteger(now) || now < 0) return null
    const entry = this.#entries.get(handle)
    if (!entry) return null
    if (now >= entry.expiresAt) { this.#entries.delete(handle); return null }
    if (!sameScope(entry.scope, scope)) return null
    return entry
  }
  issueEntity(scope: ReferenceScope, entity: EntityReference, now: number): string | null {
    if (!entity || !isEntityKindV1(entity.kind) || !Object.hasOwn(READ_RESULT_KINDS, entity.sourceOperation) || READ_RESULT_KINDS[entity.sourceOperation] !== entity.kind || !bounded(entity.id, 160) || entity.id.length < 16 || !Number.isSafeInteger(entity.sourceTurn) || entity.sourceTurn < 0) return null
    return this.#issue({ type: 'entity', scope, entity: { kind: entity.kind, id: entity.id, sourceTurn: entity.sourceTurn, sourceOperation: entity.sourceOperation }, expiresAt: now + this.ttlMs }, now)
  }
  resolveEntity(handle: unknown, scope: ReferenceScope, expectedKind: EntityKindV1, currentTurn: number, now: number): EntityReference | null {
    const entry = this.#get(handle, scope, now)
    if (entry?.type !== 'entity' || entry.entity.kind !== expectedKind || !Number.isSafeInteger(currentTurn) || entry.entity.sourceTurn > currentTurn) return null
    return { ...entry.entity }
  }
  issueContinuation(scope: ReferenceScope, operation: string, filterInput: unknown, cursor: string, freshness: 'fresh' | 'stale', now: number): string | null {
    const digest = filterDigest(operation, filterInput)
    if (!digest || freshness !== 'fresh' || !bounded(cursor, 256) || cursor.length < 16) return null
    return this.#issue({ type: 'page', scope, operation, filterDigest: digest, cursor, expiresAt: now + this.ttlMs }, now)
  }
  resolveContinuation(handle: unknown, scope: ReferenceScope, operation: string, filterInput: unknown, now: number): string | null {
    const entry = this.#get(handle, scope, now)
    if (entry?.type !== 'page' || entry.operation !== operation || entry.filterDigest !== filterDigest(operation, filterInput)) return null
    return entry.cursor
  }
  revokeSession(scope: ReferenceScope): void {
    for (const ticket of this.#reads) {
      if (ticket.scope.actorId === scope.actorId && ticket.scope.workspaceId === scope.workspaceId && ticket.scope.sessionId === scope.sessionId) ticket.valid = false
    }
    for (const [handle, entry] of this.#entries) {
      if (entry.scope.actorId === scope.actorId && entry.scope.workspaceId === scope.workspaceId && entry.scope.sessionId === scope.sessionId) this.#entries.delete(handle)
    }
  }
  revokeEntity(scope: ReferenceScope, kind: EntityKindV1, id: string): void {
    // A pending search/summary may contain the revoked resource before its IDs
    // are known. Conservatively discard in-flight reads in this exact scope.
    for (const ticket of this.#reads) if (sameScope(ticket.scope, scope)) ticket.valid = false
    for (const [handle, entry] of this.#entries) {
      if (sameScope(entry.scope, scope) && entry.type === 'entity' && entry.entity.kind === kind && entry.entity.id === id) this.#entries.delete(handle)
    }
  }
}
