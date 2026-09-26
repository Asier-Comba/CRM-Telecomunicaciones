import { randomBytes } from 'node:crypto'
import { SessionReferenceStore, type EntityReference, type ReferenceScope } from './session-references.js'
import type { EntityKindV1 } from './entity-kinds.js'

type Frame = { scope: ReferenceScope; kind: EntityKindV1; turn: number; handles: string[]; expiresAt: number }
const same = (a: ReferenceScope, b: ReferenceScope): boolean => a.actorId === b.actorId && a.workspaceId === b.workspaceId && a.sessionId === b.sessionId && a.scopeEpoch === b.scopeEpoch
export type SelectionContext = {
  scope: ReferenceScope; turn: number; now: number
  currentScope(): ReferenceScope
  /** Mandatory live clock for production; omitted only in static simulations. */
  clock?(): number
  authorize(kind: EntityKindV1, id: string): Promise<boolean>
}
export type SelectionResult = { status: 'resolved'; entities: EntityReference[] } | { status: 'invalid_reference' | 'access_changed' }

/** Server-created ordered candidate frames for "esa", "el segundo", "esas".
 * Language interpretation happens in the semantic planner. This class accepts
 * only a structured ordinal or all; it never ranks names or parses prompt regex.
 */
export class ConversationSelections {
  readonly #frames = new Map<string, Frame>()
  constructor(private readonly references: SessionReferenceStore) {}
  remember(scope: ReferenceScope, kind: EntityKindV1, turn: number, handles: readonly string[], now: number): string | null {
    if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(turn) || turn < 0 || handles.length < 1 || handles.length > 50 || new Set(handles).size !== handles.length) return null
    if (handles.some(handle => this.references.resolveEntity(handle, scope, kind, turn, now)?.sourceTurn !== turn)) return null
    for (const [key, frame] of this.#frames) if (frame.expiresAt <= now) this.#frames.delete(key)
    if (this.#frames.size >= 100) return null
    const key = `choice_${randomBytes(24).toString('base64url')}`
    this.#frames.set(key, { scope: { ...scope }, kind, turn, handles: [...handles], expiresAt: now + 300_000 })
    return key
  }
  async select(value: unknown, context: SelectionContext): Promise<SelectionResult> {
    const invalid: SelectionResult = { status: 'invalid_reference' }
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid
      const fields = Object.getOwnPropertyDescriptors(value)
      if (Reflect.ownKeys(value).length !== 2 || !fields.frameRef || !fields.selection || !('value' in fields.frameRef) || !('value' in fields.selection)) return invalid
      const key: unknown = fields.frameRef.value; const choice: unknown = fields.selection.value
      if (typeof key !== 'string' || !/^choice_[A-Za-z0-9_-]{32}$/.test(key)) return invalid
      const frame = this.#frames.get(key)
      const scope = { ...context.scope }
      const turn = context.turn; const now = context.now
      if (!frame || !same(frame.scope, scope) || !Number.isSafeInteger(now) || now < 0 || now >= frame.expiresAt || !Number.isSafeInteger(turn) || turn < frame.turn) return invalid
      if (!same(context.currentScope(), scope)) return { status: 'access_changed' }
      let handles: string[]
      if (choice === 'all') handles = frame.handles
      else if (typeof choice === 'number' && Number.isInteger(choice) && choice >= 1 && choice <= frame.handles.length) handles = [frame.handles[choice - 1]!]
      else return invalid
      const entities: EntityReference[] = []
      const current = (): boolean => {
        const clock = context.clock?.() ?? context.now
        return Number.isSafeInteger(clock) && clock >= now && clock < frame.expiresAt &&
          this.#frames.get(key) === frame && same(context.currentScope(), scope) &&
          handles.every(handle => this.references.resolveEntity(handle, scope, frame.kind, turn, clock) !== null)
      }
      for (const handle of handles) {
        const entity = this.references.resolveEntity(handle, scope, frame.kind, turn, now)
        if (!entity) return invalid
        if (!await context.authorize(entity.kind, entity.id)) {
          this.references.revokeEntity(scope, entity.kind, entity.id)
          return { status: 'access_changed' }
        }
        if (!current()) return { status: 'access_changed' }
        entities.push(entity)
      }
      return current() ? { status: 'resolved', entities } : { status: 'access_changed' }
    } catch { return { status: 'access_changed' } }
  }
  invalidate(scope: ReferenceScope): void {
    this.references.revokeSession(scope)
    for (const [key, frame] of this.#frames) if (frame.scope.sessionId === scope.sessionId && frame.scope.actorId === scope.actorId && frame.scope.workspaceId === scope.workspaceId) this.#frames.delete(key)
  }
}
