# W1 handoff — schema, roles and RLS

Severity: **P0 release gate**
Evidence: the repository contained no schema or migrations at W4 baseline creation.
Risk: tenant data could be exposed or authorization could diverge between `profiles.role` and `workspace_members.role`.

## Required fix

- Publish the canonical workspace membership and role model in an ADR.
- Decide the lifecycle of `profiles.role`; remove it from authorization or define a narrow global role with no tenant privilege ambiguity.
- Add `workspace_id` and deny-by-default RLS to every tenant-owned relation.
- Audit `SECURITY DEFINER` functions, views, RPCs, triggers and service-role paths.
- Add storage policies and migration ownership/rollback notes.

## Acceptance criteria

- Two-user/two-workspace tests prove denial for select, insert, update and delete across every tenant-owned table.
- Tests cover guessed IDs, changed workspace headers/parameters, removed membership and multi-workspace users.
- Anonymous and ordinary authenticated roles cannot call privileged RPCs.
- New migrations apply cleanly from zero and committed migrations remain immutable.
- Role disagreement fails closed and is covered by a test.

## Review of `w1/bootstrap-canonical`

Reviewed heads: `0dd2f14` and `61848cf` on 2026-09-25.

This is no longer a placeholder. It contains a real Next.js application, `package.json`, CRM modules, Supabase historical evidence, bootstrap provenance, telecom data-model candidates and `W1_STATUS.md`. W1 may continue reconstruction in its branch. It is not yet an acceptable canonical database or release base.

### W1-QA-001 — clean checkout gate

- **Status:** resolved at `61848cf`.
- **Evidence:** in a clean checkout of `0dd2f14`, `npm ci` completed, lint emitted three warnings, typecheck passed, and all three tests failed because `scripts/audit-supabase-reproducibility.mjs` calls `readdir` on the untracked, absent `supabase/migrations` directory. Creating that empty directory only in the disposable audit clone made tests and build pass.
- **Resolution evidence:** a fresh disposable worktree at `61848cf` passed reproducible install, lint with three warnings, typecheck, seven tests, production build and dependency audit without manual directory preparation. The strict schema audit still fails intentionally because the schema is incomplete.

### W1-DATA-001 — no reproducible canonical schema

- **Severity:** P0 release blocker.
- **Evidence:** `61848cf` adds the first canonical tenant-identity migration, which passes W4's static SQL security scanner. The strict audit still reports 32 missing relations/views and two missing RPCs; four assistant relations have no tracked DDL. `npm run audit:supabase-repro:strict` correctly fails.
- **Risk:** auth, tenant isolation, RLS, grants, storage and application startup cannot be recreated or independently verified.
- **Affected component:** PostgreSQL/Supabase and every data-backed route.
- **Fix:** publish an ordered canonical baseline and forward migrations, then validate them against a clean non-production database.
- **Acceptance criteria:** zero-to-head migration succeeds; strict drift audit is green; schema inventory, RLS, grants, functions and storage policies are testable; no legacy migration runs implicitly.

### W1-AUTH-001 — tenant authorization has two role sources

- **Severity:** P0 release blocker for privileged tenant operations.
- **Evidence:** privileged routes including team management, client deletion and Google Calendar team status authorize with `profiles.role`, while `workspace_members.role` is separately documented as the tenant role source.
- **Risk:** disagreement or stale profile state can grant privileges not held in the selected workspace, especially for multi-workspace users.
- **Affected component:** team, admin, deletion and integration routes.
- **Fix:** adopt one workspace-scoped authorization resolver backed by membership; restrict any profile role to an explicitly documented platform-only purpose.
- **Acceptance criteria:** role-disagreement, removed-membership, workspace-switch and multi-workspace tests fail closed; no tenant privilege is derived only from `profiles.role`.

### W1-API-001 — unauthenticated n8n status and test routes

- **Severity:** P0 deployment blocker while the routes are reachable.
- **Evidence:** `GET /api/automations/n8n/status` performs an authenticated n8n API request and returns `baseUrl`; `POST /api/automations/n8n/test` performs that probe and can trigger `/webhook/test-flow`. Neither route authenticates or authorizes the caller.
- **Risk:** anonymous reconnaissance, resource exhaustion and externally visible workflow effects using server-held credentials.
- **Affected component:** n8n platform bridge.
- **Fix:** remove the endpoints outside development or require authenticated workspace-admin/internal-service authorization, rate limiting and safe output; never return the n8n URL.
- **Acceptance criteria:** anonymous and ordinary-member requests are denied before network I/O; an authorized non-production test is audited and rate-limited; production cannot invoke a test workflow.

### W1-AI-001 — existing confirmation route trusts caller-created intent

