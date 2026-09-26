# W1 — Backend, Data, Supabase & Integration

- Updated: 2026-09-26
- Branch: `w1/canonical-v3`
- Baseline: `w4/security-baseline@5cb872c`
- State: W4-integrated checkpoint; suspended-workspace P0 fixed in code, publication pending

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

## Intentionally disabled

Agent, assistant-confirmation, n8n status/test, inbox-send, provider webhook,
calendar and team-management endpoints from the historical snapshot are absent.
They may return only after scoped authorization, rate limiting, audit,
idempotency where applicable and W4 review are implemented and tested.

## Contracts

- `docs/master/W1_TENANT_AUTHORIZATION.md`
- `docs/master/W1_DATA_CONTRACTS_V0.md`
- `src/lib/server/tenant-context.ts`
- `src/lib/contracts/telecom-v0.ts`

## Open gates

- Validate from a clean checkout, publish `w1/canonical-v3`, then let CI/W4
  independently repeat the full-history and Linux shell gates.
- Complete canonical Telecom schema; strict drift audit remains intentionally red.
- Database-backed zero-to-head and A/B RLS attack tests in isolated infrastructure.
- W4 review and explicit human authorization before any Supabase apply.

## Next safe work

Obtain W4 revalidation of the suspended-workspace repair, then publish the first
normalized Telecom domain migration (customers/companies and contacts) with
workspace scope, RLS, indexes and executable contract tests.
