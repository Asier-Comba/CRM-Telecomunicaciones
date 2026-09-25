# W4 — Security, QA, DevOps and release status

Last verified: 2026-09-25 (UTC)

## Scope and repository boundary

- Development repository: `Asier-Comba/CRM-Telecomunicaciones` only.
- Working branch: `w4/security-baseline`; it is preserved and must not be promoted directly to `main`.
- Historical repository `iazticontact/crm-inmobiliario-demo` is read-only. No W4 changes, workflows, deployments or configuration actions are permitted there.
- No `TODO` file is currently present in the development repository.

## Current repository state

- The repository still has no canonical application base, `main`, `package.json`, `app/`, Supabase schema or product migrations.
- No W1, W2 or W3 branches or pull requests were visible at the last fetch.
- `docs/master/agents/W1_STATUS.md`, `W2_STATUS.md` and `W3_STATUS.md` do not yet exist. This is an absence of coordination evidence, not a claim that those works have done nothing.
- The Project chats confirm that W1 must first reconstruct the real Supabase schema and publish a reproducible base; W2 and W3 are intentionally blocked from inventing tenant entities or mutating production.
- The local and remote copies of the W4 baseline had identical trees but unrelated Git histories. Both histories were preserved in merge commit `4bd2ecb`; no product code or baseline content changed during that reconciliation.

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
| P1 | Four Dependabot PRs upgrade Actions runtimes; three are stale against the current baseline | Old action runtimes can stop receiving runner support; merging stale PRs can regress baseline changes | CI | Integrate verified pinned SHAs on W4 branch and let Dependabot rebase/close superseded PRs | CI self-tests pass; every action is SHA-pinned; no stale PR is merged manually |
| P2 | W1/W2/W3 status files are absent | Security review may discover contracts late | Coordination | Each work publishes its status before its first product PR | Status files identify branch/PR, contracts, blockers and security-sensitive changes |

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
