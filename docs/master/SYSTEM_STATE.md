# CRM Telecom — system state

Verified: 2026-09-26 UTC

| Area | Current state | Release consequence |
|---|---|---|
| Accepted base | None | No `main`, integration, staging deploy or production release |
| W1 | `w1/bootstrap-sanitized@75c2103`, PR #13 rejected | P0: reachable historical values, schema drift, auth/onboarding mismatch, live RLS evidence absent |
| W2 | `w2/frontend-bootstrap-readiness@9f2ab64`, PR #8 draft | READ/presentation work may continue; runtime transport waits for W1; route-ID grammar is required before integration |
| W3 | `w3/assistant-runtime-foundation@874259e`, PR #9 draft | Framework reconciliation/outage findings fixed; P0 reduced to durable cross-process stores/recovery and accepted-base integration |
| W4 | `w4/security-baseline@10ee3aa` plus current work | Audit trail only; must be transported onto an accepted W1 base |
| Staging | Not provisioned | No staging evidence or release candidate |
| Production | Untouched | No deploy, DNS, data, secrets or infrastructure mutation |

## Open release gates

- **P0:** accepted canonical application/schema/auth/RLS base does not exist.
- **P0:** assistant mutations lack durable atomic stores, restart/cross-process evidence and authorized reconciliation.
- **P0:** production release is impossible until upstream integration and staging gates pass.
- **P1:** W3 output value scanning misses additional credential variants.
- **P1:** W2 route descriptor IDs need a safe shared grammar or mandatory encoded builders.
- **P1:** Dependency Review action is still skipped; Dependency Graph/repository variable are not enabled.
- **P1:** isolated staging and a successful non-production restore exercise do not exist.

Machine-readable gate state: `.security/release-gates.json`.
