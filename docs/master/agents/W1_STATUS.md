# W1 — Backend, Data, Supabase & Integration

- Updated: 2026-09-26
- Branch: `w1/telecom-domain-v1` (dependent on frozen PR #14)
- Baseline: `w4/security-baseline@5cb872c`
- State: draft PR #15 published; PR #14 unchanged at `32f0112`; W4/DB review pending

## Current checkpoint

- PR #14 remains the stable canonical/security review target. Domain growth is
  isolated in PR #15 and will rebase/selectively transport only after W4 names
  an accepted integration base.
- Imported the buildable application, canonical tenant migration, membership
  resolver, Telecom v0 contracts and bootstrap tests only.
- Excluded `docs/archive`, legacy migrations, live-patch/QA scripts, n8n workflow
  artifacts and all historical privileged API routes.
- Server and browser tenant resolvers now require both an active membership and
  `workspaces.status = 'active'`; `profiles.workspace_id` remains a
  non-authorizing UX preference.
- Added a forward-only authorization migration that redefines all five tenant
  helpers, denies membership/manager visibility for suspended workspaces and
  prevents onboarding from bypassing a suspended tenant.
- Added atomic authenticated onboarding through `provision_workspace`: workspace,
  slug, owner membership and profile preference commit in one transaction;
  retries serialize per user and return the existing active membership.
- The domain branch now contains normalized customers/contacts, operator/plan
  versions, contracts/services/lines, commitments/renewals, commercial
  operations, service cases and protected document metadata. All 17 raw domain
  relations use forced RLS, active-workspace membership policies and explicit
  revokes.
- `telecom.v1` publishes typed read DTOs/envelopes and an authorized server
  boundary for 14 W2/W3 read operations. The concrete DB repository/routes are
  not live and raw table grants remain closed.
- A transactional synthetic DB harness covers the 17-relation A/B/C read
  matrix, owner/admin/member/viewer, suspended/removed/anonymous actors and
  representative mutation attacks. Its launcher refuses non-loopback or
  non-test targets, but no PostgreSQL runtime is installed here, so DB evidence
  is not claimed green.
- A clean exported checkout of `d21339f` independently passed a fresh dependency
  install, lint, typecheck, 22/22 tests, the W4 tenant/assistant/security gates
  and the same 20-route production build.
- Supabase has not been contacted or mutated.
- Draft PR #14 is published and its Linux CI passed baseline, application,
  migration-policy and secret-scan jobs. PRs #11 and #13 were closed unmerged
  as superseded only after this green replacement existed.
- Live consumer snapshots were re-read at W2 `db8ab41` and W3 `c6e869e`.
  Customer writes are now inventoried; no new domain write has been inferred
  from either consumer's presentation contract.

## Intentionally disabled

Agent, assistant-confirmation, n8n status/test, inbox-send, provider webhook,
calendar and team-management endpoints from the historical snapshot are absent.
They may return only after scoped authorization, rate limiting, audit,
idempotency where applicable and W4 review are implemented and tested.

## Contracts

- `docs/master/W1_TENANT_AUTHORIZATION.md`
- `docs/master/W1_DATA_CONTRACTS_V0.md`
- `docs/master/W1_SCHEMA_DRIFT_CLASSIFICATION.md`
- `docs/master/W1_CUSTOMER_WRITE_INVENTORY.md`
- `docs/master/W1_ZERO_TO_HEAD_PLAN.md`
- `docs/master/W1_W3_DURABLE_DATA_MAPPING.md`
- `docs/master/W1_IMPORT_AUDIT_FOUNDATION.md`
- `src/lib/server/tenant-context.ts`
- `src/lib/contracts/telecom-v0.ts`
- `src/lib/contracts/telecom-v1.ts`
- `src/lib/server/telecom-read-service-v1.ts`

## Open gates

- Obtain W4's independent review of PR #14 and repeat the database-only gates
  in authorized isolated Supabase infrastructure.
- Complete the remaining deliberately classified canonical schema; strict drift
  audit remains intentionally red.
- Follow the exhaustive 29+1 drift classification; legacy property and provider-
  specific n8n objects are retirement targets, not migration sources.
- Database-backed zero-to-head and A/B RLS attack tests in isolated infrastructure.
- W4 review and explicit human authorization before any Supabase apply.

## Next safe work

Obtain W4 revalidation of PR #14 and W2/W3 acceptance of the versioned read
boundary. Then implement database-backed readers only through a capability-aware
server adapter; do not reopen raw browser grants. Add Storage policies only
after the private bucket/path contract is executable in isolated Supabase. Do
not add compatibility writes for `clients`, legacy `entity_files` or
`service_cases` consumers without an explicit adapter decision.
