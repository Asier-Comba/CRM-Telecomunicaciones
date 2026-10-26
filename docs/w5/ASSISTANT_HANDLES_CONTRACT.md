# Assistant entity handles — contract proposal v1 (W5 → W3, ACK required)

Status: **PROPOSAL**. No W3 runtime file is modified. No migration is added until W3 ACKs.
No provider call, no `OPENAI_API_KEY`, no write action: this is a READ-path contract. Issue #10 still blocks writes.

## 1. Problem (reproduced)

`parseProductReadPlanV2(value, offered)` (W3) already refuses literal identifiers and accepts an ID field
only through a `handle` the server offered or a same-turn `nodeId` chain. The route
`src/app/api/assistant/v2/turn/route.ts` passes `offeredHandles: []` and `resolveReference: async () => null`.
Every follow-up such as "y la renovación de ese cliente" therefore fails with `invalid_plan`. The model
cannot reference something it showed in a previous turn.

Reproduction: `node --experimental-transform-types scripts/w5/assistant-handles-repro.mjs`. It imports
the real parser, needs no network or DB, and checks five cases:

| Case | Expected | Observed |
|---|---|---|
| A. Cross-turn handle, `offered=[]` (route today) | REJECTED (gap) | REJECTED |
| B. Same handle, server offered it | ACCEPTED | ACCEPTED |
| C. Literal UUID from the model | REJECTED | REJECTED |
| D. Handle not offered (forged) | REJECTED | REJECTED |
| E. Same-turn `nodeId` chain | ACCEPTED | ACCEPTED |

The parser and executor are correct. Only the server-side issuer and resolver behind the existing seam
`resolveReference(handle, targetField, authority)` are missing.

## 2. Types

```ts
// What the model sees. No UUID, no entity_id, no workspace_id.
export type OfferedEntityHandleV1 = Readonly<{
  handle: string          // /^h_[A-Za-z0-9_-]{22}$/  (128 random bits, base64url)
  kind: EntityKindV1      // 'customer' | 'contract' | 'service' | 'line' | 'renewal' | 'permanence' | 'opportunity' | 'case' | 'task' | 'invoice' | ...
  label: string           // display text already shown to this user in this conversation (≤ 80 chars)
}>

// Server-only row. Never serialized to the client or the model.
type EntityHandleRecordV1 = Readonly<{
  handleHash: Uint8Array  // sha256(handle); the raw handle is never stored
  workspaceId: string; actorId: string; conversationId: string
  kind: EntityKindV1; entityId: string
  issuedTurnId: string; scopeEpoch: string
  issuedAt: string; expiresAt: string   // issuedAt + 30 min, sliding not allowed
}>

// Implements the existing executor seam; unchanged signature.
type ResolveReferenceV1 = (handle: string, targetField: string, authority: ReadAuthorityV2) => Promise<string | null>
```

`targetField` → kind compatibility is a closed server table, for example
`customer_id → customer`, `contract_id → contract`, `id` → the kind of the capability being called.
An incompatible field returns null.

## 3. Rules

1. **Issued only by the server, only from an authorized read result.** A handle is minted for a record
   that an executor node returned to this actor in this conversation and turn. It is never minted from
   model text, user text, client input or a name search.
2. **Bound** to `(actorId, workspaceId, conversationId, kind, entityId, scopeEpoch)`. All six must
   match at resolution time.
3. **Validity**: 30 minutes from issue, and never longer than the conversation is unarchived. Maximum
   20 issued per turn and 100 live per conversation; beyond that, the oldest are dropped.
4. **Offered per turn**: the route loads live handles for `(actor, workspace, conversation)` and passes
   only their `handle` strings as `offeredHandles`. The planner context gets `{handle, kind, label}`.
5. **Revalidated every turn**. `resolveReference` returns the entity id only if:
   - the hash exists and has not expired;
   - actor, workspace and conversation match the current authority;
   - `authority.scopeEpoch` equals the epoch at issue time, so a membership change, demotion or
     suspension revokes everything at once;
   - the field is compatible with the kind.

   Otherwise it returns null, and the executor already maps that to `access_changed`. The reader that
   follows runs under the user JWT and current RLS, so a resolved id still cannot read beyond the
   actor's present permissions.
6. **No ambiguity resolution on the server.** If the user's words could refer to more than one
   handle, the planner must `clarify`. The resolver never guesses by label.
7. **Opaque, uniform failure.** Unknown, expired, foreign, revoked and incompatible handles all produce
   the same null, so they are indistinguishable to the caller. No enumeration oracle.
8. **Privacy**: handles and labels never appear in logs or audit payloads as entity ids. Audit records
   `handle_used=true` and the resolved id only in server-side audit already scoped to the workspace.

## 4. Storage (proposal, after ACK)

One table `assistant_entity_handles_v1`. FORCE RLS with no policies; access only through two
SECURITY DEFINER RPCs callable by `authenticated`, with `search_path` set, guarded by the existing
active-membership check:

- `assistant_entity_handle_v1_issue(p_workspace_id, p_conversation_id, p_turn_id, p_items jsonb)`
  verifies that the turn is `running` and owned by `auth.uid()`, then inserts the hashes.
- `assistant_entity_handle_v1_resolve(p_workspace_id, p_conversation_id, p_handle, p_target_field)`
  returns `uuid` or null.

There is no service_role path. The alternative, a stateless HMAC token, was rejected: it needs a new
server secret, and it cannot be revoked per conversation without state.

## 5. Mandatory negative tests (for the W5 native suite and W3 unit tests)

- Another actor in the same workspace → null.
- Same actor, another workspace → null.
- Same actor, another conversation → null.
- Expired (time travel) → null.
- Membership suspended, or role demoted (epoch change) → null.
- Archived conversation → null.
- Incompatible field (customer handle on `contract_id`) → null.
- A malformed, empty or 10 KB handle never reaches the DB.
- A handle forged with a valid format → null.
- Two concurrent issues in one turn respect the caps.
- A literal UUID in `arguments` is still REJECTED (case C).
- Identical failure shape across all of the above.

## 6. Ownership and ACK

- W3 owns the route and executor wiring, and the planner prompt (`{handle, kind, label}`).
- W5 owns the table, the RPCs, the native negative tests and the disposable evidence.
- W4 performs an independent review before any hosted application.
- Required ACK from W3: (a) types in §2; (b) the 30 min / 20 / 100 limits; (c) epoch-based revocation;
  (d) "clarify, never guess" in §3.6. W5 starts the migration only after that ACK.
