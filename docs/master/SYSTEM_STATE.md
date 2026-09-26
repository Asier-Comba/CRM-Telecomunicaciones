# CRM Telecom — system state

Verified: 2026-09-26 UTC

| Area | Verified head/state | Release consequence |
|---|---|---|
| Accepted base | None | No `main`, integration base, staging deploy or production release |
| W1 | `w1/bootstrap-canonical@61848cf`, PR #11 draft/changes requested | Real Next.js app and first identity migration exist; P0 secret history, suspended-workspace authorization, schema/app drift and incomplete schema remain |
| W2 | `w2/frontend-bootstrap-readiness@43ce9b5`, PR #8 draft | READ/presentation contracts may continue; route-ID gap is fixed; telemetry projection/version hardening is P1 and runtime transport waits for accepted W1 |
| W3 | `w3/assistant-runtime-foundation@874259e`, PR #9 draft/changes requested | Framework reconciliation/outage findings are fixed; mutation release still lacks durable cross-process stores, recovery and accepted-base integration |
| W4 | `w4/security-baseline@106848a` plus pending tenant-harness commit | Audit trail only; preserve it and later transport reviewed controls onto the accepted W1 base |
| Staging | Not provisioned | No isolated environment or staging acceptance evidence |
| Production | Untouched | No deploy, DNS, data, secrets or infrastructure mutation |

## Open P0/P1

- **P0:** no accepted canonical application/schema/auth/RLS base; PR #11 Secret Scan fails.
- **P0:** suspended `workspaces` remain authorized when membership is active.
- **P0:** 32 relations/views and two RPCs remain missing from canonical migrations; onboarding/routes disagree with the identity schema.
- **P0:** assistant mutations lack durable atomic stores, crash/restart evidence, scoped service principals and authorized reconciliation.
- **P1:** W2 telemetry returns caller-owned mutable input and leaves `contractVersion` unbounded.
- **P1:** W3 output-value defense misses bare Bearer and AWS credential-assignment variants.
- **P1:** Dependency Review is configured but action-skipped until repository Dependency Graph is enabled.
- **P1:** isolated staging and a successful non-production restore exercise do not exist.

Machine-readable release state: `.security/release-gates.json`.
