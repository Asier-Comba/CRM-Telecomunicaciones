# W3 durable database contract v1 — W2 implementation handoff

Canonical discussion: Issue #10. W3 owns semantics/runtime; W2 owns schema,
SQL/RLS and durable implementation; W4 independently verifies. This document
requests behavior, never authorizes deployment, routes or assistant writes.
Machine contract: `src/assistant/durable-db-contract.ts`. Field inventory:
`DURABLE_MAPPING_MANIFEST`; its old W1 relation names are suggestions, not mandated
SQL names. The manifest is included in the machine contract. No SDK in AI core.

## Persisted semantic concepts

| Concept | Required data |
|---|---|
| Confirmation | opaque confirmation identity (legacy record calls it operationRef), full binding, state, version, issuedAt/expiresAt/updatedAt |
| Operation | opaque operationRef, idempotencyKey, full binding, state, attempt, version, leaseExpiresAt, createdAt/updatedAt, optional receiptRef, safe failureCode and validated result reference |
| Registered command | dispatcher key + opaque commandRef; server-owned validated argument material, never model HTTP/SQL |
| Effect outbox | outboxRef, operationRef, full binding, registered command, state, attempt, version, lease/worker/fence, receiptRef/failureCode, timestamps |
| Safe result | validated capability-specific projected result, schema version, original operation/binding, scoped reference; never raw provider body |
| Audit intent | eventRef, immutable exact ReconciliationAuditEvent, original operation/version; event, requestId, reconciling actorId, workspaceId, operationRef, requestedOutcome, decision, reasonCode |
| Audit delivery | workspace/eventRef FK, pending/delivered, attempts, expiring claim/fence, next eligible time; delivery does not alter original intent |

`binding = actorId + workspaceId + capability + argumentsDigest`, immutable.
Reconciling actor can differ from originating actor only through explicitly
authorized reconciliation access. Actor IDs alone never authorize anything.
Confirmation identity is not interchangeable with operationRef despite the legacy
field name. Bind consumption to the reserved operation in the transaction.

## Exact current enums and transitions

- Confirmation: `issued → consumed | cancelled | expired`. Server time >= expiry
  rejects consume. One terminal transition; invented IDs never insert implicitly.
- Operation: `reserved → executing → effect_applied → completed`.
  `reserved | executing → failed_retryable | failed_terminal` is allowed only
  when absence of an effect is known; unknown handler error is not absence.
  `executing | effect_applied → reconciliation_required` on uncertainty/expired
  lease. `failed_retryable → reserved` increments attempt; fresh auth required.
  `reconciliation_required → completed | failed_retryable | failed_terminal`
  requires verified effect/absence and authorized reconciliation.
- Effect outbox: `pending`, `dispatching`, `delivered`, `failed_retryable`,
  `failed_terminal`, `reconciliation_required`. Claim pending/known-safe retry
  with CAS; uncertain/expired dispatch goes to reconciliation, not blind resend.
- Audit delivery `pending/delivered` is a separate delivery concept, not an
  alternative operation state. Public UI's five states remain a projection only.

The current reference store expires executing/effect_applied at equality. It does
not expire reserved automatically. W2 must fence start/recovery of reserved work;
a reserved record itself grants no effect authority. Persist versions and attempts
as positive safe integers; increment version exactly once per committed transition.
Use authoritative server/DB time, never a caller-selected clock or lease duration.
Current AssistantRuntime confirmation TTL and idempotency lease are both300000ms
(five minutes); confirmation expiry must never exceed that server-issued bound.
Runtime idempotency keys match `[A-Za-z0-9_-]{16,128}`; operation refs match
`[A-Za-z0-9_-]{24,200}`. Persist opaque high-entropy IDs, not sequential test IDs.

## Digest and uniqueness

Current `runtime.argumentsDigest` is SHA-256 lowercase hex of recursively sorted
JSON object keys using JS `localeCompare`, JSON scalars and preserved array order.
Identifier: `w3-canonical-json-localeCompare-sha256-v1`. Persist the algorithm
version separately; do not prefix or silently rewrite existing digest strings.
Do not recompute using JSONB/text serialization. Locale dependence is an explicit
future migration concern: pin producer runtime; a new comparator needs v2.
Only validated bounded JSON enters digest computation; no undefined/getters.

- Unique reservation `(workspaceId, capability, idempotencyKey)`; compare actor
  and digest under lock. Different actor/digest is conflict without result leakage.
- Unique `(workspaceId, operationRef)` and one effect outbox per operation.
- Same-workspace operation/command/result/audit FKs; reject orphan outbox.
- Unique `(workspaceId, eventRef)`; reusing eventRef for different content fails.
  Reconciliation eventRef = SHA256(JSON([workspaceId,operationRef,expectedVersion])).
  It identifies the original transition, not a new retry request.