- **Severity:** P0 release blocker for assistant mutations.
- **Evidence:** `POST /api/assistant/confirm` accepts a client-supplied `preparedAction` and executes it after shape/entity checks. It does not require a server-issued one-time confirmation proof and has no request idempotency reservation.
- **Risk:** a hostile authenticated client can synthesize assistant actions, replay them, or race duplicate writes despite never receiving the UI preview.
- **Affected component:** assistant mutation route and downstream n8n hook.
- **Fix:** replace the route with the W3 control-plane contract only after Issue `#10` is satisfied; bind proof and idempotency to actor, workspace, capability and canonical arguments.
- **Acceptance criteria:** the exact confirmation, replay, concurrency and cross-workspace suite in `HANDOFF_W3_SECURITY.md` passes against the integrated route.

### W1-INTERNAL-001 — shared agent secret is not tenant authorization

- **Severity:** P0 release blocker for service-role agent endpoints.
- **Evidence:** `/api/agent/tool`, `/api/agent/action` and `/api/agent/automation` accept one `AGENT_TOOL_SECRET`, then trust caller-supplied `workspace_id` while using `SUPABASE_SERVICE_ROLE_KEY`.
- **Risk:** compromise or misuse of one integration secret permits reads or writes across every workspace; database RLS is bypassed.
- **Affected component:** n8n/agent server-to-server control plane.
- **Fix:** authenticate a scoped service principal and derive its permitted workspace(s) server-side; authorize every capability/resource; rotate and audit credentials; keep explicit workspace predicates as defense in depth.
- **Acceptance criteria:** a valid credential scoped to A cannot read, infer, mutate or schedule B; forged workspace IDs are denied before service-role queries; key rotation/revocation and audit tests are reproducible.

### W1-SQL-001 — unsafe legacy `SECURITY DEFINER` evidence

- **Severity:** P1 migration-review blocker, not proof the canonical schema is vulnerable.
- **Evidence:** W4's static scanner rejects `supabase/legacy-migrations/20260622_p39a_delete_client_cascade.sql` because its `SECURITY DEFINER` declaration lacks an empty `search_path`.
- **Risk:** copying legacy SQL into the canonical chain without review could enable object-shadowing privilege escalation.
- **Affected component:** legacy migration evidence.
- **Fix:** do not promote legacy SQL verbatim; recreate the function with empty `search_path`, fully qualified objects, explicit authorization and minimal execute grants.
- **Acceptance criteria:** the canonical replacement passes static checks plus anonymous, ordinary-user and cross-workspace invocation tests.

### W1-SECRET-001 — tracked historical secret values

- **Severity:** P0 merge blocker.
- **Evidence:** GitHub CI run `#31` fails the Secret Scan job at `61848cf`. A value-redacted local review confirms that `docs/archive/legacy/VPS_MIGRATION_PLAN.md` contains assigned values for `N8N_WEBHOOK_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` and `NOWCRM_WEBHOOK_SECRET` in the current tree. No values were printed or copied into findings.
- **Risk:** the repository is public; even rotated values normalize unsafe secret handling and remain recoverable from Git history after a normal deletion commit.
- **Affected component:** repository history and legacy documentation.
- **Fix:** replace values with placeholders, purge the introduced blobs/commits from the W1 branch before merge, keep rotation evidence out of Git and rerun full-history scanning. Do not add an allowlist for real-looking credentials merely because they are rotated.
- **Acceptance criteria:** current tree and reachable PR history contain no secret value; full-history Secret Scan is green; affected credentials are confirmed rotated through an out-of-band record.

### W1-CONTRACT-001 — canonical identity schema and active application disagree

- **Severity:** P0 canonical-promotion blocker.
- **Evidence:** the migration intentionally removes `profiles.role` and makes active `workspace_members` the only authorization source. Active team/current-user routes still select, insert and update `profiles.role` and `trial_status`. The onboarding route inserts `workspaces.plan`, omits the new required `workspaces.slug`, and upserts the removed profile role.
- **Risk:** onboarding and team administration fail against the canonical schema; authorization code does not implement the declared tenant boundary.
- **Affected component:** onboarding, current-user/session resolution, team administration and integration admin checks.
- **Fix:** add one server-side active-membership resolver, migrate every privileged route to it, and align all inserts/selects with the canonical columns. Provision workspace/profile/membership atomically through a reviewed transaction or RPC.
- **Acceptance criteria:** generated/database types match all active queries; onboarding succeeds atomically on a clean database; duplicate/race rollback is safe; suspended/removed/multi-workspace/role-disagreement tests fail closed; no active code reads or writes `profiles.role`.

### W1-RLS-TEST-001 — RLS evidence is static only

