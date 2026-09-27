# W4 iteration4.2 — current independent decisions

Verified2026-09-27 UTC. GitHub is the cross-Work control plane; no private coordination or Project dependency. W2 now owns Backend/Data while W1 runtime is unavailable. W4 remains reviewer/harness owner, not product-defect implementer.

ACCEPTED INTEGRATION BASE: 6b0e30e7444de57100e4d983b3564a0c3b336b2c

CAN_INTEGRATE: YES
CAN_STAGE: NO
CAN_PRODUCE: NO

## Canonical acceptance

Clean detached checkout6b0e30e: reproducible npm install, lint, typecheck,22 bootstrap tests,20-route production build and audit0 vulnerabilities. Forward-only migration policy and4-file Supabase security scan pass. CI148 full-history Secret scan job108636874760 succeeded; no local scanner claim. Old rejected history/archive/blob-prefix not reachable in scoped local check.

Four migrations apply byte-for-byte in PGlite0.5.8/PostgreSQL18.3 with synthetic auth.users/auth.uid. W1 six-case DB runner passes. Independent W4 runner passes first/retry, suspended tenant, A/B denial, suspendedA/activeB multi-membership, removed membership with stale profile, slug conflict, forced profile-stage failure with full workspace/member rollback, unchanged preexisting auth profile and anonymous rejection.42702 no longer reproduces. Earlier W4 fixture incorrectly expected auth-created profile absence; corrected to existing profile with null workspace, matching actual auth trigger. No false product defect reported from that fixture mistake.

Publication: PR14 comment5856967604; Issue12 comment5856968387. Issue12 current scope now platform/staging; historical report preserved. No main/merge authorization. Missing domain features and production infrastructure do not block this exact safe composition base.

## Domain / W2 takeover

PR15 remains e65f1e802fbcb63f9a1636689b85eb2aa135c592. Original W1 refs and W2 frontend db8ab41 preserved; no new backend branch/PR observed in refreshed refs/open PRs at checkpoint. New branch must start/replay from accepted6b0e30e; never force-push originals. Review ancestry and contamination when actually published.

Official domain SQL still fails42703 NEW.service_kind; candidate-only nested table guards previously reached second NEW.created_by_user_id failure and then full suite passed after both guards. Those candidate edits are disposable evidence, not shipped fixes.

READ/date acceptance suite now asserts secure behavior:14 tests,3 pass/11 fail. Five invalid calendar dates reach repository; valid2024-02-29 passes. Nested foreign scope, extra private field, malformed DTO,101-item collection, wrong capability and raw repository detail fail expected rejection. Wrong outer epoch rejects correctly. No live adapter/data leak claimed. PR15 comment5857009396 contains exact matrix.

Privileged completed import INSERT with99 counters/no ledger remains a reproduced integrity failure, not browser access. Expanded initialization fixture is a secure expectation gate; full lifecycle/resume/finalization/cross-workspace suite must run against W2 forward fixes. Do not accept from static regex or a patched disposable snapshot.
Expanded initialization result: valid uploaded, terminal-without-timestamp rejection and timestamp-without-terminal rejection pass; nonzero counters, applied-without-staging and fully fabricated finalization fail. Six cases, three secure expectations unmet.

## W3 candidate

489eed266d59f0b7df28e6f560ee527ea9fe69e7 clean install/lint/types/build/audit0 vulnerabilities;384 official tests.12 independent W4 cases produce396 total pass: malformed capability result variants reject before transition, foreign stored workspace/wrong capability/no schema reject, valid result succeeds. Capability-specific schema P1 fixed in candidate core.

Original transition audit loss STILL reproduced: transition→audit outage→retry conflict; original event missing. Atomic Map/reference candidate is an interface/simulation, not durable repair. Issue10 stays open; no mutation enablement. Opaque ID ownership still requires independently authorized verifier/DB integration. PR9 comment5856989919; Issue10 comment5856991194.

## Evidence levels and remaining work

PGlite execution is real embedded SQL, one process with synthetic claims. Native multiprocess PostgreSQL, Supabase local, remote Supabase, Auth JWT, PostgREST and Storage evidence are separately pending. Native durability suite must bind W2's actual adapter and measure independent backend connections/processes,20-way races,restarts,leases,kill-after-effect,outbox,audit outages,reconciliation,cross-actor/workspace denial. Shared Maps cannot satisfy it.

Portability signals and synthetic seed limitations: W4_PORTABILITY_AUDIT.md. W4 baseline remains5cb872c; current work stays on w4/night-shift-v3/PR16. Production untouched.
Prepared native durability case/report contract and negative controls in W4_NATIVE_DURABILITY_SUITE.md. Its synthetic report self-test is explicitly not a native database run; no adapter exists yet to bind. Cross-Work communication remains exclusively GitHub.
