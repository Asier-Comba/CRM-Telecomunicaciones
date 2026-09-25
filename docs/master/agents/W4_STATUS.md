# W4 — Security, QA, DevOps and release status

Last verified: 2026-09-25 (UTC)

## Scope and repository boundary

- Development repository: `Asier-Comba/CRM-Telecomunicaciones` only.
- Working branch: `w4/security-baseline`; it is preserved and must not be promoted directly to `main`.
- Historical repository `iazticontact/crm-inmobiliario-demo` is read-only. No W4 changes, workflows, deployments or configuration actions are permitted there.
- No `TODO` file is currently present in the development repository.

## Current repository state

- The repository still has no canonical application base, `main`, `package.json`, `app/`, Supabase schema or product migrations.
- `w1/bootstrap-canonical` now exists but still points exactly to W4 commit `f72e432`; it contains no canonical application or W1 status yet.
- W2 published documentation and `W2_STATUS.md` on `w2/frontend-bootstrap-readiness`; draft PR `#8` targets the W4 baseline and makes no runtime or data changes.
- W3 published a TypeScript assistant control-plane foundation, nine tests, architecture notes and `W3_STATUS.md` on `w3/assistant-runtime-foundation`; no W3 PR is visible yet.
- `docs/master/agents/W1_STATUS.md` does not yet exist. This is an absence of coordination evidence, not a claim that W1 has done nothing.
- The Project chats confirm that W1 must first reconstruct the real Supabase schema and publish a reproducible base; W2 and W3 are intentionally blocked from inventing tenant entities or mutating production.
- The original local and remote W4 copies had identical trees but unrelated histories. The remote baseline is now a clean linear history at `f72e432`; the earlier local history remains under a local safety ref and no baseline content was lost.

## Implemented baseline

- Reproducible Node install contract, lint, typecheck, test and build gate once W1 adds a Node project.
- Full-history secret scan and dependency review.
- Migration filename and immutability policy.
- Production-deny guard for Playwright.
- Executable baseline self-tests, SHA-pinned GitHub Actions and checkout credential persistence disabled.
- Dependabot configuration and PR security checklist.
- Versioned policies for tenant isolation, assistant tools, staging/release, backup/restore and observability.

## Findings and gates

| Severity | Evidence | Risk | Affected component | Required fix | Acceptance criteria |
|---|---|---|---|---|---|
| P0 | No canonical application/schema branch or `main` exists | Auth, RLS and migrations cannot be validated; publishing the W4 skeleton as product history would create the wrong base | Repository/release | W1 publishes the reviewed canonical base; W4 reviews it before integration | Base contains the real app and schema provenance; W1 status records drift decision; W4 tenant/RLS review passes |
| P0 | Current permissions do not include repository administration | Required-PR and required-check rules cannot yet be enforced | GitHub governance | Repository owner enables a ruleset after the canonical `main` exists | Direct pushes to `main` blocked; review plus required W4 checks enforced; admin bypass audited |
| P1 | No executable Supabase schema/RLS or server API exists in this repository | Cross-tenant isolation is unproven | Data/API/storage | W1 publishes schema and policies; W4 adds two-workspace adversarial tests | Workspace A cannot list/read/create/update/delete B data through DB, API, storage, imports or assistant tools |
| P1 | Staging, backup jobs and a completed restore test do not yet exist | Recovery and safe release claims are unverified | Platform/DR | Provision isolated staging and run a documented non-production restore exercise | Evidence records scope, timestamp, RPO/RTO result and recovery owner without secrets |
| P0 | W3 confirmation objects are accepted solely by matching caller-supplied fields; no server issuance proof or one-time lookup exists | A caller can fabricate a valid-looking confirmation and bypass the human confirmation boundary | Assistant mutations | Replace caller-trusted proof with a short-lived, server-issued, one-time confirmation record or authenticated token | Tampered, invented, expired, replayed, cross-actor and cross-workspace confirmations all fail; only a server-issued confirmation succeeds once |
| P0 | Two concurrent W3 requests with the same idempotency key both executed the handler in an adversarial test | Retried/concurrent writes can duplicate external or database effects | Assistant mutations | Atomically reserve the key before execution and bind it to actor/workspace/capability/argument digest | Concurrency test executes the handler once; changed arguments conflict; crash/retry behavior is deterministic |
| P1 | W3 output protection relies on a partial secret-key denylist and capability handlers have no enforced output schema | Sensitive provider fields could reach assistant/UI output under unrecognized names | Assistant output | Validate every capability output against a closed, bounded schema and redact at source | Tests reject extra keys, credentials and oversized/nested output without relying on a small regex list |
| P1 | PR `#8` proved Dependency Review unsupported because repository Dependency Graph is disabled; W4 lacks admin permission | Enforcing the unavailable action would block every PR, while skipping it permanently would lose dependency-diff protection | GitHub security settings/CI | Owner enables Dependency Graph and sets repository variable `DEPENDENCY_REVIEW_ENABLED=true`; npm audit remains enforced meanwhile for Node projects | Dependency Review executes on a test PR and rejects a high-severity introduced dependency |
| P2 | W1 status file is absent | Security review may discover schema and auth contracts late | Coordination | W1 publishes its status before the first product PR | Status identifies branch/PR, schema provenance, drift decision, role model and security-sensitive changes |

