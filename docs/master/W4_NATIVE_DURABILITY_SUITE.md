# Native PostgreSQL durability acceptance contract

Ready to bind to W2 durable adapter; NOT EXECUTED against native PostgreSQL.
Executable report checks: scripts/security/native-durability-harness.mjs. Self-test uses fabricated metadata to validate rejection rules; never save its result as database evidence.

Adapter environment must be isolated synthetic test only. Reviewed implementation must create a disposable database and obtain backend PIDs from actual pg_backend_pid() queries; client PIDs come from real spawned worker handles. Database URLs/passwords stay in scoped environment/secret bindings, never CLI args, stdout, evidence or exceptions. No production/remote target without explicit applicable authorization.

For each of the three20-way races, start20 separate OS workers with20 independent DB connections. Use a barrier to contend on the same scoped identity, inspect committed ledger/effects from a fresh connection, require one winner, never infer effects from handler-return count. Tenant and actor tampering use the same key but changed authority/digest; no foreign state/result read or effect allowed.

Restart cases terminate the first worker and create a fresh worker/connection: after reservation, after effect applied, before completion commit. Kill-after-effect requires observed process signal/exit and durable effect receipt; uncertainty becomes reconciliation_required and never repeats effect automatically. Expired leases likewise require explicit verified reconciliation.

Operation+outbox and reconciliation+original audit intent/delivery outbox must share respective DB transactions. Inject failures before each commit and after commit/before response. Observe atomic visibility from separate connections and no orphan row. Audit-sink outage then worker restart must deliver the original stable event exactly once at a deduplicating sink; conflict-event replay is not original-event recovery.

Record exact application/adapter/schema SHAs, PostgreSQL version, run identifier,20 unique worker/backend IDs, cutpoints, durable ledger counts and safe outcome codes. Reviewer inspects adapter source and raw synthetic job evidence; a JSON report alone cannot prove its own truth. The checker intentionally excludes arbitrary adapter payload fields from returned summaries.

No schema, RPC or product implementation is invented here. Bind this suite after W2 publishes the real adapter. PGlite/shared Maps/Supabase Auth/Storage are distinct evidence levels; report-validator self-tests satisfy none of their integration gates.
