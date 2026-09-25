# W2 → W1 handoff — canonical frontend integration gate

- Date: 2026-09-25
- W2 branch: `w2/frontend-bootstrap-readiness`
- W1 source reviewed: `w1/bootstrap-canonical` at `61848cf`
- Status: application bootstrap present; canonical telecom integration gate not yet passed

## Verified present

- Next.js application under `src/app`.
- `package.json`, lockfile, TypeScript, ESLint, Tailwind/PostCSS and Next configuration.
- Historical functional routes/components imported with documented provenance.
- `supabase/legacy-migrations` isolated from the canonical migration pipeline.
- `W1_STATUS.md`, bootstrap provenance and a reproducibility audit.
- Canonical `20260925153500_core_tenant_identity.sql` migration with `workspaces`, `profiles`, `workspace_members`, membership helpers and RLS.
- Tenant authorization source declared as active `workspace_members`; `profiles.workspace_id` is explicitly non-authorizing.
- Canonical membership roles declared as `owner`, `admin`, `member` and `viewer`.

This is sufficient for W2 to inspect architecture. It is not yet sufficient for W2 to rebase and implement telecom features.

## Gate failures

The project owner defined a canonical base as requiring application, real configuration, canonical Supabase migrations, W1 status and first data contracts. At `61848cf`, application/configuration and the tenant-identity migration exist, but:

1. The domain portion of the telecom model is still pending after tenant identity.
2. No stable customer, contact, service, line, contract, permanence, renewal or dashboard presentation/read contract is published.
3. Roles exist, but feature/action capability semantics are not yet published.
4. W4 has not yet accepted PR `#11` and `61848cf` as the integration base.

Therefore W2 will not rebase, copy application code or start a parallel implementation from this checkpoint.

## Gate status

| Requirement | Status at `61848cf` |
| --- | --- |
| Next.js application and real configuration | Closed |
| Canonical migration under `supabase/migrations` | Closed for tenant identity |
| Tenant ownership and role source | Closed at data layer |
| Feature/action capability semantics | Open |
| Stable customer/company identity and contact read model | Open |
| Stable contract/service/line/operator read model | Open |
| Permanence and renewal semantics | Open |
| Dashboard projections/section queries | Open |
| Collection/error/freshness semantics | Open |
| W1 status naming final integration commit and evidence | Open; status still points to earlier functional SHA |
| W4 acceptance of integration base | Open |

The open items above are the minimum W1/W4 publication that unlocks W2.

Detailed UI needs remain in:

- `docs/master/W2_CUSTOMER_360_SPEC.md`;
- `docs/master/W2_DASHBOARD_COMMAND_CENTER.md`;
- `docs/master/W2_UI_FOUNDATION.md`.

## W2 action on acceptance

Once all items above exist, W2 will:

1. fetch and review the declared integration commit;
2. create a safety ref for the current W2 branch;
3. rebase or replay W2 documentation onto the accepted base without force-pushing shared work blindly;
4. run install, lint, typecheck, tests, build, migration policy and guardrails before source edits;
5. implement the smallest UI-foundation slice with tests;
6. implement Customer 360 identity/attention against W1 types;
7. keep PR `#8` draft until the integration diff and CI evidence are reviewed.
