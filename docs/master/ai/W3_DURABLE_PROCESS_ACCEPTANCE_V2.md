# Native durability acceptance v2 — W2 implementation, independent review pending

This is an executable specification, not a database adapter or acceptance result.
W2 supplies the driver. W4 unavailability does not waive independent review or
allow Issue10 closure, staging, production or assistant writes.

After `npm run build`, run in an explicitly disposable native PostgreSQL fixture:

```sh
node scripts/durable-process-acceptance.mjs /absolute/reviewed/w2-driver.mjs
```

Metadata must be exactly `{contract:'assistant.durable-process.v2', backend:'native_postgres', disposable:true}`.
A v1 driver is rejected rather than silently receiving new semantics. The exports,
independent connection/PID requirements, credential boundary and cleanup rules in
W3_DURABLE_PROCESS_ACCEPTANCE_V1.md continue to apply, except `inspectBoundary`
now returns measured records described below instead of aggregate approval flags.
Missing driver exits2; failures exit1. Metadata and driver assertions are not
independent proof: review the exact driver and authoritative ledgers.

## Added/strengthened scenarios

| Scenario | Actual cutpoint / invariant |
|---|---|
| claim_race | Seed one confirmed operation/registered pending outbox;20 independent claimers; exactly one current execution authorization/effect. |
| kill_before_effect | SIGKILL after execution authorization, before effect. Recovery must independently verify absence, record verified-retryable resolution and explicitly authorize retry. Exactly2 authorizations,1 effect;0 automatic redispatches. |
| kill_after_transition | SIGKILL after completion/reconciliation transaction commit. Original audit intent and delivery obligation already durable; recovery only drains/replays safely. |
| audit_ack_loss | SIGKILL after synthetic sink accepts original event, before delivery ACK. Physical delivery may repeat; logical event count remains1 with identical original content. |
| database_connection_termination | Driver terminates actual worker DB connection during transaction, using a separate connection; no partial confirmation/operation/outbox/audit commit. Recovery reconnects/retries authoritatively. No mock exception substituted for backend termination. |
| committed_reply_loss | Commit atomic confirm/reserve/enqueue, deliberately lose response; identical actor/workspace/capability/digest/key/confirmation replay returns same logical operation. No second consumption or authorization. |
| claim_fencing | Worker A/fence1 expires at exact equality; worker B gets higher fence. Reject all stale/foreign/future ACK variants with zero changed rows. |
| audit_content_conflict | Persist original immutable event; same workspace/eventRef + changed content conflicts without replacement. Identical delivery is logically deduplicated. |

Existing reserve, confirmation and reconciliation races remain20-way; there are
now four native races. All prior crash/lookup/revocation/outage scenarios remain.
All worker and recovery connections must be actual independent PostgreSQL clients.

## Atomic rollback evidence

`atomic_operation_outbox` injects failure at all six cutpoints in order:

1. after_confirmation_lookup
2. after_confirmation_consume
3. after_operation_insert
4. after_command_insert
5. after_outbox_insert
6. before_commit

`inspectBoundary(fixture)` returns an array, one record for each cutpoint:

```json
{"point":"after_confirmation_consume","consumedConfirmations":0,"operations":0,"commands":0,"outbox":0,"auditIntents":0,"auditDeliveries":0}
```

Counts are measured immediately after rollback, from a separate DB connection,
as deltas to an issued-confirmation baseline; evidence must survive the subsequent
valid retry. No consumed proof without associated operation. The runner rejects
missing/reordered points, nonzero partial commits, missing/extra fields. Then the
valid retry/recovery must produce one operation/effect/original audit.

## Fences and audit identity evidence

For `claim_fencing`, `inspectBoundary` returns exactly:

```json
{"priorFence":1,"currentFence":2,"changedRows":0,"rejected":["expired_owner","stale_version","wrong_worker","wrong_workspace","wrong_operation","old_fence","future_fence"]}
```

Numbers come from actual persisted claims; currentFence must strictly increase.
At expiry equality, the old lease grants no authority. No reservation alone grants
execution, and a stale owner cannot ACK after the new fence is committed.

For `audit_ack_loss`, `audit_content_conflict`, `kill_after_transition`, return
`{originalDigest,persistedDigest,changedContentRejected:true}`. Both digests must
be the same64hex SHA256 of the original canonical immutable event. Capture original
content before the outage/crash and read persisted content afterward, before drain;
perform the changed-content collision attack. Never substitute a later conflict
or request audit for the original transition event.

Final `inspectScenario` is still the closed ledger/count observation. Recovery
must leave one logical original delivery and no pending original event. Unknown
provider outcomes stay reconciliation_required; this suite's successful recovery
fixtures offer independent receipt or absence evidence. Do not infer absence from
timeout, transport failure or a missing in-process cache entry.

Run registerDurableAdapterConformance against the real factory as well. Current
W3 unit/IPC tests verify protocol mechanics and rejection controls only; none of
these native scenarios has run without W2's actual adapter/driver. Real DB restart,
Supabase JWT/PostgREST/Storage and infrastructure recovery remain separate gates.