Resolved this cycle: the four Actions upgrades were integrated with verified immutable SHAs, checkout credentials were disabled, baseline self-tests passed and the superseded Dependabot branches were removed automatically. W3 added the previously missing lint implementation in `e4f168d`; a clean W4 execution of `node-quality-gate.sh` now passes lint, typecheck, nine tests, build and dependency audit.

## Latest cross-work review

- **W1:** branch exists as a coordination placeholder only. W4 remains blocked from schema, RLS, migration and role-model review until W1 publishes real content.
- **W2:** draft PR `#8` is documentation-only, preserves server-side authorization as the boundary and correctly waits for W1 contracts. Its first CI run exposed two baseline defects: runner-aware guardrail output handling and unavailable Dependency Review configuration. W4 fixed both on the base branch; W2 must refresh the PR merge base and obtain a green run. No product-security blocker found; rebase onto the future canonical base remains required.
- **W3:** head `97e64d3` now publishes status/architecture, preserves the baseline ignore policy and passes the current quality gate. The typed registry, closed input schemas, server-context tenant contract, permission check, audit shape and representative eval catalog are useful foundations. Assistant mutations remain a P0 release gate because confirmation and idempotency can currently be bypassed; detailed evidence is in `docs/master/HANDOFF_W3_SECURITY.md` and GitHub issue `#10`.

## Integration plan after W1 publishes the base

1. Fetch and review the W1 base, schema provenance and migration history without changing it.
2. Create a new `w4/security-integration` branch from the accepted canonical base.
3. Apply the W4 baseline as reviewed content commits; do not merge the unrelated skeleton history into product history.
4. Resolve package-manager, scripts, migration-path and Playwright contracts against the real application.
5. Add executable cross-tenant tests and endpoint/service-role checks before requesting merge.
6. Open a PR with quick checks required; run staging smoke, migration dry-run and critical E2E as the heavier release gate.
7. Preserve `w4/security-baseline` as the audit trail until integration is accepted.

## Next W4 reviews

- On W1 schema publication: enumerate tenant-owned tables, RLS enable/force state, policies, security-definer functions, grants, storage policies and role-source ambiguity.
- On W2 publication: verify server-side workspace resolution, protected navigation assumptions, headers and error/PII handling.
- On W3 publication: test forged tenant/resource IDs, prompt injection, tool allowlists, confirmation binding, idempotency, service-role scope and outbound URL restrictions.
- Before infrastructure changes: perform read-only Hostinger/VPS and n8n inventory with human login; production, DNS and irreversible changes require explicit human approval.
