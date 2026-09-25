# W4 — Security, QA, DevOps and release status

Last verified: 2026-09-25 (UTC)

## Scope and repository boundary

- Development repository: `Asier-Comba/CRM-Telecomunicaciones` only.
- Working branch: `w4/security-baseline`; it is preserved and must not be promoted directly to `main`.
- Historical repository `iazticontact/crm-inmobiliario-demo` is read-only. No W4 changes, workflows, deployments or configuration actions are permitted there.
- No `TODO` file is currently present in the development repository.

## Current repository state

- `w1/bootstrap-canonical@0dd2f14` now contains a real Next.js application, package contract, CRM modules, historical Supabase evidence, telecom model candidates and `W1_STATUS.md`; it is no longer a placeholder.
- W1 is not yet an accepted canonical release base: a clean checkout fails all three bootstrap tests because the auditor assumes an untracked empty migration directory, and there are still zero canonical migrations.
- W2 published documentation and `W2_STATUS.md` on `w2/frontend-bootstrap-readiness`; draft PR `#8` targets the W4 baseline and makes no runtime or data changes.
- W3 published a TypeScript assistant control-plane foundation, thirteen tests, architecture notes and `W3_STATUS.md` on `w3/assistant-runtime-foundation`; draft PR `#9` targets the W4 baseline and remains blocked by W4 `CHANGES_REQUESTED` plus Issue `#10`.
- There is still no `main`, reproducible Supabase schema, accepted RLS policy set or approved product release base.
- W1, W2 and W3 may continue safely in their own branches. PR `#8` remains documentation-only; PR `#9` may receive fixes but cannot merge until Issue `#10` is fully evidenced.
- The original local and remote W4 copies had identical trees but unrelated histories. The remote baseline is now a clean linear history at `f72e432`; the earlier local history remains under a local safety ref and no baseline content was lost.

## Implemented baseline

- Reproducible Node install contract, lint, typecheck, test and build gate once W1 adds a Node project.
- Full-history secret scan and dependency review.
- Migration filename and immutability policy.
- Production-deny guard for Playwright.
- Executable baseline self-tests, SHA-pinned GitHub Actions and checkout credential persistence disabled.
- Dependabot configuration and PR security checklist.
- Versioned policies for tenant isolation, assistant tools, staging/release, backup/restore and observability.
- Static Supabase migration security checks with negative-control self-tests.
- Versioned cross-tenant adversarial matrix ready to bind to the W1 schema and non-production environment.
- Static endpoint review of the W1 application, including auth, debug/test routes, n8n and service-role trust boundaries.

## Findings and gates

