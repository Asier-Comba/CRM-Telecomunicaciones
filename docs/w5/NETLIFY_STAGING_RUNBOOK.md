# Private staging preview on Netlify — runbook (W5)

Status: staging preview only. Not production, not a release.

## What exists

| Item | Value |
|---|---|
| URL | https://crm-telecom-staging-preview.netlify.app |
| Project | `crm-telecom-staging-preview` (site ID kept in the `NETLIFY_SITE_ID` secret) |
| Team / plan | Owner's Netlify team, Free (credit-based), 1 member |
| Visibility | Private: production and previews require Netlify team login |
| Supabase | `crm-telecom-staging` only, 87 migrations |
| Build | `netlify.toml`: `npm run build`, publish `.next`, `@netlify/plugin-nextjs`, Node from `.nvmrc` |

## Access

On Free/Personal credit-based plans a private project is visible only to the
team owner. Any other Netlify account gets Netlify's "This site is private /
Page not found / log in as another user" page before the CRM. The team-login
session expires after about one hour (401, reload). A second tester needs a
Netlify plan with additional members or reviewers: an owner cost decision.
Never make the project public, share sessions or share passwords.

Two independent logins: Netlify team login (can this browser load the site)
and CRM login (Supabase Auth, who the user is). There is no bridge.

## Site environment (names only)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`PRODUCT_V1_ENABLED`, `PRODUCT_V1_ORIGIN`, `APP_ENV=staging`,
`PRODUCT_STAGING_INTEGRATION`, `PRODUCT_STAGING_USER_IDS` (uuid_csv: 1..64
canonical lowercase UUIDs of synthetic `@example.invalid` accounts, no
spaces, wildcards or duplicates; validated by `scripts/platform/config.mjs`).
`NODE_ENV` cannot be set on Netlify (the platform drops it); the admission
reads the build-inlined value. Must stay unset: service-role or secret keys,
AI keys, mail credentials, n8n, `PRODUCT_DOCUMENT_CONTENT_ENABLED`.

## Deploy workflow `w5-netlify-staging-deploy.yml`

1. `verify-source` (no secrets): full SHA and tree inputs, exact checkout and
   tree, `npm ci`, profile87 closure test **mandatory**, `inventory --check`,
   `platform verify`, typecheck, adapter and CLI versions checked against
   pinned npm integrity, source record artifact (SHA, tree, hashes of
   `netlify.toml`, lockfile and environment manifest, Next/Node/adapter/CLI
   versions, migration count).
2. `deploy` (protected `staging` environment): same tree re-checked, pinned
   adapter installed, `netlify deploy --build --prod`; the result must belong
   to the configured site; deploy state must be `ready`; anonymous requests to
   five routes on both the site URL and the new deploy's own permalink must
   answer 401; deploy record artifact.
3. `rollback` (protected): republishes a recorded deploy ID (same bytes, no
   rebuild) and re-checks privacy. Database migrations are forward-only and
   never rolled back by a frontend change.

Authenticated QA is a separate, recorded step; the workflow does not log in.

## Owner actions required (once)

1. **Make the workflow dispatchable.** GitHub only offers `workflow_dispatch`
   for workflows present on the default branch (`w4/security-baseline`). W5
   cannot change that branch; the owner merges this file there (or approves a
   PR that does) after review.
2. **Create the GitHub environment `staging`** with the owner as required
   reviewer and the secrets `NETLIFY_AUTH_TOKEN` (owner's personal access
   token) and `NETLIFY_SITE_ID`.

Until both exist, deploys are made manually by W5 from an exact export of the
reviewed SHA and recorded below.

## Deploy ledger

| Date (UTC) | Deploy ID | Source | Mode | Anonymous | Authenticated |
|---|---|---|---|---|---|
| 2026-10-19 | `6ad6693262c82905fcf6bc40` | `2f1b6dd7` + toml | #159 hosted mode (retired) | 401 | not run |
| 2026-10-20 | `6ad75304f4d30466aa878e8c` | `3b80c50d` + toml | integrator admission | 401 | blocked: 503 on Netlify Edge |
| 2026-10-20 | `6ad75c93ac4914f9005f4767` | `e42cfd59` + toml | integrator admission + NODE_ENV fix | 401 | PASS: login, client, text invoice draft; negatives out of cohort |
| 2026-10-20 | `6ad78f6c810c781fba4f5880` | `a9e977ad` (exact tree, own toml) | integrator admission, cohort of 3 | 401 | PASS: A/B window (positive A and B; B→A read/modify denied; suspended, out-of-cohort, anonymous denied; no leaks) |

