# C2 review update — supersedes the baseline storage mismatches below

TARGET: PR19 / implementation8e978e04d6f179fcad6aa624923a03dd3b54d092.
Latest branch head a917bbb41ef8192344dc49737cd78fd52fe29649 only updates
W2 status: native PG16 CI/restore reported PASS; source reviewed is unchanged.
W3 independently executed PGlite, not that native job.
PASS: exact verified-absence codes now admitted; immutable-created_at backfill,
persisted statement-time default, NOT NULL. No changes to previous migrations or
grants. W3 independently reran4 static tests and25 migrations/domain/reader/durable
fixtures + embedded restore. Additional W3 SQL round-trips of BOTH codes retain
the exact same stored lease; NULL update rejected (23502). PGlite0.5.8 only.
No native PostgreSQL executable or durable adapter/driver exists here. No authority,
lease expiry, crash or concurrency acceptance is inferred from direct SQL fixtures.

Repro: npm ci --ignore-scripts in the checkpoint's ephemeral-postgres package;
node scripts/review-w2-durable-alignment.mjs <exactSHA> <absolute-detached-checkout>.
Evidence: W3_W2_ALIGNMENT_EXECUTION_60.json. Source probe intentionally returns
REVIEW_REQUIRED for forward DDL; W3_W2_FORWARD_REVIEW_60.json reports original
foundation findings, NOT current effective-schema defects. This reviewed C2
correction supersedes the prior1c8b3e9 source/storage findings. Further forward
migrations require fresh exact-SHA review. READ files unchanged; exact8e978e0 replay
also passes all14. SAFE TO CONTINUE: isolated adapter development, not enablement.

---

# W3 → W2 platform handoff — iteration6.0

Latest reviewed platform source: `1c8b3e9fe0fba12d9bad6b313b46e8be7a574603` (PR18).
W2 platform-closure-v1 is now published at the same SHA (zero diff to W5).
No forward durable correction, DurableDatabasePort implementation or native driver
was present in that exact tree. Issue10 remains
the canonical conversation. W2 owns physical SQL/Supabase/platform; W3 semantics.

READ PASS: all14 signatures/DTO source unchanged. Exact service/repository/cursor
code replays through W3 parser with synthetic RPC; NOT DB/RLS/Auth evidence.
Reports: `docs/master/ai/W3_TELECOM_COMPATIBILITY_60.json` and
`W3_TELECOM_SERVICE_EVIDENCE_60.json`. W3's source pin now matches1c8b3e9.
Team dashboard unavailable, personally unattributed renewal/permanence unavailable,
source UTC retained. No false empty conversion or invented joins.

DURABLE MISMATCH: failure CHECK still excludes `effect_absence_verified_retryable`
and `effect_absence_verified_terminal`. Operation lease is nullable versus required
persisted W3 leaseExpiresAt. Required: forward correction, no semantic remapping or
new read-time lease. State enums/digest match. Reserved alone never authorizes effect.
Static report: `W3_DURABLE_SCHEMA_EVIDENCE_60.json`; probe exits1 for this source.
Probe now scans later migrations and returns exit2 REVIEW_REQUIRED when any future
assistant DDL appears: it does not pretend to evaluate effective SQL by regex.
Schema-version/result/audit/authorization checks remain explicitly adapter-required.

RUNTIME: authoritative port is `ReconciliationPersistence`/`DurableDatabasePort`.
Machine transaction manifest now explicitly lists delivery outbox for confirm,
completion and reconciliation (existing prose requirement, no new state machine).
Legacy confirmation.operationRef means confirmation identity, not operation identity;
separate immutable association remains mandatory. Production dispatcher stays empty.

PROCESS: runner now requires `assistant.durable-process.v2`; see
`W3_DURABLE_PROCESS_ACCEPTANCE_V2.md`. Four20-worker races, six exact rollback
cutpoints, stale/future claim ACKs, commit/reply loss, DB connection termination,
original audit identity and lost sink ACK. Version change is explicit; old v1 driver
is not silently accepted. Native acceptance NOT RUN; no Map substitute.

READ-ONLY TURN: `runTelecomReadTurn` accepts bounded text, injected approved semantic
planner and authorized server adapter. One closed plan then deterministic UI v1;
CRM result text never re-enters a tool-calling model. `telecom-semantic-policy.ts`
covers all14 operations. No HTTP routes or provider/model defaults. Optional server
reference offers must already exist in SessionReferenceStore, bound to source op.
In-flight session/entity revocation also invalidates unbound searches; bounded read
guards are released in finally. Frames reject mixed origins/duplicate logical IDs.

NEXT REQUIRED FROM W2: exact forward migration SHA + native adapter factory path +
v2 driver module. W3 will review exact source, bind conformance and run native suite.
No API keys requested in chat/GitHub. Live semantic evaluation has one external
prerequisite: reviewed W3_EVAL_PROVIDER_MODULE with approved model/secure credentials.
W4 independent gate preserved; no Issue10 closure, assistant writes, merge or deploy.
