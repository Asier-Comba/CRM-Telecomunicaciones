# W4 — Security, QA, DevOps and release status

Last verified: 2026-09-25 (UTC)

## Scope and repository boundary

- Development repository: `Asier-Comba/CRM-Telecomunicaciones` only.
- Working branch: `w4/security-baseline`; it is preserved and must not be promoted directly to `main`.
- Historical repository `iazticontact/crm-inmobiliario-demo` is read-only. No W4 changes, workflows, deployments or configuration actions are permitted there.
- No `TODO` file is currently present in the development repository.

## Current repository state

- `w1/bootstrap-sanitized@4936a08` is the newest W1 candidate; the prior `w1/bootstrap-canonical@61848cf` and draft PR `#11` remain superseded-but-open until W1 completes a safe replacement flow.
- A clean worktree at the new candidate passes install, lint (three warnings), typecheck, 12 tests, production build and dependency audit. Team routes now use an active-membership resolver and telecom v0 read contracts exist.
- W1 is not yet sanitized or canonical: the three exact historical webhook-secret values remain in the current tree/reachable history, 32 relations/views and two RPCs remain missing, onboarding and many active routes still disagree with the identity schema, and RLS has only static regex evidence.
- W2 head `d1df763` remains documentation/fixtures only and now adds Customer 360/dashboard UI-state acceptance fixtures; draft PR `#8` makes no runtime or data changes. CI run `#43` is green.
- W3 head `7be1e8f` adds eval metrics without changing the vulnerable runtime/contracts; draft PR `#9` remains blocked by W4 `CHANGES_REQUESTED` plus Issue `#10`.
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
- Executable sensitive-route registry gate with negative controls. It identifies 24 routes at W1 `61848cf` and 22 at candidate `4936a08` requiring explicit auth, tenant, rate-limit, production and side-effect review.
- Explicit W2 frontend security answers covering protected navigation, membership invalidation, browser telemetry, PII/copy policy, assistant READ rendering and minimum QA evidence.
- Machine-validated restore evidence with negative controls for production targets, RPO/RTO arithmetic, asset completeness, tenant tests, integration disablement, reviewer separation and secret-bearing fields.

## Findings and gates

| Severity | Evidence | Risk | Affected component | Required fix | Acceptance criteria |
|---|---|---|---|---|---|
| P0 | W1 has one canonical identity migration, but strict audit still reports 32 missing relations/views and two missing RPCs | Auth, full RLS, grants and clean database recovery are not reproducible | Database/release | W1 completes and tests the canonical migration chain | Zero-to-head migration and strict drift audit pass; W4 RLS/tenant matrix is green |
| P0 | PR `#11` CI run `#31` fails Secret Scan; candidate `4936a08` retains the identical legacy-document blob and all three exact values in its current tree/history | Public Git history retains credentials and the branch's clean-triage claim is false | Secrets/repository history | Replace values, rebuild/purge reachable history and retain rotation proof out-of-band | Full-history scan passes and no reachable candidate commit contains the values |
| P0 | Canonical migration removes `profiles.role`, but active routes still read/write it; onboarding writes absent `plan`/`role` columns and omits required `slug` | Core onboarding/team flows fail and declared membership authorization is not implemented in the app | Schema/API authorization | Align queries and use one active-membership resolver; provision atomically | Clean-DB onboarding and team tests pass; role/removal/switch tests fail closed; no active `profiles.role` use |
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

W4 push CI run `#46` is green at `4b957bd`, including the sensitive-route negative controls, Supabase checks, migration policy, secret scan and baseline gates. The restore-evidence gate added after that checkpoint passes locally; no restore exercise is claimed yet.

Resolved W1 finding: `W1-QA-001` (clean checkout missing `supabase/migrations`) is fixed at `61848cf`; W4 reproduced the complete non-strict quality gate from a disposable worktree.

## Latest cross-work review

- **W1:** candidate `4936a08` improves team membership authorization and passes the non-strict clean-checkout quality gate. It remains blocked: the supposedly sanitized tree retains the exact historical values; strict drift is unchanged; onboarding/current-user and many routes still use removed or non-authoritative profile/workspace fields; 22 sensitive routes are unregistered; RLS is unexecuted. Evidence and criteria are in `docs/master/HANDOFF_W1_SECURITY.md`, `docs/master/ENDPOINT_SECURITY_REVIEW.md` and Issue `#12`.
- **W2:** draft PR `#8` remains documentation/bootstrap only and preserves server-side authorization as the boundary. Head `d1df763` adds synthetic UI-state acceptance fixtures; it keeps mutation UI disabled, rejects arbitrary model URLs and browser workspace authority, and still waits for W1 acceptance. CI run `#43` is green. W4 found no new blocker and answered all 15 requested frontend gates in `docs/master/HANDOFF_W2_SECURITY.md`.
- **W3:** head `7be1e8f` adds eval metrics only; the runtime and contract Git blobs are identical to `9ef926b`. The prior attack remains valid: an invented confirmation succeeded and one key across 20 concurrent requests produced 20 successes/handler executions. Draft PR `#9` retains W4 `CHANGES_REQUESTED`; no CI run exists for the newest head yet. Exact criteria remain in `docs/master/HANDOFF_W3_SECURITY.md` and Issue `#10`.

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
