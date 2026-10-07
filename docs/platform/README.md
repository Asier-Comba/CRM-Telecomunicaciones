# CRM Telecom enterprise platform

W5 prepares reconstruction and operations. This branch is a draft against W2;
it is not a production release. Use `docs/master/platform/W5_PLATFORM_ACCEPTANCE.json`
for exact evidence and blockers. Company accounts and credentials are not needed
to run repository checks. Never paste credential values into a chat or commit them.

## Commands

Install the locked application with Node24 (`npm ci`).

| Task | Command | Scope |
| --- | --- | --- |
| Inventory / provider contracts | `npm run platform:verify` | Repository only |
| Security/config/operations fixtures | `npm run platform:test` | Synthetic unit tests |
| Clean real-local bootstrap | `npm run platform:bootstrap:local` | Disposable Docker/Supabase only |
| A -> empty B recovery | `npm run platform:recovery:test` | Disposable DB/Auth/Storage |
| Top-level acceptance | `npm run platform:acceptance` | Build, real login, API, Storage, two fresh schemas, recovery |
| Staging preflight | `npm run platform:preflight:staging` | Read-only; blocks current hosted product |
| Production preflight | `npm run platform:preflight:prod` | Read-only; no deploy |
| Release manifest | `npm run platform:release` | Metadata only |
| Company contract | `node scripts/platform/platform.mjs company company.json` | No credential values |
| Company bootstrap state | `npm run platform:company:report -- company.json` | Read-only phase/binding report; no live proof |
| Provider DNS records | `node scripts/platform/platform.mjs dns company.json` | Public DNS reads only |
| Hosted reconstruction plan | `node scripts/platform/hosted-bootstrap.mjs company.json` | No mutation by default |
| Private build boundary | `node scripts/platform/boundary.mjs --build` | Disposable private canaries |
| Registered n8n import plan | `node scripts/platform/n8n-registry.mjs` | No execution or activation |

Before local bootstrap explicitly set `PLATFORM_TARGET=LOCAL`. Use a machine/runner
with Docker Linux engine and Supabase CLI2.119.0. The command refuses linked hosted
projects, hosted credentials and existing `crm-telecom-local` containers. It builds
the application, creates synthetic Auth users and business fixtures, exercises
real HTTP contracts, and removes the disposable stack. Do not use that project
ID for work you need to keep. A bootstrap failure preserves a safe error summary,
then tears down the started test stack. Do not pass production URLs into it.

`platform:acceptance` uses existing W1/W2 backend acceptance, not an invented
parallel schema. It does not substitute for W2's full browser journey workflow.
See `.github/workflows/supabase-local.yml` for independent browser checks.

## Reconstruction and restore

Canonical SQL migrations create all product tables, extensions, RPCs, grants,
forced RLS and private buckets. No dashboard SQL or hand-created buckets.
The inventory derives migration count/head/hashes dynamically. Synthetic seeds
remain opt-in and never run automatically on hosted bootstrap.

The recovery runner captures canonical privilege/schema metadata, complete public
data plus local Auth users/identities, and recursively paginates private objects.
It encrypts the archive with a fresh in-memory AES256-GCM key, discards A, creates
B from the same migrations, verifies identical schema/ACLs, restores bytes and
metadata, verifies every object hash and rechecks actual Auth login, A/B isolation,
revoked-member denial and Storage authorization. It uses the disposable local
`supabase_admin` role solely for restoring provider-owned Auth data. That role is
not a hosted recovery credential and is not exposed to the application.

Hosted Auth sessions/signing keys, OAuth tokens, MFA enrollments and provider-owned
state are not proven portable. Sessions must be invalidated and users may require
re-enrollment/recovery on a company migration. Hosted recovery needs a separate
approved rehearsal. An adapter put/get seam verifies encrypted destination bytes;
local storage is not offsite proof. Retention is an explicit company input and
currently generates a deletion plan only. Never upload the recovery archive to CI
artifacts; only the safe status summary is published.

## Deployment topology

Initial recommendation: one Linux amd64 VPS with NTP/UTC, hardened deployment
identity and TLS reverse proxy -> nonroot Next standalone container -> managed
company Supabase. Persistent business files stay in Supabase Storage. Runtime
credentials come from an environment-specific secret store. Logs and monitoring
are bounded metadata. Add an independently persistent W3 worker only after its
accepted durable execution contract exists. n8n is optional and remains inactive.

`infra/deployment/Dockerfile` pins Node24.21.0 Linux amd64 by verified digest.
`compose.yaml` requires a digest-qualified image and externally rendered env file.
Only the proxy exposes traffic; app port is loopback-only. The proxy replaces
forwarded Host/scheme headers and rejects unknown hosts. TLS certificates/DNS
are company-owned bindings; none has been fabricated or configured here.

Browser public configuration is inlined at build. Build separate immutable images
for distinct public Supabase bindings; do not relabel a staging browser bundle as
production. Record the image digest, SHA, config shape and migration head. Do not
pass server secrets to builds. The canary build found environment strings in
Turbopack optimization cache; `postbuild` removes that disposable cache, then the
boundary gate scans generated assets/server files and captured logs.

Current W2 integrated UI is intentionally nonproduction/loopback only. The W5
entrypoint and readiness therefore block hosted activation. The protected
promotion workflow validates a candidate and performs no deployment. W4 approval
and live staging cannot be self-awarded by W5 or a JSON file. This is an explicit
release limitation, not a working staging deployment.

## Accounts and secrets

Use `infra/platform/environment-manifest.json` for every runtime/tool binding:
name, type, secret flag, required environments, owner, consumers, rule, purpose,
destination and rotation. No values. Existing W1 product contract is preserved;
W5 expands its inventory rather than enabling reserved providers.

Human-only steps are account purchase/ownership, two named owners with MFA,
domain/DNS authority, OAuth consent, billing, secret entry directly in providers,
and final production approval. Follow `docs/company/ONBOARDING.md` and the
incident/recovery runbooks. Providers configured with keys are not automatically
healthy: missing/configured/degraded/unavailable require separate observations.
Use [the disaster runbook](../runbooks/DISASTER_RECOVERY.md) for executable local
recovery checks and the separate hosted recovery gates. CI also scans the actual
runtime image with checksum-pinned Trivy0.75.0; high/critical and secret findings
stop the image gate. Only coordinates/counts are logged; raw secret matches are
never uploaded.

## Known limits

Inherited npm audit: five high findings in the eslint-config-next -> fast-glob ->
micromatch -> braces chain, GHSA-vfj7-8cjw-p6xm. The current compatible latest braces
is3.0.3; [the reviewed advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
lists no patched release. Audit proposes a framework tooling downgrade. No audit weakening or forced
downgrade. Windows rejects five inherited Unix-permission import adapter tests;
the adapter is test-only and Linux acceptance remains required. W2 owns the eventual
Windows-compatible fixture strategy. Full scanning/production import, external
CRM email, accepted W3 durable worker, live DNS/TLS, offsite policy and staging/
production evidence remain gaps. No enterprise freeze is declared while internal
implementation/evidence work remains.
