# W4 — Security, QA, DevOps and release status

Verified 2026-09-26 UTC. Current work: `w4/night-shift-v3`.
`w4/security-baseline@5cb872c` is preserved; never promote it directly to main.
Only writable repository: Asier-Comba/CRM-Telecomunicaciones. Historical repository read-only.

## Current evidence

| Work | Reviewed SHA | Result |
|---|---|---|
| W1 PR14 | 32f01120a0abd499a856dabc05fa1887456cff2f | Real application, 20 built routes. Clean install/lint/types/22 tests/build/audit pass. All 3 migrations apply, but authenticated onboarding fails SQLSTATE42702 ambiguous id. Not accepted canonical. |
| W1 PR15 | e65f1e802fbcb63f9a1636689b85eb2aa135c592 | All 9 migrations apply. Domain SQL stops SQLSTATE42703 NEW.service_kind absent. 80 official bootstrap tests and 4 W4 reproduction/control probes pass, NOT a database acceptance result. |
| W2 PR8 | db8ab41c4e8740aecacc17750ae0bcfaef5d31b5 | 179 official tests plus 7 W4 probes. Bootstrap/READ contract work may continue; expiry/revocation P1s need fixes. |
| W3 PR9 | c6e869e75632ed4b2590cb5ac2285b3698749ed2 | 62 official tests plus 5 W4 probes; lint/types/build/audit pass. Issue10 durable mutation gate remains. |

Tests marked reproduction deliberately assert vulnerable behavior: green is evidence of reproduction, not acceptance.
Database engine: disposable in-memory PGlite0.5.8/PostgreSQL18.3 with synthetic auth fixtures, pgcrypto and btree_gist.
Not native multiprocess/PostgREST/Supabase, Storage, staging or restore evidence.

## Findings and handoffs

- W1 P1: onboarding profile upsert ON CONFLICT(id) conflicts with RETURNS TABLE id. Use unambiguous named constraint and execute fresh/retry/suspension/rollback tests.
- W1 P1: shared portfolio trigger references fields from another record type within a boolean expression. Separate PL/pgSQL branches before SQL preparation. Run entire domain RLS script.
- W1 P1: READ service trusts outer envelope but passes nested foreign scope, unknown fields and raw repository error detail. Closed projection and nested scope validation required before integration.
- W1 data validation: impossible calendar dates reach repository.
- W1 candidate, NOT verified: import direct terminal-state insertion bypass. Earlier trigger failure prevents reaching this test.
- W2 P1: lexical ISO comparisons permit expired reveal/copy; revoked sensitive state/overlay can be reopened by queued prior events. Require numeric instants and authorization-generation fencing.
- W2 P2: lexical mutation ordering; request-ID reuse after tombstone eviction; NaN collection window.
- W3 P1: invalid operationRef reflects raw input; use constant invalid marker.
- W3 P1/durable gate: audit outage after successful reconciliation loses original transition event; request retry only audits conflict. Transactional audit delivery needed.
- W3 P0 mutation release: durable runtime-integrated adapter, atomic op/outbox, independent-process race/restart/kill-after-effect recovery and tenant authorization remain unproven. Reference Maps are not durable evidence.

Published evidence: PR14 comment5850623326; PR15 comment5850642127; PR8 comment5850636565; Issue10 comment5850635726.
Issue10 remains open. PR9 is not approved; W3 can continue foundation and fixes. W2 is not blocked for W1 ownership issues.

## Fixed / superseded findings

W3 framework confirmations, in-process 20-way reservation, reconciliation lease behavior, bounded outages, bare Bearer/AWS output variants fixed.
W2 route IDs, telemetry projection, runtime parsing/impossible dates in transport adapters, identity correlation and stale stream fencing fixed.
W1 helpers now require active workspace in reviewed source. End-to-end onboarding/suspension validation blocked by SQL error; do not repeat old helper finding as current.
Old PR11/history findings are historical, not a diagnosis of reconstructed PR14. Independent full-history scanning of new candidate still required; no clean-history acceptance claimed.

## W4 independent implementation

Existing CI, secret scan, dependency/migration policies, staging/restore validators and tenant/assistant matrices preserved.
Added disposable real PostgreSQL runner and pinned lockfile, branch-specific adversarial reproduction artifacts.
Fixed evidence-validator null/primitive crashes and rejection of negative assistant effect counts; negative controls added.
Machine-readable release state: .security/release-gates.json.
Production untouched. Staging unprovisioned. No main/merge/deploy/settings/DNS/remote DB operation.
No restore exercise claimed. Project sync is optional and currently unverified; GitHub holds handoffs.

## Next safe work

Rerun SQL after W1 fixes; native isolated PostgreSQL integration and database process races when available.
Integrate reviewed controls only after accepted base. Complete history scan, safe harness expansion and infra design.
Refetch after each block and review deltas. Human approval remains required for production/critical permissions.
