# W4 status — iteration4.2

Verified2026-09-27 UTC. CAN_INTEGRATE YES; CAN_STAGE NO; CAN_PRODUCE NO.
ACCEPTED INTEGRATION BASE: 6b0e30e7444de57100e4d983b3564a0c3b336b2c

W1 onboarding42702 FIXED by reviewed forward migration. Clean quality22 tests/build/audit and both DB runners pass; CI148 secret scan passes.
W2 Backend takeover reviewed atc3b1f9f, descending from accepted6b0e30e with originals preserved; PR17 open; all10 migrations apply but domain SQL42703 and READ/date3PASS/11FAIL persist. Original domainPR15 remains blocked on trigger/import/DTO/date defects; safe foundation composition allowed.
W3@c804acd80f51dd285c8f6e488efa36a8d539e0eb:393 official+6 independent W4 tests PASS; lint/types/build PASS. Previous reconciliation state-only/audit emission seam and result authorization gap FIXED. Missing/wrong atomic acknowledgment denies SUCCESS; 20-way race has one transition/intent in reference model.
Issue10 remains open ONLY for actual native durable adapter/transaction/process/recovery evidence. Map assertions are not DB evidence. P2 unknown scenario oracle FIXED atfd45ef81898f870d6ded5bedf705a98a50461f19: build,2 targeted official tests,7 independent invalid IDs+positive control PASS; PR9 comment5857166548. No new application P0/P1.
W4 CI169@f25d584 PASS. PR17 handoff5857144732. Fresh reviews published PR9 comment5857101921 and Issue10 comment5857106058.
W4 owns review/CI/harness/gates only. No product fixes pushed to W1/W2/W3. Production untouched; no main/merge/remote DB operations.
Authoritative current detail: ../W4_ITERATION_4_2.md, ../SYSTEM_STATE.md, ../W4_PORTABILITY_AUDIT.md and .security/release-gates.json v2.
All cross-Work findings published on exact GitHub PR/Issue with SHA/repro/acceptance. No Project sync in4.2.
Next: inspect actual W2 takeover topology/fixes on publication; run stored secure-acceptance cases and native durability adapter suite when implementation exists. Platform credentials/config/real Auth/PostgREST/Storage remain staging gates, not canonical composition blockers.

## Archived iteration4.1 status — SHA-specific history, superseded above


Verified 2026-09-26 UTC. Current work: `w4/night-shift-v3`.
`w4/security-baseline@5cb872c` is preserved; never promote it directly to main.
Only writable repository: Asier-Comba/CRM-Telecomunicaciones. Historical repository read-only.

## Current evidence

| Work | Reviewed SHA | Result |
|---|---|---|
| W1 PR14 | 32f01120a0abd499a856dabc05fa1887456cff2f | Real application, 20 built routes. Clean install/lint/types/22 tests/build/audit pass. All 3 migrations apply, but authenticated onboarding fails SQLSTATE42702 ambiguous id. Not accepted canonical. |
| W1 PR15 | e65f1e802fbcb63f9a1636689b85eb2aa135c592 | All 9 migrations apply. Domain SQL stops SQLSTATE42703 NEW.service_kind absent. 80 official bootstrap tests and 4 W4 reproduction/control probes pass, NOT a database acceptance result. |
| W2 PR8 | db8ab41c4e8740aecacc17750ae0bcfaef5d31b5 | 179 official tests plus 7 W4 probes. Bootstrap/READ contract work may continue; expiry/revocation P1s need fixes. |
| W3 PR9 | 91b4b3e83ad20bd27b39ff7df8b74e26c6daa8ab | 173 official tests plus 6 W4 probes; lint/types/build pass. Issue10 durable mutation gate remains. |

Tests marked reproduction deliberately assert vulnerable behavior: green is evidence of reproduction, not acceptance.
Database engine: disposable in-memory PGlite0.5.8/PostgreSQL18.3 with synthetic auth fixtures, pgcrypto and btree_gist.
Not native multiprocess/PostgREST/Supabase, Storage, staging or restore evidence.

## Findings and handoffs