Effective build of `6ad75c93` (from its Netlify log): Node 24.22.0, npm
11.19.1, `@netlify/build` 37.4.3, Next 16.3.8. The adapter version was not
printed: unpinned at that time (NOT_RECORDED).

## Hosted state (verified 2026-10-22)

| Field | Value |
|---|---|
| Current deploy | `6ad78f6c810c781fba4f5880`, state `ready` (Netlify API) |
| Source / tree | `a9e977adf90b1e83cded23fb54aefc696839d014` / `ac48598bffd8a528919f63f2bcad1d07365c775d` |
| Build | Node 24.22.0, npm 11.19.1, Next 16.3.8, `@netlify/build` 37.5.0; adapter NOT_RECORDED (manual deploy before pinning) |
| Access | Team login on all deploys; anonymous 401 on `/`, `/login`, `/api/health/live` and the deploy permalink |
| Site variables (names) | `APP_ENV`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `PRODUCT_V1_ENABLED`, `PRODUCT_V1_ORIGIN`, `PRODUCT_STAGING_INTEGRATION`, `PRODUCT_STAGING_USER_IDS`. No service-role key, no AI key, no mail credential |
| Supabase | `crm-telecom-staging`, 87 migrations; Storage 88 not applied |
| Next candidate | PR #175 `48e4c64e157e1a66e1fd2d8b6694247c870f2a15`: **not hosted** |

Not hosted means not online: features merged after `a9e977ad` are not available at the URL.

## Eligibility gate

`infra/platform/staging-deploy-policy.json` (contract `w5.staging-deploy-eligibility.v1`) is read from the workflow's own ref:
- Every required workflow must have completed on the exact SHA; the latest run decides.
- Every failed job needs an exception that names an approver and has an expiry date.
- W5 never approves exceptions. The current proposals have `approved_by: null`.

Dry run on 2026-10-22 (real API data):

| SHA | Eligible | Blockers |
|---|---|---|
| `48e4c64e` (candidate) | NO | CI `Lint, types, tests, build` (`npm audit`: 5 HIGH, `braces`); enterprise `n8n-disposable` (vendor images); W4 `reachable-history` (28 findings, 0 real credentials per W5) |
| `a9e977ad` (hosted) | NO | It was deployed under explicit owner authorization before this gate existed |

The `braces` advisory (GHSA-vfj7-8cjw-p6xm, `<= 3.0.3`) has no patched release. Every version of `@next/eslint-plugin-next`, including 16.4.2 and the 16.5 canary, still pins `fast-glob@3.3.1`. The CI job bundles the audit with lint, types, tests and build, so a job-level exception would hide other failures. Before any exception can be approved, the audit must run as its own job (integrator/W4).

## OpenAI (no values)

| Check | State |
|---|---|
| Where the key exists | GitHub repository Actions secret `OPENAI_API_KEY` (updated 2026-10-13). No environments, Dependabot or Codespaces secrets |
| Injected into | **Nothing**: no workflow on any branch references it, and it is not a Netlify site or team variable |
| History exposure | gitleaks 8.24.3 over all refs (1,584 commits, 2026-10-22): 0 `openai-api-key` findings. Extra regex for OpenAI key formats: 2 commits, both the placeholder fixture in `test/schema.test.ts` |
| Hosted provider status | `provider_available: false` (NOT_CONFIGURED), `budget_authorized: false` (0 EUR policy), AI writes OFF |
| Risk | The repository is PUBLIC. Actions secrets are not passed to pull requests from forks, but any workflow added by someone with write access could read them. Keep the key unreferenced until a metered, kill-switched path with a durable budget ledger is approved |
