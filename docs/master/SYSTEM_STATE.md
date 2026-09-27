# CRM Telecom — system state

VERIFIED UTC: 2026-09-27T15:03:38Z

CAN_INTEGRATE: YES
CAN_STAGE: NO
CAN_PRODUCE: NO

INTEGRATION BASE SHA: 6b0e30e7444de57100e4d983b3564a0c3b336b2c
W2 BACKEND HEAD: 541c4f48c0c58095a03f2ff2d0abbeb3c36801bd (takeover replay in progress; topology verified, feature acceptance pending)
W3 HEAD: 3c2d736b683114fb8eaa97462507b81e3be31a48 (new atomic persistence seam under review; last completed review489eed2)
W4 HEAD: fa7f889e3880cd54db2afc1c55f9bcc849505891 (prior published checkpoint; this file travels with the current W4 commit)

CRITICAL: no current canonical composition P0; assistant mutation release remains blocked by durable adapter/audit/recovery evidence (Issue10).
HIGH / CURRENT P1: PR15 shared-record trigger, import initialization and READ DTO/calendar boundary; W2 sensitive expiry/revocation; W3 original transition audit loss.
EXTERNAL/HUMAN BLOCKERS: real isolated platform access/config and Auth/PostgREST/Storage tests; scoped service principals; native durable DB adapter; production/infra approval; commercial recovery evidence.

## Acceptance scope

Canonical clean install/lint/types/22 tests/build/audit PASS; four migrations and independent identity A/B/retry/suspension/removal/multi/rollback/anonymous SQL PASS; full-history secret scan CI148 PASS. Previous42702 FIXED.
This permits safe foundation composition. It does not approve all domain/UI/assistant features or main promotion.

W3:384 official+12 W4 tests; capability output-schema defect fixed; audit loss reproduced. PR15 unchanged:14 READ/date acceptance tests,3 pass/11 fail; official domain SQL still42703.
Native PostgreSQL, Supabase local, remote Supabase, PostgREST, Auth and Storage have NOT been executed. PGlite uses synthetic claims.
W1 originals/W2 frontend/W4 baseline preserved. New w2/backend-takeover-v1 descends from accepted6b0e30e; rejected61848cf/75c2103 are not ancestors. No takeover PR observed yet; replay is incomplete at this snapshot.

Production untouched. Staging unprovisioned. No main, merge, deploy, DNS or remote migration.
Evidence: W4_ITERATION_4_2.md; W4_PORTABILITY_AUDIT.md; .security/release-gates.json (three separate decisions).