## Atomic boundaries and application seam

1. `confirmReserveEnqueue`: reauthorize, compare binding, consume one issued
   confirmation, reserve operation and enqueue exactly one registered command
   plus audit intent in one transaction. Identical committed replay returns the
   existing operation; different binding conflicts. Rollback consumes nothing.
2. `startExecution/claimOutbox`: current principal/scope, state, version and lease
   checks under lock; persist monotonically fenced claim before any effect.
3. `ackOutbox`: require exact owner/fence/version; stale worker cannot ack/fail
   a successor claim. Persist opaque receipt. Unknown provider outcome requires
   reconciliation even if delivery transport suggests retry.
4. Normal completion must atomically persist safe result + completed state + audit
   intent. The old AssistantRuntime store seam is NOT production-ready wiring;
   do not implement its complete() as a naked update and enable routes.
5. `commitVerifiedReconciliation` is now REQUIRED by AuthorizedReconciliationService:
   reauthorize current principal, lock scoped operation, compare full immutable
   binding/idempotencyKey/expectedVersion/state, store safe result if applicable,
   transition, append original audit intent and enqueue delivery in ONE transaction.
   No fallback calls the old state-only applyAuthorizedReconciliation method.

The application passes a validated projected CapabilityResult. W2 stores it under
a safe result reference inside the same transaction and reconstructs only that
validated projection on authorized replay. A separate pre-transaction result write
must not expose an uncommitted result. Revalidate schema/binding at the adapter seam.

## Authorization and output admission

Every lookup filters workspace before materialization, including missing/denied
parity. Ordinary operation lookup/replay is actor-bound. A reconciliation operator
needs `assistant:operation:reconcile` plus resource permission in the workspace;
the service principal path needs explicit scope, version, expiry and revocation.
Recheck active tenant/membership/resource authority inside each privileged commit.
The server principal cannot be constructed from an HTTP/model payload. RLS remains.

Completed reconciliation requires registered closed output schema AND
`authorizeResult(actor, originalRecord, result)`. This must authorize every returned
resource reference against the original workspace/current principal. No schema or
callback means completion denied. Unknown/missing/wrong/private/foreign/oversized/
unsafe structure gives zero commit calls. The final transaction repeats auth.
Failed outcomes require independently verified absence; inconclusive is no change.
No published executable production mutating telecom capability exists yet.

## Results, errors and recovery

Port decisions are closed (`applied`, `not_found`, `forbidden`, `binding_mismatch`,
`version_conflict`, `invalid_transition`); no SQL/provider text crosses the seam.
Applied returns matching record/version, eventRef and `auditIntentPersisted:true`.
W3 re-reads with authorization and checks identity/state/version. A false receipt
fails closed, but only W4 database tests can prove the adapter's atomic assertion.

Pre-commit failure rolls back everything. Lost post-commit reply may return
UNAVAILABLE; retry sees current state/conflict, but the ORIGINAL audit remains
pending and independently deliverable. The service need not turn a stale expected
version into SUCCESS. Status lookup reports the committed operation. No re-effect.
Success no longer waits for external audit delivery; diagnostic denial/conflict
audits still use the bounded sink and may return UNAVAILABLE if that sink fails.
Audit sink deduplicates exact `(workspace,eventRef,content)` at least once; a worker
crash after sink acceptance but before ack cannot create another logical event.

After process restart, reservations, confirmations, results, commands, claims,
original audit and delivery state survive. After effect/before completion, use a
provider receipt/read-after-write or idempotent provider token to reconcile. If
effect cannot be proven present or absent, keep reconciliation_required. Exactly
once at arbitrary external providers is NOT promised.

## W2 handoff / concrete questions

DO NOT IMPLEMENT raw SQL/HTTP planner tools, browser workspace authority, generic
unvalidated JSON results, direct provider calls, permissive service-role bypass,
new mutation routes or RAG as CRM truth. Keep UI v1 and all writes disabled.

Publish on your takeover PR: exact SHA; module path implementing the port;
DB transaction/RPC mapping; confirmation→operation association; registered
dispatcher list; claim fence shape; safe-result schema/version storage and the
nonproduction native PostgreSQL acceptance adapter path. No credentials in GitHub.
Confirm whether the 14 telecom.v1 service method/input/output signatures change;
publish DTO fixtures and a type-compatible server factory at the same SHA.

Acceptance runner and matrix: `scripts/durable-process-acceptance.mjs` and
`src/assistant/durable-process-spec.ts`. W2 implements the local driver; W4 runs
independently against disposable native PostgreSQL. No Map result clears the gate.
