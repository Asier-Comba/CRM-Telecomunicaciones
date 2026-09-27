# CRM Telecom — system state

VERIFIED UTC: 2026-09-27; exact reviewed heads below

CAN_INTEGRATE: YES
CAN_STAGE: NO
CAN_PRODUCE: NO

INTEGRATION BASE SHA: 6b0e30e7444de57100e4d983b3564a0c3b336b2c
W2 BACKEND HEAD: 4fb8619a439e9936c59af8e0673442ede21a8a07 (PR17; shared triggers FIXED, import/READ fixes pending)
W3 HEAD: fd45ef81898f870d6ded5bedf705a98a50461f19 (atomic runtime seam reviewed; native adapter pending)
W4 HEAD: 840ce6d19bdc0f90dc2513b43a1df4fad10e858f (prior published checkpoint; this file travels with the current W4 commit)

CRITICAL: no current canonical composition P0; assistant mutation release remains blocked by durable adapter/audit/recovery evidence (Issue10).
HIGH / CURRENT P1: PR17 import initialization and READ DTO/calendar boundary; W2 sensitive expiry/revocation; W3 durable transaction/outbox acceptance pending.
EXTERNAL/HUMAN BLOCKERS: real isolated platform access/config and Auth/PostgREST/Storage tests; scoped service principals; native durable DB adapter; production/infra approval; commercial recovery evidence.

## Acceptance scope

Canonical clean install/lint/types/22 tests/build/audit PASS; four migrations and independent identity A/B/retry/suspension/removal/multi/rollback/anonymous SQL PASS; full-history secret scan CI148 PASS. Previous42702 FIXED.
This permits safe foundation composition. It does not approve all domain/UI/assistant features or main promotion.

W3:393 official+6 independent W4 tests PASS; lint/types/build PASS. Atomic runtime/audit acknowledgment and result authorization seam FIXED. Native persistence/audit survival NOT proven. P2 unknown-scenario oracle FIXED atfd45ef8:2 targeted tests+7 independent invalid IDs and valid control PASS. Full393+6 suite applies toc804acd; final delta targeted. PR15 unchanged:14 READ/date acceptance tests,3 pass/11 fail; official domain SQL still42703.
Native PostgreSQL, Supabase local, remote Supabase, PostgREST, Auth and Storage have NOT been executed. PGlite uses synthetic claims.
W1 originals/W2 frontend/W4 baseline preserved. New w2/backend-takeover-v1 descends from accepted6b0e30e; rejected61848cf/75c2103 are not ancestors. PR17: all11 migrations and official SQL PASS. Four independent positive trigger updates and four cross-workspace rewrite denials PASS. Import initialization3/6 acceptance cases still fail; READ/date unchanged. W4 handoff: PR17 comment5857196083.

Production untouched. Staging unprovisioned. No main, merge, deploy, DNS or remote migration.
Evidence: W4_ITERATION_4_2.md; W4_PORTABILITY_AUDIT.md; .security/release-gates.json (three separate decisions).
