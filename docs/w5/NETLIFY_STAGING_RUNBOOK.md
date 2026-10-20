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
