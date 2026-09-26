# W4 — Security, QA, DevOps and release status

Last verified: 2026-09-26 (UTC)

## Scope and repository boundary

- Development repository: `Asier-Comba/CRM-Telecomunicaciones` only.
- Working branch: `w4/security-baseline`; it is preserved and must not be promoted directly to `main`.
- Historical repository `iazticontact/crm-inmobiliario-demo` is read-only. No W4 changes, workflows, deployments or configuration actions are permitted there.
- No `TODO` file is currently present in the development repository.

## Current repository state

- `w1/bootstrap-sanitized@75c2103` is the newest W1 candidate in draft PR `#13`; the prior `w1/bootstrap-canonical@61848cf` and draft PR `#11` remain superseded-but-open until W1 completes a safe replacement flow. PR #13 CI run `#50` is green but W4 requested changes.
- A clean worktree at the new candidate passes install, lint (three warnings), typecheck, 12 tests, production build and dependency audit. Team routes now use an active-membership resolver and telecom v0 read contracts exist.
- W1 is not yet sanitized or canonical: the three exact historical webhook-secret values remain in the current tree/reachable history, 32 relations/views and two RPCs remain missing, onboarding and many active routes still disagree with the identity schema, and RLS has only static regex evidence. The latest route registry also makes review/auth/side-effect/production claims that contradict source.
- W2 head `d1df763` remains documentation/fixtures only and now adds Customer 360/dashboard UI-state acceptance fixtures; draft PR `#8` makes no runtime or data changes. CI run `#43` is green.
- W3 head `a57641a` adds status documentation over code checkpoint `190a615`, which fixes the original framework-core confirmation and atomic-reservation exploits; CI run `#56` is green. Draft PR `#9` remains blocked by W4 `CHANGES_REQUESTED` because durable stores, crash/reconciliation behavior and source-value redaction still do not satisfy Issue `#10`. The Dependency Review job was green but its actual review step was skipped.
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
- Executable sensitive-route registry gate v2 with negative controls. It identifies 24 routes at W1 `61848cf` and 22 in the sanitized branch; v2 cross-checks review refs, global agent secrets, writes, runtime production denies and auth/signature claims instead of trusting manifest labels.
- Explicit W2 frontend security answers covering protected navigation, membership invalidation, browser telemetry, PII/copy policy, assistant READ rendering and minimum QA evidence.
- Machine-validated restore evidence with negative controls for production targets, RPO/RTO arithmetic, asset completeness, tenant tests, integration disablement, reviewer separation and secret-bearing fields.
- Executable observability safety policy and source scanner with negative controls for environment dumps, auth/cookie headers, body/payload logging, raw AI content and imported rows.

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
| P0 | W3 core now defines atomic stores, but no durable adapter proves consume/reserve across processes or restart; post-effect completion failure remains pending indefinitely | Production retries can become permanently stuck and recovery/reconciliation is undefined | Assistant mutations | Implement durable atomic confirmation/idempotency plus outbox/reconciliation semantics on the accepted W1 base | Store-failure, crash/restart, replay and concurrency suite passes across processes with one effect |
| P1 | W3 closed output schemas reject unknown credential keys, but secret-looking material inside an allowed string still passes | Provider credentials or sensitive text can cross a structurally valid projection | Assistant output | Redact/project at source and add high-confidence value scanning as defense in depth | Credential variants in keys and values fail; safe bounded business text remains accepted |
| P1 | Confirmation cancellation store failure currently escapes the runtime boundary | Store outages can produce unsafe/unbounded API errors and incomplete audit evidence | Assistant reliability | Catch store failures and return a stable retryable safe result with audit reason | Cancellation outage test emits no raw error and records a bounded failure |
| P1 | PR `#8` proved Dependency Review unsupported because repository Dependency Graph is disabled; W4 lacks admin permission | Enforcing the unavailable action would block every PR, while skipping it permanently would lose dependency-diff protection | GitHub security settings/CI | Owner enables Dependency Graph and sets repository variable `DEPENDENCY_REVIEW_ENABLED=true`; npm audit remains enforced meanwhile for Node projects | Dependency Review executes on a test PR and rejects a high-severity introduced dependency |
| P1 | One legacy `SECURITY DEFINER` migration lacks an empty `search_path` | Verbatim promotion could introduce object-shadowing privilege escalation | Migration reconstruction | Recreate and test the function rather than copying legacy SQL | Static check plus invocation/authorization tests pass |

Resolved baseline work: the four Actions upgrades were integrated with verified immutable SHAs, checkout credentials were disabled, baseline self-tests passed and superseded Dependabot branches were removed automatically. At W3 `190a615`, the original caller-fabricated confirmation and in-process double-execution findings are closed in the framework core; production acceptance remains blocked by the durable integration items above.

W4 push CI run `#60` is green at `4b8d716`, including the new observability source-safety gate, sensitive-route registry v2, restore-evidence controls, Supabase checks, migration policy, secret scan and baseline gates. The observability scanner also passed a read-only audit of all 265 production source files and 177 log calls in W1 `75c2103`. No restore exercise is claimed yet. On 2026-09-26, a fresh fetch confirmed no newer W1/W2/W3 heads.

Resolved W1 finding: `W1-QA-001` (clean checkout missing `supabase/migrations`) is fixed at `61848cf`; W4 reproduced the complete non-strict quality gate from a disposable worktree.

## Latest cross-work review

- **W1:** candidate `75c2103` in draft PR `#13` improves team membership authorization, protects n8n status/test, removes the n8n URL response, adds selected rate limits and passes CI `#50`. It remains blocked: the supposedly sanitized tree retains the exact historical values; strict drift is unchanged; onboarding/current-user and many routes still use removed or non-authoritative profile/workspace fields; registry v1 passes contradictory source claims; RLS is unexecuted. W4 submitted `CHANGES_REQUESTED`; evidence is in the W1 handoff and Issue `#12`.
- **W2:** draft PR `#8` remains documentation/bootstrap only and preserves server-side authorization as the boundary. Head `d1df763` adds synthetic UI-state acceptance fixtures; it keeps mutation UI disabled, rejects arbitrary model URLs and browser workspace authority, and still waits for W1 acceptance. CI run `#43` is green. W4 found no new blocker and answered all 15 requested frontend gates in `docs/master/HANDOFF_W2_SECURITY.md`.
- **W3:** code checkpoint `190a615` fixes server confirmation issuance/one-time consumption, atomic pre-effect reservation, deterministic resource authorization and closed outputs; head `a57641a` is documentation-only. CI `#56` and all 27 branch tests are green, but Dependency Review itself was skipped. W4's 31-test adversarial variant confirms one effect under 20 valid confirmation races, but also reproduces stuck post-effect completion, uncaught cancel-store failure and secret material inside allowed strings. PR `#9` remains `CHANGES_REQUESTED` until durable W1-backed adapters and the complete Issue `#10` suite exist.

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
