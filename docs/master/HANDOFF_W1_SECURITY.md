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

Reviewed head: `0dd2f14` on 2026-09-25.

This is no longer a placeholder. It contains a real Next.js application, `package.json`, CRM modules, Supabase historical evidence, bootstrap provenance, telecom data-model candidates and `W1_STATUS.md`. W1 may continue reconstruction in its branch. It is not yet an acceptable canonical database or release base.

### W1-QA-001 — clean checkout does not pass the claimed gate

- **Severity:** P0 canonical-promotion blocker.
- **Evidence:** in a clean checkout of `0dd2f14`, `npm ci` completed, lint emitted three warnings, typecheck passed, and all three tests failed because `scripts/audit-supabase-reproducibility.mjs` calls `readdir` on the untracked, absent `supabase/migrations` directory. Creating that empty directory only in the disposable audit clone made tests and build pass.
- **Risk:** local-only filesystem state creates false green evidence and CI cannot reproduce W1's reported validation.
- **Affected component:** bootstrap tests and Supabase reproducibility auditor.
- **Fix:** make the auditor treat an absent canonical migration directory deterministically, or track a non-executable placeholder outside the migration glob; run the complete gate from a clean clone.
- **Acceptance criteria:** a fresh clone at the reviewed head passes install, lint policy, `tsc --noEmit`, tests, build and audit without manual directory creation.

### W1-DATA-001 — no reproducible canonical schema

- **Severity:** P0 release blocker.
- **Evidence:** `supabase/migrations` has zero versioned migrations. After creating the missing directory in the disposable clone, the strict audit reported 35 missing relations/views and two missing RPCs; four assistant relations have no tracked DDL. `npm run audit:supabase-repro:strict` correctly failed.
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
