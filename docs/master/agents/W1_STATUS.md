# W1 — Backend, Data, Supabase & Integration

- Updated: 2026-09-26
- Branch: `w1/canonical-v3`
- Baseline: `w4/security-baseline@5cb872c`
- State: draft PR #14 published; suspended-workspace P0 fixed; CI green; W4/DB review pending

## Current checkpoint

- Reconstructed from W4 `5cb872c` without inheriting either prior W1 branch
  history. Local safety refs preserve the prior `canonical-v2` checkpoint.
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
- Lint, typecheck, 22 bootstrap tests, the 28-case W4 tenant harness, all
  transportable W4 Node gates and a 20-route production build pass locally.
  Strict drift remains red by design with 29 unresolved relations/views and one
  RPC.
- A clean exported checkout of `d21339f` independently passed a fresh dependency
  install, lint, typecheck, 22/22 tests, the W4 tenant/assistant/security gates
  and the same 20-route production build.
- Supabase has not been contacted or mutated.
- Draft PR #14 is published and its Linux CI passed baseline, application,
  migration-policy and secret-scan jobs. PRs #11 and #13 were closed unmerged
  as superseded only after this green replacement existed.
- Live consumer snapshots were re-read at W2 `13369ba` and W3 `c6e869e`.
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
- `src/lib/server/tenant-context.ts`
- `src/lib/contracts/telecom-v0.ts`

## Open gates

- Obtain W4's independent review of PR #14 and repeat the database-only gates
  in authorized isolated Supabase infrastructure.
- Complete canonical Telecom schema; strict drift audit remains intentionally red.
- Follow the exhaustive 29+1 drift classification; legacy property and provider-
  specific n8n objects are retirement targets, not migration sources.
- Database-backed zero-to-head and A/B RLS attack tests in isolated infrastructure.
- W4 review and explicit human authorization before any Supabase apply.

## Next safe work

Obtain W4 revalidation of the suspended-workspace repair and W2 acceptance of
the server read boundary. Then author (without applying) the first normalized
Telecom domain migration for customers/companies and contacts, with workspace
scope, RLS, indexes and executable contract tests. Do not add a compatibility
write path for `clients` until every historical operation in
`W1_CUSTOMER_WRITE_INVENTORY.md` has an explicit decision.
