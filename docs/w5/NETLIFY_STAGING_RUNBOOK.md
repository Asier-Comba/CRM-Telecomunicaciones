# Private staging preview on Netlify — runbook (W5 Cloud)

Status: **staging preview only. Not production, not a release.**

## What exists

| Item | Value |
|---|---|
| URL | https://crm-telecom-staging-preview.netlify.app |
| Netlify project | `crm-telecom-staging-preview` (site ID kept in the `NETLIFY_SITE_ID` secret) |
| Netlify team / plan | Owner's team, **Free** (credit-based), 1 member |
| Visibility | **Private**: production and previews require Netlify team login |
| Supabase | `crm-telecom-staging` only, 87 migrations |
| Build | `netlify.toml`: `npm run build`, publish `.next`, `@netlify/plugin-nextjs`, Node from `.nvmrc` |

## Who can open it (diagnosed 2026-10-20)

On Free/Personal credit-based plans a **private project is visible only to the
team owner**. Anyone signed in to Netlify with a different account (another
person, or a second account of the owner) gets Netlify's "Page not found" /
"log in as another user" page before reaching the CRM. Netlify's team-login
session also expires after about one hour (HTTP 401; reload to renew).

- Owner: sign in at app.netlify.com with the account that owns the team, then open the URL.
- Additional testers (QA, other owner): not possible on Free while the project
  stays private. Options, all needing owner approval:
  1. Netlify Pro (paid per member) to invite members or reviewers.
  2. Keep testing from the owner's account only.
- Never: make the project public, share a Netlify session, or share passwords.

## Two separate logins

1. Netlify team login: can this browser load the site at all.
2. CRM login (Supabase Auth): who the user is inside the app.

There is no bridge between them. Passing (1) does not log anyone into (2).

## Site environment (names only, values in Netlify)

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Staging project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key |
| `PRODUCT_V1_ENABLED`, `PRODUCT_V1_ORIGIN` | Product HTTP routes and exact same-origin check |
| `APP_ENV=staging`, `PRODUCT_STAGING_INTEGRATION`, `PRODUCT_STAGING_USER_IDS` | Server-side staging admission and synthetic cohort (integrator contract) |

Must stay unset in staging: service-role or secret keys, AI provider keys,
mail credentials, n8n, `PRODUCT_DOCUMENT_CONTENT_ENABLED` (Storage P0 open).

## Deploying a reviewed SHA

Workflow `W5 Netlify private staging deploy` (manual):

1. Inputs: full SHA and a reason (PR/unit/approval).
2. Checks out exactly that SHA, verifies it, runs `npm ci`, type check and the
   migration closure test.
3. `netlify deploy --build --prod` with the pinned CLI; the build reads the
   site environment from Netlify, so no value passes through GitHub.
4. Smoke test: anonymous requests to five routes must answer 401.
5. Job summary records SHA, deploy ID and reason.

Prerequisites (owner, one time):
- GitHub environment `staging` with required reviewer = owner.
- Secrets in that environment: `NETLIFY_AUTH_TOKEN` (personal access token
  of the team owner) and `NETLIFY_SITE_ID`.

The workflow does not run authenticated E2E; that stays a separate, recorded step.

## Rollback

Run the same workflow with the previous known-good SHA. Database migrations are
forward-only and are never rolled back by a frontend redeploy.

## Deploy ledger

| Date (UTC) | Deploy ID | Source | Mode | Anonymous | Authenticated E2E |
|---|---|---|---|---|---|
| 2026-10-19 | `6ad6577d05014d9637ead18b` | `c597891` + toml | flags off | 401 | not run |
| 2026-10-19 | `6ad65d383d678cbd9747b2fb` | `bb16afe` + toml | W5 #159 hosted mode | 401 | not run |
| 2026-10-19 | `6ad6693262c82905fcf6bc40` | `2f1b6dd7` + toml | W5 #159 hosted mode | 401 | not run |

| 2026-10-20 | `6ad75304f4d30466aa878e8c` | `3b80c50d` + toml | integrator staging admission | 401 | blocked: 503 on Netlify Edge (admission invalid, no NODE_ENV) |
| 2026-10-20 | `6ad75c93ac4914f9005f4767` | `e42cfd59` + toml | integrator admission + W5 NODE_ENV fix, cohort of 1 synthetic owner | 401 | PASS: login, client create/reload, text invoice draft save/reload |

The #159 hosted mode is superseded by the integrator's stricter staging
admission; the next deploy should use that admission, not #159's.
