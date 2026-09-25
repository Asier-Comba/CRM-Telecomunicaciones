# W2 → W1 handoff — canonical frontend integration gate

- Date: 2026-09-25
- W2 branch: `w2/frontend-bootstrap-readiness`
- W1 source reviewed: `w1/bootstrap-canonical` at `0dd2f14`
- Status: application bootstrap present; canonical telecom integration gate not yet passed

## Verified present

- Next.js application under `src/app`.
- `package.json`, lockfile, TypeScript, ESLint, Tailwind/PostCSS and Next configuration.
- Historical functional routes/components imported with documented provenance.
- `supabase/legacy-migrations` isolated from the canonical migration pipeline.
- `W1_STATUS.md`, bootstrap provenance and a reproducibility audit.

This is sufficient for W2 to inspect architecture. It is not yet sufficient for W2 to rebase and implement telecom features.

## Gate failures

The project owner defined a canonical base as requiring application, real configuration, canonical Supabase migrations, W1 status and first data contracts. At `0dd2f14`:

1. `docs/master/03_DATA_MODEL.md` states that `supabase/migrations` is empty.
2. All executable historical SQL remains correctly isolated under `supabase/legacy-migrations`.
3. The telecom model is explicitly marked “diseño telecom pendiente.”
4. No stable customer, contact, service, line, contract, permanence, renewal or dashboard presentation/read contract is published.
5. Role/capability semantics and canonical workspace ownership fields are not yet published.
6. W4 has not yet accepted the new bootstrap/schema as the integration base.

Therefore W2 will not rebase, copy application code or start a parallel implementation from this checkpoint.

## Minimum W1 publication that unlocks W2

- At least one canonical migration under `supabase/migrations`, runnable from an empty database and covered by the W4 migration policy.
- Versioned tenant ownership and role/capability contract.
- Stable customer/company identity and contact read model, including nullability and safe display/search fields.
- Stable contract/service/line/operator read model, including status and date/time-zone semantics.
- Permanence and renewal semantics: canonical states, relevant dates/windows and whether remaining time is supplied or derived.
- First dashboard projection or section queries for tasks/meetings, renewal/permanence and opportunity follow-up.
- Collection semantics: pagination/bounds, supported sort/filter, empty/not-found/error codes and freshness after mutation.
- `W1_STATUS.md` naming the exact integration commit and migration/schema test evidence.
- W4 status or handoff accepting the branch as the base W2 should integrate onto.

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
