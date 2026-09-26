# W4 — Security, QA, DevOps and release status

Last verified: 2026-09-26 (UTC)

## Scope and repository boundary

- Development repository: `Asier-Comba/CRM-Telecomunicaciones` only.
- Working branch: `w4/security-baseline`; it is preserved and must not be promoted directly to `main`.
- Historical repository `iazticontact/crm-inmobiliario-demo` is read-only. No W4 changes, workflows, deployments or configuration actions are permitted there.
- No `TODO` file is currently present in the development repository.

## Current repository state

- `w1/bootstrap-canonical@61848cf` is the current remote W1 head in draft PR `#11`. It is a real Next.js application with a first tenant-identity migration, but CI run `#31` fails Secret Scan and W4 still requests changes.
- A clean worktree at `61848cf` passes install, lint (three warnings), typecheck, seven tests, production build and dependency audit.
- W1 is not yet sanitized or canonical: the three exact historical webhook-secret values remain in the current tree/reachable history, 32 relations/views and two RPCs remain missing, onboarding and many active routes still disagree with the identity schema, and RLS has only static regex evidence. The latest route registry also makes review/auth/side-effect/production claims that contradict source.
- W2 head `0dcbdd6` remains transport-neutral documentation/contracts. Its latest delta is status-only after `7937cbb`: route IDs and telemetry projection/version hardening are fixed and 51/51 official tests pass. Dashboard/Customer transport adapters protect PII and unknown semantics, but malformed runtime JSON can throw and impossible dates normalize; PR `#8` may continue while W2 fixes this P1.
- W3 head `874259e` fixes the remaining framework reconciliation and outage findings: lease expiry requires reconciliation without automatic re-execution, cancellation/audit outages are bounded, and source projection plus value scanning exists. CI #67 and 37/37 branch tests pass; W4's five added attacks produced 42/42 total. PR `#9` remains blocked only for durable cross-process/restart evidence, authorized reconciliation and remaining credential-value variants. Dependency Review is still action-skipped.
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
- Executable sensitive-route registry gate v2 with negative controls. It identified 24 routes at W1 `61848cf`; v2 cross-checks review refs, global agent secrets, writes, runtime production denies and auth/signature claims instead of trusting manifest labels.
- Explicit W2 frontend security answers covering protected navigation, membership invalidation, browser telemetry, PII/copy policy, assistant READ rendering and minimum QA evidence.
- Machine-validated restore evidence with negative controls for production targets, RPO/RTO arithmetic, asset completeness, tenant tests, integration disablement, reviewer separation and secret-bearing fields.
- Executable observability safety policy and source scanner with negative controls for environment dumps, auth/cookie headers, body/payload logging, raw AI content and imported rows.
- Concise `SYSTEM_STATE.md` plus a machine-validated release-gate manifest that prevents a ready decision while dependencies or P0 evidence remain open.
- Lightweight documentation-contract test runner so W2/W3 transport-neutral TypeScript tests execute even before a product `package.json` exists.
- Executable 22-case tenant-isolation harness spanning anonymous, A/B, removed, suspended, multi-workspace, service-principal and role scenarios, with six mutation-style negative controls.
- Executable 18-case assistant-security adapter contract covering confirmations, tenant scope, 20-way races, replay, restart/reconciliation, store/audit outages, secret outputs and arbitrary SQL/URL targets, with eight mutation-style negative controls.
- Machine-validated staging-candidate evidence requiring an immutable artifact, synthetic data, separate Supabase/Storage/n8n/OAuth resources, a non-shared managed secret boundary, production-deny guards and nine smoke/security checks. Impossible calendar dates are rejected in staging and restore evidence.
- Restore evidence now also proves encrypted backups, separate failure domain, retention/access review and a disposable production-denied/network-denied target with scoped destructive commands.
- A value-redacted Hostinger/VPS/n8n read-only inventory procedure is ready for the later human login; it includes explicit no-mutation and secret/PII stop conditions.

## Findings and gates

