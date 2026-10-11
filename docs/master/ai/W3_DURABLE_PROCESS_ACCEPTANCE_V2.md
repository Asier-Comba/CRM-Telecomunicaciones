# Native durability acceptance v2 — W2 implementation, independent review pending

This is an executable specification, not a database adapter or acceptance result.
W2 supplies the driver. W4 unavailability does not waive independent review or
allow Issue10 closure, staging, production or assistant writes.

After `npm run build`, run in an explicitly disposable native PostgreSQL fixture:

```sh
node scripts/durable-process-acceptance.mjs /absolute/reviewed/w2-driver.mjs
```

Metadata must be exactly `{contract:'assistant.durable-process.v2', backend:'native_postgres', disposable:true}`.
A v1 driver is rejected rather than silently receiving new semantics. The
required exports and connection/cleanup boundary are stated below. The former
reference to W3_DURABLE_PROCESS_ACCEPTANCE_V1.md pointed to an absent file in the
current tree; it is not a prerequisite or a source of unverified decisions.
Missing driver exits2; failures exit1. Metadata and driver assertions are not
independent proof: review the exact driver and authoritative ledgers.

The observation, rollback and restart oracles now require exact ordinary JSON
data: enumerable own data fields, no getters, symbols, hidden extra fields or
custom prototypes. The rollback array must also contain exactly its six dense
enumerable own rows. Descriptor/prototype inspection failures return false and
do not expose the original error. Frozen/JSON-roundtripped valid measurements
remain accepted. Counts, states,23 scenarios/four20-worker races, rollback order
and restart invariants are unchanged.

The previous oracle reproducibly accepted an observation with accessor counters
(32 getter calls), an observation carrying a hidden extra field, and nonenumerable
required rollback/restart fields; an ownKeys inspection trap also escaped as an
exception. The new regressions require rejection without getter evaluation and
preserve every existing positive and negative semantic fixture. This closes an
evidence-admission gap only: it does not create a physical adapter, certify a
driver's assertions, prove a native transaction/crash/restart, approve W4 or
enable business effects. No schema/fixture/provider/worker ownership changes.

Before calling `setupScenario` or creating workers, the runner now requires all
six exports below to be functions. A driver with otherwise valid metadata but a
missing/non-function export exits2 with `durable_driver_exports_required` and
never calls setup. Previously an incomplete driver could reach setup and then
fail during execution; a synthetic filesystem marker reproduced that admission
gap without opening a native database. The regression covers all six omissions
and six non-function variants, and checks that a complete interface still reaches
setup and reports its failure with a closed code. This is only structural
prerequisite validation: it does not approve the module, sandbox import-time
side effects, validate its credentials or prove any physical durability result.

## Complete driver interface and owner boundary

The executable sources are [runner](../../../scripts/durable-process-acceptance.mjs),
[worker](../../../scripts/durable-process-worker.mjs) and
[scenario/oracles](../../../src/assistant/durable-process-spec.ts). This section
documents their existing calls; it changes neither code nor protocol. The driver
must export the following in addition to the exact metadata above:

| Export | Actual caller and requirement |
|---|---|
| `setupScenario(scenarioId)` | Parent; creates one isolated synthetic fixture and returns an opaque string matching `[A-Za-z0-9_-]{1,160}`. Never return a DSN, cookie, key or actor/workspace material. |
| `connectWorker()` | Each separately forked worker/recovery process, before the start barrier; opens its own native PostgreSQL connection and returns its measured positive integer `pg_backend_pid()`. That same connection is used by `execute`. |
| `execute(job, checkpoint)` | Worker; `job` contains the opaque fixture, exact scenario/action and optional `killAt`. Implements the real native transaction/effect/drain path. For a20-worker race, exactly one outcome has `authorization: 'granted'`. Recovery runs as action `recover_and_drain` in a new process. |
| `inspectBoundary(fixture)` | Parent, after the cutpoint and before recovery; returns the measured scenario-specific rollback/restart/fence/immutable-audit evidence below. No aggregate approval booleans or in-memory substitute for DB state. |
| `inspectScenario(fixture)` | Parent; returns exactly the closed `DurableObservation` fields in the scenario/oracle source, measured from authoritative DB rows and an independent synthetic effect ledger. |
| `cleanupScenario(fixture)` | Parent in per-scenario `finally`, after terminating remaining child processes; removes only that driver's verified disposable fixture resources. Never delete/restart an existing personal/hosted/production database. |

