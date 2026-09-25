# W2_STATUS — Frontend, UX & Product Experience

- Updated: 2026-09-25
- Branch: `w2/frontend-bootstrap-readiness`
- Base: `w4/security-baseline` at `4ef9a5a`
- Delivered commit: `63be72d` (`docs(w2): define frontend bootstrap contract`)
- Remote checkpoint: `fd4ce63` on `origin/w2/frontend-bootstrap-readiness`
- Draft PR: `#8` targeting `w4/security-baseline`
- State: bootstrap readiness in progress; canonical application not published yet

## Done

- Verified the only writable remote is `Asier-Comba/CRM-Telecomunicaciones`.
- Confirmed the repository currently has no `main`, application code, package manifest or W1/W3 branch.
- Read and accepted the W4 security, release, observability and CI gates.
- Preserved the previous W2 work locally outside the historical repository.
- Classified the previous frontend work for selective adaptation instead of blind cherry-picking.
- Defined the frontend bootstrap and migration contract in `docs/master/W2_FRONTEND_BOOTSTRAP.md`.
- Defined testable product/UX acceptance criteria in `docs/master/W2_UX_ACCEPTANCE.md`.
- Reviewed W3 `AssistantResponse` at `97e64d3` and published the structured UI handoff in `W2_HANDOFF_W3_ASSISTANT_UI.md`.
- Published and SHA-verified `origin/w2/frontend-bootstrap-readiness` in the canonical repository.
- Opened draft PR `#8` for review without assuming or merging into a future `main`.

## Doing

- Preparing feature boundaries, validation expectations and the smallest safe migration slices for the canonical base.
- Coordinating the assistant renderer contract with W3 without duplicating planner or authorization logic.
- Monitoring `w1/bootstrap-canonical`; it exists but still matches the W4 baseline and has no W1 status/application commits.

## Next

1. Rebase this branch onto the canonical W1 base when it is published.
2. Inspect its App Router, design primitives and data contracts before moving source code.
3. Adapt the accessible field, loading/error primitives and dashboard feature boundary as separate tested commits.
4. Apply the acceptance contract to the first vertical slice and collect responsive/accessibility evidence.
5. Build the telecom command center only from W1-backed data; do not invent metrics.

## Required contracts

### W1

- Canonical base branch and supported Node/package-manager versions.
- Authenticated workspace/user presentation contract for the shell.
- Versioned read models for company/customer, contacts, assignee, services, lines, operator, contracts, permanence and renewal.
- Pagination, search, filter, loading, error and empty semantics for list endpoints.
- Dashboard query/read model with source-backed tasks, meetings, renewals, permanence alerts and opportunities.

### W3

- Close the additive UI-contract items in `W2_HANDOFF_W3_ASSISTANT_UI.md`: envelope version, canonical navigation/entity taxonomy, confirmation lifecycle, safe notices, continuation and streaming.
- Keep deep links as closed route descriptors resolved by W2, never arbitrary model URLs.

### W4

- Confirm which branch is the integration base until protected `main` exists.
- Confirm the canonical unit/component test runner once the Node app lands.
- Review auth, RLS, sensitive logs and assistant confirmations as release gates, not frontend responsibilities.

## Handoffs

- **W2 → W1:** publish the canonical application branch and the first stable customer/contract/dashboard read contracts. W2 will adapt components after reviewing those contracts.
- **W2 → W3:** v1 reviewed at `97e64d3`; respond to `W2_HANDOFF_W3_ASSISTANT_UI.md` before W2 integrates confirmation or streaming UI.
- **W2 → W4:** the frontend will preserve server-side authorization boundaries, avoid sensitive client logs and add responsive/accessibility evidence to PRs.

## Blockers

- No canonical application exists in this repository yet; adding a standalone Next.js scaffold would create an incompatible parallel product.
- `w1/bootstrap-canonical` exists but still points to the W4 baseline; no W1 status, app or data contract is published yet.
- W3 has published a usable v1 UI contract; the additive integration questions are now explicit rather than blocking all presentation work.
- The historical repository is read-only and is not a delivery target.

## Validation evidence

- `bash scripts/ci/detect-project.sh`
- `bash scripts/ci/check-migrations.sh`
- `bash scripts/ci/test-guardrails.sh`

Application typecheck, lint, unit tests and build are not applicable until the canonical Node project is committed.