| Severity | Evidence | Risk | Affected component | Required fix | Acceptance criteria |
|---|---|---|---|---|---|
| P0 | W1 has one canonical identity migration, but strict audit still reports 32 missing relations/views and two missing RPCs | Auth, full RLS, grants and clean database recovery are not reproducible | Database/release | W1 completes and tests the canonical migration chain | Zero-to-head migration and strict drift audit pass; W4 RLS/tenant matrix is green |
| P0 | PR `#11` CI run `#31` fails Secret Scan; candidate `4936a08` retains the identical legacy-document blob and all three exact values in its current tree/history | Public Git history retains credentials and the branch's clean-triage claim is false | Secrets/repository history | Replace values, rebuild/purge reachable history and retain rotation proof out-of-band | Full-history scan passes and no reachable candidate commit contains the values |
| P0 | Canonical migration removes `profiles.role`, but active routes still read/write it; onboarding writes absent `plan`/`role` columns and omits required `slug` | Core onboarding/team flows fail and declared membership authorization is not implemented in the app | Schema/API authorization | Align queries and use one active-membership resolver; provision atomically | Clean-DB onboarding and team tests pass; role/removal/switch tests fail closed; no active `profiles.role` use |
| P0 | Service-role agent routes use one global secret and trust caller-supplied `workspace_id` | One leaked/misused credential crosses every tenant while bypassing RLS | Agent/n8n APIs | Use scoped service principals and derive authorized workspaces server-side | A-scoped credential cannot access or affect B under read, write, replay or concurrency attacks |
| P0 | Existing `/api/assistant/confirm` executes caller-supplied actions without server-issued one-time proof or atomic idempotency | Authenticated clients can fabricate, replay or race assistant mutations | Assistant API | Integrate W3 only after Issue `#10` is satisfied | Exact confirmation, idempotency, output-schema and cross-workspace suite passes |
| P0 | Privileged routes use `profiles.role` while `workspace_members.role` is also the documented tenant role | Stale/disagreeing roles can create tenant privilege escalation | Authorization | Adopt one membership-backed workspace authorization resolver | Role disagreement, removal and workspace-switch tests fail closed |
| P0 | Current permissions do not include repository administration | Required-PR and required-check rules cannot yet be enforced | GitHub governance | Repository owner enables a ruleset after the canonical `main` exists | Direct pushes to `main` blocked; review plus required W4 checks enforced; admin bypass audited |
| P1 | The reconstructed app has no executable cross-tenant schema/API/storage test matrix | Cross-tenant isolation is unproven despite explicit filters in several routes | Data/API/storage | W1 publishes schema and W4 binds the adversarial plan to real fixtures | Workspace A cannot list/read/create/update/delete B data through DB, API, storage, imports or assistant tools |
| P1 | Staging, backup jobs and a completed restore test do not yet exist | Recovery and safe release claims are unverified | Platform/DR | Provision isolated staging and run a documented non-production restore exercise | Evidence records scope, timestamp, RPO/RTO result and recovery owner without secrets |
| P0 | W3 framework reconciliation now fails closed, but only in-memory stores exist and recovery is performed by directly completing a test reservation | Atomic consume/reserve, restart behavior and authorized reconciliation remain unproven across processes | Assistant mutations | Implement durable confirmation/idempotency stores plus outbox/reconciliation on the accepted W1 base | Cross-process race, crash/restart, store outage and authorized reconciliation tests pass with one effect |
| P1 | W3 rejects labelled secret values, but W4 reproduced bare `Bearer` and `AWS_SECRET_ACCESS_KEY` material inside an allowed string | Credential variants can cross a valid DTO if source projection regresses | Assistant output | Keep explicit source projection and extend high-confidence value fixtures/patterns | Known credential variants fail; bounded safe business text remains accepted |
| P0 | W1 membership helpers ignore `workspaces.status`; W4's suspended-workspace adversarial assertion fails against all five helpers | Suspending an enterprise does not revoke tenant access while its memberships remain active | Tenant identity/RLS | Require active workspace and active membership in every helper/policy path | Database-backed suspended A / active B tests prove A denied and B unaffected |
| P1 | W2 Dashboard/Customer adapters dereference typed inputs before a runtime schema and accept normalized impossible dates | Malformed upstream JSON can throw; false deadlines can be presented | Frontend transport | Parse `unknown` through a shared closed schema and strictly validate calendar dates | Null/array/missing/extra/wrong-type/unknown-state inputs never throw; impossible dates reject |
| P1 | PR `#8` proved Dependency Review unsupported because repository Dependency Graph is disabled; W4 lacks admin permission | Enforcing the unavailable action would block every PR, while skipping it permanently would lose dependency-diff protection | GitHub security settings/CI | Owner enables Dependency Graph and sets repository variable `DEPENDENCY_REVIEW_ENABLED=true`; npm audit remains enforced meanwhile for Node projects | Dependency Review executes on a test PR and rejects a high-severity introduced dependency |
| P1 | One legacy `SECURITY DEFINER` migration lacks an empty `search_path` | Verbatim promotion could introduce object-shadowing privilege escalation | Migration reconstruction | Recreate and test the function rather than copying legacy SQL | Static check plus invocation/authorization tests pass |

Resolved baseline work: the four Actions upgrades were integrated with verified immutable SHAs, checkout credentials were disabled, baseline self-tests passed and superseded Dependabot branches were removed automatically. At W3 `190a615`, the original caller-fabricated confirmation and in-process double-execution findings are closed in the framework core; production acceptance remains blocked by the durable integration items above.

W4 push CI run `#88` is green at `fe6060f`: baseline guardrails, both security harnesses, staging/restore evidence validators, observability, Supabase/migration policy and full-history secret scan pass. Dependency Review and Playwright are visibly skipped for their documented prerequisites. The observability scanner also passed a prior read-only audit of all 265 production source files and 177 log calls in W1 `75c2103`. No staging deployment or restore exercise is claimed yet.

Resolved W1 finding: `W1-QA-001` (clean checkout missing `supabase/migrations`) is fixed at `61848cf`; W4 reproduced the complete non-strict quality gate from a disposable worktree.

## Latest cross-work review

- **W1:** draft PR `#11` at `61848cf` passes local install/lint/typecheck/7 tests/build/audit, but CI run `#31` fails Secret Scan. The first identity migration ignores workspace suspension in every authorization helper; a disposable W4 adversarial test reproduces the gap. Schema/application drift, 32 missing relations/views, two RPCs and static-only RLS evidence remain. W4 submitted a new reduced `CHANGES_REQUESTED` delta review.
- **W2:** draft PR `#8` at `0dcbdd6` remains transport-neutral; the code head remains `7937cbb`. Route IDs and telemetry projection/version findings are fixed and all 51 official tests pass. Dashboard/Customer adapters safely hide PII and unknown semantics; W4 reproduced malformed-JSON throws and impossible-date normalization as the remaining non-blocking P1. Runtime still waits for an accepted W1 base.
- **W3:** head `874259e` passes CI #67 and 37/37 branch tests. W4's 42-test variant accepts lease/reconciliation, exact-expiry fail-closed behavior, cancellation/audit outage bounds, cross-actor/workspace and both 20-way races as fixed. Remaining Issue #10 P0 is durable cross-process/restart storage and authorized reconciliation; output defense retains a P1 gap for bare bearer/AWS credential assignments. A new reduced `CHANGES_REQUESTED` review and Issue #10 evidence are published.

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
