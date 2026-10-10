# W2 physical confirmation/reservation candidate — 11 October 2026

Base: PR38 `fe196fe46e7f2927eec6a706e04b67aa0dcb1292`, accepted functional tree `1edefcde5ba101ffa0d3cc2ea6af98eaf1973611`. This dependent candidate does not inherit that acceptance. Issue10 remains OPEN; effects OFF; W4 review required.

## Reproduced missing capability and implemented boundary

On the base's 73 migrations, the new SQL regression fails `atomic_primitives_missing`. The forward-only migration `20261011010500_assistant_confirm_reserve_atomic.sql` adds two inert, server-only SQL primitives:

- `assistant_durable_v1_issue(uuid,text,text)`: current session actor and locked active workspace membership; registered capability only; server-generated 256-bit confirmation and DB-clock five-minute expiry.
- `assistant_durable_v1_confirm_reserve(uuid,text,text,text,text,text,text,text)`: locks current authority, registered dispatcher/schema, unique workspace/capability/key and confirmation; then consumes, reserves and writes registered command, effect outbox, immutable original reservation audit and delivery obligation in one transaction.

Exact association replay returns the existing reservation after current authorization. Actor, digest, confirmation, dispatcher, schema or command changes conflict without returning a record. Reusing a consumed confirmation for another key fails. Time is taken after blocking locks; expiry cannot be extended by queue wait or caller clock. A reservation grants no execution authority.

The dispatcher metadata table is empty after migration. Neither primitive is executable by PUBLIC, anon, authenticated or service_role; all new tables use forced RLS and no raw grants. No route, factory registration, application worker, provider or real command handler is enabled. The registered-command record currently stores only identity/schema/binding: server-owned validated argument material and a production dispatcher implementation remain pending.

New command FK enforces same workspace/operation/command/dispatcher on every new or changed outbox row. It is NOT VALID for prior inert rows: historical unassociated rows are quarantined from this primitive, not silently upgraded. Existing disposable foundation/restore seeds now explicitly create their synthetic command metadata; original assertions remain.

## Verification and exact limits

Local embedded PGlite: all74 migrations, positive reservation/replay, six ordered rollback cutpoints, invented/changed/expired proofs, viewer/foreign workspace, original audit immutability and real role-call denial PASS. A disposable mutant that omits the audit-delivery insert fails the same SQL regression. Embedded evidence is not native crash/process acceptance.

The initial local bootstrap execution failed: unavailable checkout TypeScript dependencies, Windows private-directory enforcement in the inherited encrypted-staging fixtures, and stale schema inventories. The schema inventory and its exact migration manifest were updated without suppressing checks;44 affected/dependency-resolved tests subsequently PASS using existing dependencies.493 assistant tests PASS. Linux CI remains authoritative for the full bootstrap/lint/types/build/native gates; Windows failures are retained, not converted to PASS. No private permissions or import processing were weakened.

Native CI runner `scripts/security/native-postgres/assistant-reservation-races.mjs` measures two20-process races with distinct backend PIDs: identical association yields one reservation/nineteen replays; different keys sharing one proof yield one reservation/nineteen refusals. It independently reads all five persisted ledgers after each of six injected rollback cuts, retries with the original confirmation, verifies original audit retention after discarded reply and changed binding conflicts, and rejects an omitted-delivery mutant. Fresh/restored role calls include both inert primitives. These checks are pending until their exact source CI completes; the runner does not execute a business effect.

## Remaining issue10 path and ownership

Still absent: full `DurableDatabasePort` factory, capability-specific validated argument/result storage, cancel/claim/fencing/ack, normal completion and verified reconciliation transactions, immutable reconciliation event identity, audit-delivery claims/drain/dedup, independent effect ledger and the complete durable-process.v2 driver with23 scenarios/four20-process races/real kill/restart evidence. This candidate closes one physical transaction gap only; it does not close PAR-217/218/220/224 or issue10.

W2 owns SQL/port/driver; W3 owns semantics and connection; W5 supplies its separately reviewed disposable fixture/runtime/restart facilities; W4 independently reviews exact SHA and runs acceptance. Handoff: issue67#6103024078. W5's existing74-migration recovery composition needs an explicit union with this candidate; its numbers cannot certify this new74-migration tree. Do not alter W5 sources, activate routes/effects or claim release readiness.

NEXT3: prove this exact native transaction candidate; add the typed server factory plus fenced execution and audit delivery; complete physical recovery/reconciliation driver before W4 review. Runs and actual outcomes belong in the PR checkpoint, avoiding a status-only re-execution of unchanged code.