- W1 P1: onboarding profile upsert ON CONFLICT(id) conflicts with RETURNS TABLE id. Use unambiguous named constraint and execute fresh/retry/suspension/rollback tests.
- W1 P1: shared portfolio trigger references fields from another record type within a boolean expression. Separate PL/pgSQL branches before SQL preparation. Run entire domain RLS script.
- W1 P1: READ service trusts outer envelope but passes nested foreign scope, unknown fields and raw repository error detail. Closed projection and nested scope validation required before integration.
- W1 data validation: impossible calendar dates reach repository.
- W1 P1 VERIFIED independently on unmodified e65f1e8: privileged INSERT can create a completed import with fabricated99 counters and no staging/application rows. Not a browser authorization bypass. Enforce initial state/counters in DB; standalone synthetic reproduction is versioned.
- W2 P1: lexical ISO comparisons permit expired reveal/copy; revoked sensitive state/overlay can be reopened by queued prior events. Require numeric instants and authorization-generation fencing.
- W2 P2: lexical mutation ordering; request-ID reuse after tombstone eviction; NaN collection window.
- W3 operationRef reflection P1 FIXED at91b4b3e; constant invalid marker verified with regression test.
- W3 P1: reconciliation verifier data accepts arbitrary private fields inside SUCCESS data; outer-envelope closure is not capability output-schema validation. Require per-capability parser before transition; no live leak claimed.
- W3 P1/durable gate: audit outage after successful reconciliation loses original transition event; request retry only audits conflict. Transactional audit delivery needed.
- W3 P0 mutation release: durable runtime-integrated adapter, atomic op/outbox, independent-process race/restart/kill-after-effect recovery and tenant authorization remain unproven. Reference Maps are not durable evidence.

Published evidence: PR14 comment5850623326; PR15 comment5850642127; PR8 comment5850636565; Issue10 comment5850635726.
Issue10 remains open. PR9 is not approved; W3 can continue foundation and fixes. W2 is not blocked for W1 ownership issues.

## Fixed / superseded findings

W3 framework confirmations, in-process 20-way reservation, reconciliation lease behavior, bounded outages, bare Bearer/AWS output variants fixed.
W2 route IDs, telemetry projection, runtime parsing/impossible dates in transport adapters, identity correlation and stale stream fencing fixed.
W1 helpers now require active workspace in reviewed source. End-to-end onboarding/suspension validation blocked by SQL error; do not repeat old helper finding as current.
Old PR11/history findings are historical, not a diagnosis of reconstructed PR14. Independently inspected PR14 CI109: full-history Secret scan job108408686957 succeeded. Local reachable-object check found no old archive/known blob-prefix/env files. This is scanner evidence, never a guarantee of absence of every possible credential.

## W4 independent implementation

Existing CI, secret scan, dependency/migration policies, staging/restore validators and tenant/assistant matrices preserved.
Added disposable real PostgreSQL runner and pinned lockfile, branch-specific adversarial reproduction artifacts.
Fixed evidence-validator null/primitive crashes and rejection of negative assistant effect counts; negative controls added.
Machine-readable release state: .security/release-gates.json.
Production untouched. Staging unprovisioned. No main/merge/deploy/settings/DNS/remote DB operation.
Synthetic embedded snapshot/restore self-test passes checksum/data/RLS; no application/Storage/n8n/commercial DR exercise claimed. Project sync attempted: signed-in browser lists CRM TELECOM-MASTER and its chats, but opening the observed MASTER chat via UI and direct observed URL redirects home. No chat contents read or checkpoint sent; GitHub holds handoffs. No login failure or bot block is inferred.

## Latest implementation checkpoint

PR16 draft on w4/night-shift-v3, commit b595249; CI132 passed disposable PostgreSQL controls, secret scan, baseline/migration checks. Dependency Review and Playwright skipped for documented prerequisites. Baseline5cb872c remains untouched.
Follow-up e8906ff also passed CI134, including the snapshot/restore self-test and dependency audit (0 vulnerabilities). This is the latest verified implementation checkpoint; later documentation-only commits do not replace its evidence.
Local diagnostic patches (not W1 commits): named profiles_pkey resolves onboarding and passes retry/suspension; separating both shared-trigger table branches allows full domain SQL fixture to complete. W1 must publish reviewed forward corrections before those gates can be accepted.
Infrastructure decision draft covers stage options, weighted criteria, environment separation and provisional recovery targets without asserting deployment/provider capabilities.

## Next safe work

Rerun SQL after W1 publishes fixes; bind native database process races to W3's durable adapter when implemented. API/Storage/JWT/effect-provider acceptance needs actual nonproduction adapters/resources, not synthetic stand-ins.
Integrate reviewed controls only after accepted base. Infra decision, local harness expansion, executable SQL, snapshot self-test and current-head handoffs are prepared. Real staging/Hostinger/n8n inventory and full restore remain externally gated; no credentials requested in chat.
Refetch after each block and review deltas. Human approval remains required for production/critical permissions. Project navigation failure is nonblocking for GitHub work.
