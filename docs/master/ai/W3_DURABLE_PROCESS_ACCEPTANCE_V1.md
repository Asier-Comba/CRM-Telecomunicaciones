# Native process/crash acceptance — W2 driver, W4 execution

Run only in an explicitly disposable local native PostgreSQL environment after
`npm run build`:

```sh
node scripts/durable-process-acceptance.mjs /absolute/path/to/w2-driver.mjs
```

No driver is provided by W3: this is executable acceptance orchestration plus an
oracle, not a Map adapter or a claim that DB acceptance passed. Missing driver
exits 2. PGlite shared-Map tests do not satisfy native independent-process evidence.
The runner forks 20 OS processes behind a startup barrier for each race; distinct
PIDs are checked. Workers open independent connections through the W2 driver.
It SIGKILLs at explicit adapter checkpoints and recovers in a new process. Timeout
is 30s per worker; logs contain only closed results, not environment/provider errors.

## Driver exports and trusted boundary

- `metadata = {contract:'assistant.durable-process.v1',backend:'native_postgres',disposable:true}`.
  W4 verifies environment independently; metadata alone proves nothing.
- `setupScenario(id): Promise<string>` creates a unique synthetic fixture namespace,
  active workspaces A/B, originator, other actor, scoped reconciliation principal,
  registered fake dispatcher and separate durable synthetic effect ledger. Return
  an opaque fixture ref (1–160 alphanumeric/underscore/hyphen), never credentials.
- `execute(job, checkpoint): Promise<closedResult>` runs the named action. The job
  includes fixture, scenario and action, plus killAt on crash cases. Every worker
  imports this module fresh; do not keep authoritative state in process memory.
  Race winners return `{authorization:'granted'}`, others `{authorization:'denied'}`.
  Only the winner may perform the registered synthetic effect.
- `inspectScenario(fixture): Promise<DurableObservation>` queries DB and the
  independent effect ledger, including original audit intent/content identity.
- `cleanupScenario(fixture)` removes only this harness's disposable data.

Credentials/configuration use W2's approved local environment. Do not send real
email/WhatsApp/Calendar or use production datasets. The fixture driver is trusted
server code, not model-selected code. W4 reviews driver and SQL before executing.

## Scenarios and setup

| Scenario | Initial state / action | Required recovery |
|---|---|---|
| reserve_race | no operation; 20 processes same binding/key call reserve + fenced start | one authorization; one registered synthetic effect; persist completion/audit |
| confirmation_race | one issued confirmation; same binding/key; 20 atomic confirm/reserve/enqueue calls | consume once, one operation/outbox; replay does not grant dispatch |
| crash_before_reservation | no operation; stop at barrier immediately before reserve | new process reserves and executes once |
| crash_after_reservation | commit reserved; barrier before granting execution | new process reauthorizes/fences start, executes once |
| kill_after_effect | executing, registered effect receipt committed in independent ledger; barrier before operation completion | new process verifies receipt, reconciles; no second effect |
| audit_delivery_outage | seed exactly one effect + execution authorization and reconciliation_required; sink unavailable | authorized commit retains original intent; recover sink and drain once |
| outbox_ack_loss | one registered outbox; effect ledger commits receipt; barrier before ack | verify original receipt; fenced ack/reconcile; no resend |
| lease_expiry | seed one executed effect, executing lease reaches exact expiry | expire to reconciliation_required, verify effect and complete; never automatic dispatch |
| cross_workspace_lookup | one reconciliation_required operation in A, zero effects | B lookup cannot see it; no transition/audit completion |
| cross_actor_lookup | same initial fixture, unprivileged different actor in A | no resource/result disclosure or transition |
| changed_digest | same operation/key; different argument digest | conflict, no execution authorization |
| revoked_principal | same operation; principal revoked between verification and commit | in-transaction denial, no transition |

Checkpoints are awaited at actual transaction/effect boundaries. Never fire a
synthetic label after an unrelated operation just to satisfy the runner.
`recover_and_drain` restores the synthetic audit sink, checks provider/effect ledger
before retry, reauthorizes, fences stale workers, and drains audit delivery. Unknown
effect must stay reconciliation_required; this fixture uses a verifiable receipt.

## Evidence oracle

For success/recovery scenarios exactly one operation, one execution authorization,
one effect, one immutable original completion/reconciliation audit intent and one
logical delivered original event; zero pending original events after drain; state
completed. Other diagnostic audits are excluded from original-event counters.
For negative scenarios one unchanged reconciliation_required operation, zero effect,
execution authorizations, original completion intents or deliveries.
All cases require zero unauthorized returned rows, forbidden transitions,
unregistered dispatches and automatic redispatches. Counters come from authoritative
ledgers/observed denials, not the runner's expected values. Schema is closed.

Also run existing `registerDurableAdapterConformance` against the real adapter:
confirmation tampering/expiry, changed bindings, outages and state guards remain
requirements. W4 should add database restart (not only application restart),
lease-fence stale ack, lost audit acknowledgement and altered-event-ref content
tests as engine-specific checks. This runner does not replace RLS/PostgREST/Storage
or arbitrary provider reliability testing.

Publish exact W2/W3/W4 SHAs, native PostgreSQL version, redacted fixture config,
runner report, actual kill checkpoints, independent effect/audit evidence and CI
URL in Issue #10. A green synthetic oracle test alone never clears that issue.
