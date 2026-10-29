# Owner request: private STAGING image (GHCR), exact fields and decisions

From W5 for the repository owner. **Do not paste any secret, token or key into
chat, issues or PRs.** Every value below is entered by the owner in the GitHub
UI. Publication stays inactive until every item is done and W4 has reviewed the
exact SHA.

## Observed now (read-only, 29/10/2026)

| Fact | Value |
|---|---|
| Repository | public; owner type User; default branch `w4/security-baseline` |
| Default workflow token | `read`; Actions may not approve PRs |
| Environments | none |
| Repository variables | none (so `STAGING_PUBLIC_*` do not exist yet) |
| Package `ghcr.io/asier-comba/crm-telecom-staging` | anonymous token 403. Absence NOT proven: W5's local token lacks `read:packages` |
| GHCR billing (GitHub docs today) | "Container image storage and bandwidth for the Container registry is currently free", with at least one month's notice before any change. Account-specific usage NOT verified (needs `user` scope) |
| Candidate size (real lab) | 32 uncompressed layers, ~222 MB per candidate |

## A. Decisions (answer yes/no in #67)

1. **Public provenance entry.** The repo is public, so build provenance goes to
   the public Sigstore/Rekor log. It contains the repo, workflow path, commit SHA
   and image digest; no secrets and no configuration values. Accept?
2. **Package.** Create the private package `ghcr.io/asier-comba/crm-telecom-staging`,
   linked to this repo. The first version is `:bootstrap-<sha>`, which holds only
   the pinned public base `node:24.21.0-trixie-slim@sha256:c83040f7…` (no CRM
   code). Accept?
3. **Credential.** The workflow `GITHUB_TOKEN` is the only credential. If the
   job then reports a 403 on the user package API, the alternative is a
   fine-grained token with `read:packages` only, stored as an environment
   secret. That is a separate decision, made only if it happens.
4. **Dispatch reference.** `workflow_dispatch` only lists workflows that exist on
   the default branch `w4/security-baseline`. Either merge
   `.github/workflows/staging-image-publish.yml` there (still `if: false`), or
   choose another reviewed way. Each run must be dispatched with `--ref` at a
   branch whose head is exactly the reviewed SHA.
5. **Billing.** Under Settings → Billing, confirm Packages shows no charge, and
   either no payment method or a budget of 0 EUR. If not, stop.

## B. Environment `staging-image-publish` (Settings → Environments → New)

- Required reviewers: `Asier-Comba`. Note: as sole owner you approve your own
  runs; W4's exact-SHA review is the independent key.
- Prevent self-review: not possible with a single reviewer; recorded as a
  limitation.
- Wait timer: 0. Allow administrators to bypass: **off**.
- Deployment branches and tags: **Selected branches and tags**, only the
  reviewed branch (now `w5/image-channel-oci-v1`, or the branch W4 names).
- Environment variables (not secrets; set per candidate):

| Name | Value |
|---|---|
| `STAGING_IMAGE_BOOTSTRAP_APPROVED_SOURCE` | 40-hex SHA approved for the bootstrap run |
| `STAGING_IMAGE_APPROVED_SOURCE` | 40-hex SHA approved for the candidate run (leave empty until after the bootstrap) |
| `STAGING_PUBLIC_APP_URL` | `https://crm-telecom-staging.hvdnby.easypanel.host` |
| `STAGING_PUBLIC_SUPABASE_URL` | `https://zgwotxnyqzfuzcnmgvtn.supabase.co` |
| `STAGING_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the project's `sb_publishable_…` key (browser-public by design); type it in the UI only |

- Environment secrets: **none**.

## C. Order of operations (each step needs the previous one green)

1. W4 independent review of the exact #210 SHA. A limited ACK is not a release.
2. Decisions A1–A5 answered; environment B configured.
3. Reviewed PR that removes `if: false` from the **bootstrap** job only, and
   puts the workflow on the default branch.
4. Dispatch with `mode=bootstrap`. Expected result: package private, linked to
   the repo, anonymous pull denied. The owner also checks the package page.
5. Reviewed PR that removes `if: false` from the **candidate** job. Set
   `STAGING_IMAGE_APPROVED_SOURCE`.
6. Dispatch with `mode=candidate`. Artifacts:
   - `staging-image-receipt.json` (`staging.image.receipt.v1`);
   - `staging-image-expected.json`;
   - `staging-image-publication.safe.json`.
7. W5 re-checks the run, attestation and readback, then hands the receipt
   (`--receipt`) and expected file (`--expected`) to Work for
   `manual-preflight.mjs`. Only then is the image IMAGE_PRIVATE_VERIFIED.
8. Restore `if: false` (or clear the approval variables) after each run.

## D. Not requested

No secret values, no changes to EasyPanel, the VPS, DNS, networks or hosted
Supabase, no deployment, and no broader token scopes than listed above.
