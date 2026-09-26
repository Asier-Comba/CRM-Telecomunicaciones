# Atomic reconciliation and audit candidate — offline only

The existing reconciliation service and separate audit sink are **not** made
atomic by this document or by passing the new simulation. Audit loss after an
applied transition remains a release blocker until a real adapter integrates this
boundary and passes PostgreSQL, restart, concurrency and RLS evidence.

`src/assistant/atomic-reconciliation.ts` specifies one database transaction:

1. Lock the operation under `(workspace_id, operation_ref)` and check immutable
   actor/capability/digest binding and exact optimistic version.
2. Require `reconciliation_required`. Apply only independently verified resolution.
   Completed results use a safe result reference; no provider body is stored.
3. Persist the original redacted audit event and its delivery outbox item.
4. Commit all changes together. A stable server event reference plus exact
   canonical command digest detects transport replay and tampering.

The authorization service must independently resolve current workspace/member
permissions, verify the business outcome and validate the registered capability
output schema before this call. The adapter repeats tenant/binding/version checks
inside its transaction. This contract adds no production route or business writer.
It dispatches audit delivery only; reconciling uncertainty never repeats the
business effect.

## Synthetic crash matrix

| Injected interruption | Required observed state | Recovery |
| --- | --- | --- |
| Before read | Original operation; no audit | Retry command |
| After read | Original operation; no audit | Retry command |
| After staging transition | Original operation; no audit | Roll back and retry |
| After staging audit | Original operation; no audit | Roll back and retry |
| Before commit | Original operation; no audit | Roll back and retry |
| After commit, before response | Transition and original audit both committed | Replay exact command; do not transition again |
| After sink acceptance, before outbox acknowledgement | Original event remains pending | Redeliver same event reference to idempotent sink |

The test adapter uses synchronous map updates, a shared map to simulate restart,
and synthetic fault injection. Its twenty-way race proves the contract model
only. It does **not** prove durability, process isolation, database locking,
transaction crash recovery or RLS. Production must execute the same matrix with
real transactions/process termination and independent database connections.

Audit delivery is at least once. A cooperating sink atomically deduplicates
`(workspace_id,event_ref)` against immutable content before acknowledging. The
simulation observes one recorded event despite two delivery attempts. This is
not an exactly-once guarantee for arbitrary providers. Sink outages leave the
original event pending; retries do not create a replacement reconciliation event.

## Production integration gates

- W4 accepts the W1 base and mapping; no live migrations are authorized here.
- Transaction also enforces forced RLS, immutable tenant bindings, append-only
  audit events, stable canonical serialization and uniqueness constraints.
- Audit workers use bounded workspace batches, expiring claims and idempotent
  acknowledgement. Production schedules retries and monitors undelivered events.
- Writes remain disabled until verified crash/restart/RLS evidence and review.
- The READ graph's optional `currentScope()` hook is optional for static offline
  tests only. Any future production route must supply a server scope resolver;
  the graph snapshots scope/audience and discards results on epoch changes or
  resolver errors. Each injected reader still reauthorizes every operation.

The READ graph currently passes safe entity-selection metadata between nodes;
it is not a live reader, answer generator, or replacement for W1 DTO projection
and grounding. Dashboard success is `read`, never an invented zero-count answer.
