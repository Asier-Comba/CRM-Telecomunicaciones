# W1 — Backend, Data, Supabase & Integration

- Updated: 2026-09-26
- Branch: `w1/canonical-v2`
- Baseline: `w4/security-baseline@10ee3aa`
- State: clean-history reconstruction in progress; no merge, deploy or Supabase apply

## Current checkpoint

- Reconstructed from the latest W4 baseline without inheriting either prior W1
  branch history.
- Imported the buildable application, canonical tenant migration, membership
  resolver, Telecom v0 contracts and bootstrap tests only.
- Excluded `docs/archive`, legacy migrations, live-patch/QA scripts, n8n workflow
  artifacts and all historical privileged API routes.
- Added one server-side tenant resolver backed exclusively by active
  `workspace_members`; `profiles.workspace_id` remains a non-authorizing UX
  preference.
- Updated browser identity display to select only an active membership and to
  derive its role from that membership.
- Added atomic authenticated onboarding through `provision_workspace`: workspace,
  slug, owner membership and profile preference commit in one transaction;
  retries serialize per user and return the existing active membership.
- Lint, typecheck, 19 bootstrap tests, production build, sensitive-route gate and
  observability gate pass locally. Strict drift remains red by design with 29
  unresolved relations/views and one RPC.
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

- Full-history and clean-clone validation of this new branch.
- Complete canonical Telecom schema; strict drift audit remains intentionally red.
- Database-backed zero-to-head and A/B RLS attack tests in isolated infrastructure.
- W4 review and explicit human authorization before any Supabase apply.

## Next safe work

Publish the first normalized Telecom domain migration (customers/companies and
contacts) with workspace scope, RLS, indexes and executable contract tests.
