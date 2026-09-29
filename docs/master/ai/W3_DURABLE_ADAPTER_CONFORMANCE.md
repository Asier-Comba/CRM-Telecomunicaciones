# W3 durable adapter conformance

Status: executable contract; no production adapter accepted.

## Purpose

`test/support/durable-conformance.ts` is the common acceptance suite for any persistence adapter used by assistant writes. An adapter is not considered durable because it implements the TypeScript interfaces; it must register a harness and pass the suite against its actual database and transaction primitives.

## Required adapter properties

| Boundary | Required property |
| --- | --- |
| Confirmation | Atomic one-time consume/cancel; expiry and all binding fields checked in the same authoritative transition. |
| Idempotency reserve | Unique, atomic reservation for workspace/capability/key with conflict on actor or argument changes. |
| Execution | Versioned transitions; no write handler before reserve succeeds. |
| Effect observation | Persist receipt/reference before completion; uncertainty cannot return to executable automatically. |
| Replay | Completed structured result survives process/database restart. |
| Retry | Only a verified pre-effect retryable failure can return to `reserved`. |
| Reconciliation | Only authorized server reconciliation can resolve `reconciliation_required`; exact workspace and version required. |
| Outbox | One operation has one command; claims are atomic and only one worker may perform the external effect. |
| Failure | Provider/database errors map to bounded codes; prompts, arguments, secrets and raw errors are not persisted to audit/output fields. |

## Harness lifecycle

An adapter test factory supplies confirmation, idempotency and outbox stores, deterministic fault injection and `restart()`. For a production candidate, `restart()` must create fresh clients/process state while retaining only database-backed records. Sharing an in-memory map is acceptable only for the included reference-contract test and is never acceptance evidence.

The current suite verifies:

1. 20-way confirmation consumption has one winner;
2. binding mismatch, cancellation outage and expiry fail closed;
3. 20-way idempotency reservation has one creator and correct actor/workspace/argument behavior;
4. reservation outage produces zero business effects;
5. completion replays after restart;
6. pre-effect retry keeps one operation and increments attempt;
7. post-effect completion uncertainty becomes `reconciliation_required` after lease/restart;
8. 20-way outbox claim has one winner and delivery survives restart.

## Required production extensions

Before W4 acceptance, the W1-backed adapter test environment must also demonstrate:

- at least two independent processes/connections racing the same confirmation, reservation and outbox claim;
- process termination after external effect but before completion persistence;
- database connection loss and transaction rollback at every mutation boundary;
- database/service restart with replay and reconciliation;
- cross-workspace and removed-membership denial using the accepted authorization resolver and RLS policies;
- outbox worker lease expiry/recovery without duplicate external effect;
- audit retention/delivery behavior agreed with W4.

## Integration rule

Do not weaken or fork the common harness inside an adapter PR. Register the adapter factory against the shared suite, add provider-specific crash fixtures separately, and keep PR #9 isolated until W4 names the accepted W1 integration base.