The `checkpoint(name)` callback is supplied by the worker wrapper. At the matching
`killAt` it informs the parent and stays alive until the parent sends SIGKILL; the
driver must await it at the exact transaction/effect/ACK boundary. A simulated
exception, clean process exit or fabricated PID does not establish that cutpoint.
Each worker has the existing30s watchdog. Race participants have distinct process
and backend PIDs; recovery is a new process and actual independent connection.

The reviewed local absolute driver path is the only CLI binding. The driver gets
approved disposable credentials through its own local environment, never JSON
CLI arguments, reports, committed fixtures or model input. Worker stdout/stderr
remain ignored and failures use closed codes. Source review must verify native
connection binding, real transaction/ledger implementation, teardown ownership
and the exact DB cluster restart; self-reported metadata cannot prove them.

The actual factory also needs the separate
[`registerDurableAdapterConformance`](../../../tests/assistant/support/durable-conformance.ts)
suite against the interfaces in
[`durable-db-contract.ts`](../../../src/assistant/durable-db-contract.ts).
The in-memory reference factory and its passing tests do not register a native
production provider and cannot satisfy issue10.

Owner handoff: W1/W2/W3 own the physical domain adapter/driver and its semantics;
W5 owns only its separately reviewed native fixture/runtime/restart facilities.
W4 owns independent execution/review. An infrastructure recovery test is not this
business durability test. W5's offer of fixture assistance does not implicitly
delegate W3 implementation or authorize provider registration, IA writes,
staging, production, VPS or existing database changes. Any proposed boundary
must identify the exact driver/factory and runtime sources before adoption.

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

Fence and immutable-audit boundary measurements now use the same exact own-data
admission as observation, rollback and restart evidence. Fence rejection arrays
must have seven dense enumerable own data entries in the existing order. Hidden
or symbol fields, accessors, custom prototypes and failed descriptor inspection
return false without evaluating evidence getters or exposing inspection errors.
The previous runner assertion blocks accepted both accessor records (11 getter
calls across the two shapes) and hidden extra fields in a six-case synthetic
reproduction. Ordinary, frozen and JSON-roundtripped measurements remain accepted.
This is evidence admission only: the 23 scenarios, native ledger requirements,
claim fencing, audit identity, worker protocol and independent W4 gate are unchanged.
No physical adapter, database restart, real business effect or acceptance is proved.

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

## Actual database restart evidence

`database_restart` uses `restart_disposable_database_after_commit`. Only the
reviewed, explicitly disposable native driver may restart its own test cluster;
this spec grants no production/VPS infrastructure authority. Connection termination
remains a separate scenario and cannot substitute for restarting the postmaster.

`inspectBoundary(fixture)` must return exactly:
`{beforeSystemIdentifier,afterSystemIdentifier,beforePostmasterStartMs,afterPostmasterStartMs,originalBindingDigest,persistedBindingDigest}`.
Measure the system identifier from `pg_control_system()` and the start time from
`pg_postmaster_start_time()` before/after the restart. The same identifier and a
strictly later start time are required; each timestamp is safe integer epoch ms.
Digests are equal SHA256 of the exact actor/workspace/capability/idempotency/argument
binding persisted before the committed reply was lost. Inspect again afterward,
before a fresh recovery process drains/reconciles; the normal final ledger oracle
still requires exactly one effect and original audit delivery. No new intent/key.
Do not print identifiers or binding material. Evidence shape rejects unknown
fields, accessors and symbols. Exact reviewed driver source and independent W4
execution are still required: a unit test of this oracle proves no DB restart.

Run registerDurableAdapterConformance against the real factory as well. Current
W3 unit/IPC tests verify protocol mechanics and rejection controls only; none of
these native scenarios has run without an actual physical adapter/driver. Real DB
restart now has a required executable scenario, still NOT_RUN; Supabase
JWT/PostgREST/Storage and infrastructure recovery remain separate gates.
