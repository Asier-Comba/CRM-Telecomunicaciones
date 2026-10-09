# Windows native prerequisite exit

Owner W3. Base composition0fa8864928074e86a40cdc38707111df7f1f7060.
Windows Node24.12.0 full assistant suite480/481 failed the unchanged driverless
native-runner prerequisite: expected exit2, observed unsigned3221226505
(signed-1073740791). Independently running the CLI without a driver reproduces
the correct prerequisite message followed by libuv UV_HANDLE_CLOSING assertion.
No database driver was supplied and no physical durability evidence was produced.

The CLI now scopes execution in async main and returns with process.exitCode=2
for each existing early refusal rather than forcing immediate process.exit(2).
This lets Node drain its pending handles. The exact three refusal gates/messages
and required driver metadata remain; worker count, IPC barriers, kills, recovery,
restart evidence, inspections and cleanup are unchanged. No driver is added.
No permission, RPC, schema, Auth, environment or business action is enabled.

Existing two process/protocol tests PASS on Windows after correction; complete
assistant suite481/481 PASS before adding the meaningful additional guard test.
The added guard test requires safe exit2/no stdout for missing and explicitly
non-disposable synthetic adapter metadata, and proves the adapter setup is not
invoked. Temporary cleanup checks its absolute parent/name before deletion.
Final Windows focused3/3 and full482/482 PASS,0 skipped. Script syntax and lint
PASS (the isolated worktree lint emits a React auto-detection configuration warning
because its dependencies are reused only as a CLI, not installed in that worktree).
Exact published-source CI remains required. This is
process mechanics and fail-closed prerequisite evidence, not DB/process durability.
Lint and script syntax are checked; inherited full audit5HIGH/#29 remains blocked.
Issue10 and independent W4 review remain required; AI writes remain disabled.

Preceding portability #37 and Auth #41 each achieved actual107/107 at their own
70-migration sources. Composition#38 at0fa8864/checkouts a128066ce19b943b97f6114186e2cb7e0c6d90cb
has actual Auth/history/CAS/replay/revocation/cookie checks and3409+227 PASS but
whole product106/107 due document_drag upload TIMEOUT; no complete compatibility
acceptance. Persisted-history UI #42 is a separate pending candidate. PUBLIC
critical risk, missing00–19 snapshots and persistent local Supabase resource gate
remain recorded. W5/VPS/production/providers are untouched.

Next three: publish exact Windows and CI evidence; consume through a reviewed
normal composition after source gates; diagnose actual document upload latency
and prove complete history UI/product integration without increasing timeouts.