- **Severity:** P1 before canonical approval; P0 before production.
- **Evidence:** the seven green bootstrap tests inspect SQL text with regular expressions. No PostgreSQL/Supabase instance applies the migration or executes authenticated A/B CRUD and RPC attacks.
- **Risk:** syntax, grants, owner bypass, policy recursion and real JWT behavior can differ from the textual expectation.
- **Affected component:** tenant identity migration and helpers.
- **Fix:** apply migrations from zero in ephemeral/local Supabase or isolated staging and run the W4 tenant matrix with real principals.
- **Acceptance criteria:** migration application plus negative-control, anonymous, A/B, suspended, removed and multi-workspace tests are reproducible in CI or an approved heavy gate.

### W1-AUTH-002 — workspace suspension is not enforced

- **Severity:** P0 canonical-promotion blocker.
- **Evidence:** at `61848cf`, all five membership helpers require an active membership but none joins `public.workspaces` or requires its status to be active. A disposable W4 assertion covering every helper fails immediately. The existing “inactive” test proves membership status only.
- **Risk:** a suspended company retains tenant reads and every RLS/RPC decision delegated to these helpers while memberships remain active.
- **Affected component:** tenant identity migration, RLS helpers and lifecycle tests.
- **Fix:** require both active membership and active workspace in all helpers, including both membership sides of `shares_workspace_with`; keep suspension recovery on an audited privileged path.
- **Acceptance criteria:** a real database test proves suspended A cannot list/read/write/invoke tenant RPCs, active B is unaffected, and reactivation is explicit and audited.

## Revalidation of `w1/bootstrap-sanitized`

Reviewed head: `4936a08` on 2026-09-25.

### Improvements accepted as progress

- The branch starts from the W4 baseline rather than inheriting the prior W1 commits.
- Team-user routes now resolve an active `workspace_members` row and validate a requested
  workspace against the caller's memberships. Pure resolver tests include invalid, absent and
  multi-workspace selection plus role-assignment restrictions.
- Telecom v0 read contracts are versioned.
- A disposable checkout passes `npm ci`, lint with three warnings, typecheck, 12 tests, production
  build and high-severity dependency audit. The canonical migration passes W4's static SQL scan.

### Blockers still open

- **`W1-SECRET-001` is not resolved:** the legacy migration-plan document has the same Git blob
  (`aa9b9a6c…`) as the prior branch. A value-redacted exact-match check confirms all three previously
  reported webhook-secret values remain in the current tree and reachable history. The claim of zero
  real/historical credentials in `W1_SECRET_SCAN_TRIAGE.md` is therefore not accepted. No values were
  emitted during verification.
- Strict schema audit still reports 32 missing relations/views and two missing RPCs.
- The team API improvement is not an application-wide resolver migration. Assistant, inbox,
  calendar, reports, n8n and other routes still derive workspace/role from `profiles`; the current
  user mapper still reads removed `role` and `trial_status` fields.
- Onboarding still inserts absent `workspaces.plan`, omits mandatory `slug`, upserts removed
  `profiles.role`, treats membership creation as secondary and performs compensating operations
  instead of one atomic transaction.
- W4's route gate finds 22 unregistered sensitive/privileged routes on this head.
- RLS tests remain SQL-regex tests; no database-backed A/B attack evidence exists.

This branch may continue receiving fixes, but it is not a sanitized or canonical merge candidate yet.

### Follow-up at `9f633cd`

Accepted progress:

- `/api/automations/n8n/status` now resolves an active workspace manager before its network probe
  and no longer returns the n8n base URL.
- `/api/automations/n8n/test` now authenticates a workspace manager, rate-limits by actor/workspace
  and binds the payload workspace to the resolved caller.
- Real WhatsApp sends gained an actor/workspace rate-limit guard.

Open/introduced review findings:

- The exact three historical values and legacy blob remain unchanged; `W1-SECRET-001` is still P0.
- Registry v1 passes while declarations contradict source. Agent routes are labelled scoped/signed
  although they still use global `AGENT_TOOL_SECRET` and caller `workspace_id`; agent and assistant
  write handlers are labelled as having no side effects; multiple routes are labelled production-
  disabled without an enforceable runtime deny; all 22 entries self-assert `securityReviewed=true`
  without a W4 review reference.
- W4 registry v2 rejects legacy global agent secrets, undeclared writes, missing runtime production
  denies, unsupported auth/signature claims and review assertions without an issue/PR/commit ref.

The endpoint changes are useful but do not close the service-principal, assistant-confirmation,
secret-history, schema-drift, onboarding or database-backed RLS gates.

Draft PR `#13` head `75c2103` adds documentation only after `9f633cd`. Its CI run `#50` is green,
but the exact-value/blob verification is unchanged. A passing generic scanner does not supersede
direct evidence that the values remain tracked and reachable. W4 submitted `CHANGES_REQUESTED` on
the current PR head.