| Severity | Evidence | Risk | Affected component | Required fix | Acceptance criteria |
|---|---|---|---|---|---|
| P0 | W1 contains the real application but no canonical migrations; strict audit reports 35 missing relations/views and two missing RPCs | Auth, RLS, grants and clean database recovery are not reproducible | Database/release | W1 publishes and tests the canonical migration chain | Zero-to-head migration and strict drift audit pass; W4 RLS/tenant matrix is green |
| P0 | Clean checkout of W1 head `0dd2f14` fails all three tests because `supabase/migrations` is absent | Local-only empty directory produced false green status; CI cannot reproduce the claim | QA/bootstrap | Make the auditor tolerate an absent empty directory and rerun the whole gate in a clean clone | Fresh clone passes install, lint policy, typecheck, tests, build and audit without manual preparation |
| P0 | Anonymous `/api/automations/n8n/status` returns internal base URL and `/test` can call an external workflow with server credentials | Reconnaissance, resource exhaustion and external effects without authentication | API/n8n | Remove in production or add admin/internal auth, rate limit, safe output and production deny | Denied requests make zero outbound calls; production cannot run test workflows |
| P0 | Service-role agent routes use one global secret and trust caller-supplied `workspace_id` | One leaked/misused credential crosses every tenant while bypassing RLS | Agent/n8n APIs | Use scoped service principals and derive authorized workspaces server-side | A-scoped credential cannot access or affect B under read, write, replay or concurrency attacks |
| P0 | Existing `/api/assistant/confirm` executes caller-supplied actions without server-issued one-time proof or atomic idempotency | Authenticated clients can fabricate, replay or race assistant mutations | Assistant API | Integrate W3 only after Issue `#10` is satisfied | Exact confirmation, idempotency, output-schema and cross-workspace suite passes |
| P0 | Privileged routes use `profiles.role` while `workspace_members.role` is also the documented tenant role | Stale/disagreeing roles can create tenant privilege escalation | Authorization | Adopt one membership-backed workspace authorization resolver | Role disagreement, removal and workspace-switch tests fail closed |
| P0 | Current permissions do not include repository administration | Required-PR and required-check rules cannot yet be enforced | GitHub governance | Repository owner enables a ruleset after the canonical `main` exists | Direct pushes to `main` blocked; review plus required W4 checks enforced; admin bypass audited |
| P1 | The reconstructed app has no executable cross-tenant schema/API/storage test matrix | Cross-tenant isolation is unproven despite explicit filters in several routes | Data/API/storage | W1 publishes schema and W4 binds the adversarial plan to real fixtures | Workspace A cannot list/read/create/update/delete B data through DB, API, storage, imports or assistant tools |
| P1 | Staging, backup jobs and a completed restore test do not yet exist | Recovery and safe release claims are unverified | Platform/DR | Provision isolated staging and run a documented non-production restore exercise | Evidence records scope, timestamp, RPO/RTO result and recovery owner without secrets |
| P0 | W3 confirmation objects are accepted solely by matching caller-supplied fields; no server issuance proof or one-time lookup exists | A caller can fabricate a valid-looking confirmation and bypass the human confirmation boundary | Assistant mutations | Replace caller-trusted proof with a short-lived, server-issued, one-time confirmation record or authenticated token | Tampered, invented, expired, replayed, cross-actor and cross-workspace confirmations all fail; only a server-issued confirmation succeeds once |
| P0 | Two concurrent W3 requests with the same idempotency key both executed the handler in an adversarial test | Retried/concurrent writes can duplicate external or database effects | Assistant mutations | Atomically reserve the key before execution and bind it to actor/workspace/capability/argument digest | Concurrency test executes the handler once; changed arguments conflict; crash/retry behavior is deterministic |
| P1 | W3 output protection relies on a partial secret-key denylist and capability handlers have no enforced output schema | Sensitive provider fields could reach assistant/UI output under unrecognized names | Assistant output | Validate every capability output against a closed, bounded schema and redact at source | Tests reject extra keys, credentials and oversized/nested output without relying on a small regex list |
| P1 | PR `#8` proved Dependency Review unsupported because repository Dependency Graph is disabled; W4 lacks admin permission | Enforcing the unavailable action would block every PR, while skipping it permanently would lose dependency-diff protection | GitHub security settings/CI | Owner enables Dependency Graph and sets repository variable `DEPENDENCY_REVIEW_ENABLED=true`; npm audit remains enforced meanwhile for Node projects | Dependency Review executes on a test PR and rejects a high-severity introduced dependency |
| P1 | One legacy `SECURITY DEFINER` migration lacks an empty `search_path` | Verbatim promotion could introduce object-shadowing privilege escalation | Migration reconstruction | Recreate and test the function rather than copying legacy SQL | Static check plus invocation/authorization tests pass |

Resolved baseline work: the four Actions upgrades were integrated with verified immutable SHAs, checkout credentials were disabled, baseline self-tests passed and superseded Dependabot branches were removed automatically. W3's current branch passes its own 13-test quality gate, but those tests do not cover Issue `#10`.

## Latest cross-work review

- **W1:** head `0dd2f14` is a genuine application bootstrap imported with provenance, but not yet a canonical schema/release base. Clean-clone QA, migration drift, role ambiguity, unauthenticated n8n test/status routes, caller-created assistant confirmations and global agent-secret tenant scope are release blockers. Evidence and exact acceptance criteria are in `docs/master/HANDOFF_W1_SECURITY.md` and `docs/master/ENDPOINT_SECURITY_REVIEW.md`.
- **W2:** draft PR `#8` remains documentation/bootstrap only and preserves server-side authorization as the boundary. Head `981c591` passed CI run `#27`. Dashboard, Customer 360, UI-foundation and migration specifications were checked for auth, storage, assistant-context and sensitive-log assumptions; no product-security blocker was found. Do not merge it until the W1 base passes canonical review.
- **W3:** head `9ef926b` adds a bounded registered-capability plan validator and passed CI run `#22`; this is compatible with the control-plane direction but does not change the mutation findings. W4's current-head attack used an invented confirmation and one idempotency key across 20 concurrent requests: all 20 returned `SUCCESS` and the handler executed 20 times. Draft PR `#9` retains W4 `CHANGES_REQUESTED`. The exact acceptance suite is versioned in `docs/master/HANDOFF_W3_SECURITY.md` and GitHub issue `#10`.

## Integration plan after W1 closes canonical blockers

1. Re-review W1 from a clean checkout after its QA, migration and authorization fixes.
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
