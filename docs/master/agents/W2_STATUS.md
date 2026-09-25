# W2_STATUS — Frontend, UX & Product Experience

- Updated: 2026-09-25
- Branch: `w2/frontend-bootstrap-readiness`
- Base: `w4/security-baseline` at `4ef9a5a`
- Latest delivery commit: `0e70ed9` (`docs(w2): prepare assistant read UI slice`)
- Last verified remote checkpoint: `a3a5b81` on `origin/w2/frontend-bootstrap-readiness`
- Draft PR: `#8` targeting `w4/security-baseline`
- State: application bootstrap inspected; canonical telecom integration gate not yet passed

## Done

- Verified the only writable remote is `Asier-Comba/CRM-Telecomunicaciones`.
- Confirmed the initial repository skeleton had no `main` or application before W1 published its bootstrap branch.
- Read and accepted the W4 security, release, observability and CI gates.
- Preserved the previous W2 work locally outside the historical repository.
- Classified the previous frontend work for selective adaptation instead of blind cherry-picking.
- Defined the frontend bootstrap and migration contract in `docs/master/W2_FRONTEND_BOOTSTRAP.md`.
- Defined testable product/UX acceptance criteria in `docs/master/W2_UX_ACCEPTANCE.md`.
- Reviewed W3 `AssistantResponse` at `97e64d3` and published the structured UI handoff in `W2_HANDOFF_W3_ASSISTANT_UI.md`.
- Defined the Customer 360 information architecture, section state model and exact W1 presentation needs in `docs/master/W2_CUSTOMER_360_SPEC.md`.
- Converted the historical god-component audit into the P0/P1/P2 migration inventory in `docs/master/W2_HISTORICAL_UI_MIGRATION.md`.
- Defined semantic tokens, primitive behavior, navigation and test boundaries in `docs/master/W2_UI_FOUNDATION.md`.
- Defined the dashboard Command Center composition, data projections and metric admission gate in `docs/master/W2_DASHBOARD_COMMAND_CENTER.md`.
- Reviewed W1 application bootstrap provenance/configuration at `0dd2f14` and published the canonical integration gate.
- Defined W3 response consumption, renderer boundaries, confirmation gates and test fixtures in `docs/master/W2_ASSISTANT_RENDERER_SPEC.md`.
- Audited the W1 bootstrap primitives/shell and published the exact P0/P1 refactor sequence in `docs/master/W2_BOOTSTRAP_UI_GAP_PLAN.md`.
- Cross-walked the bootstrap client type/page into safe Customer 360 migration slices in `docs/master/W2_CUSTOMER_360_BOOTSTRAP_CROSSWALK.md`.
- Reviewed W1 `61848cf`: canonical tenant identity/RLS now exists, while telecom domain/read contracts and W4 base acceptance remain open.
- Prepared the exact Customer 360 Identity + Attention implementation slice in `docs/master/W2_CUSTOMER_360_SLICE_1.md`.
- Prepared Dashboard Command Center slice 1 with per-widget source/state/navigation/freshness requirements in `docs/master/W2_DASHBOARD_SLICE_1.md`.
- Split assistant UX into READ versus W4-gated mutation work and published READ fixtures in `docs/master/W2_ASSISTANT_READ_UI_SLICE.md`.
- Published and SHA-verified `origin/w2/frontend-bootstrap-readiness` in the canonical repository.
- Opened draft PR `#8` for review without assuming or merging into a future `main`.

## Doing

- Preparing feature boundaries, validation expectations and the smallest safe migration slices for the canonical base.
- Coordinating the assistant renderer contract with W3 without duplicating planner or authorization logic.
- Holding integration until W1 satisfies the exact gate in `W2_HANDOFF_W1_CANONICAL_GATE.md`.
- Incorporating W4's assistant confirmation, idempotency and closed-output findings into the W2 renderer contract.
- Preparing the first tested UI-foundation commits against the concrete W1 bootstrap component surface without modifying it prematurely.
- Monitoring W1 PR `#11`: it remains draft/unreviewed and its `61848cf` Secret scan check currently fails.
- Asking W3 to mark the stable READ subset and validate W2's synthetic fixtures; Issue `#10` keeps mutation UI excluded.
- Asking W4 to close the auth/logging/PII questions in `W2_HANDOFF_W4_FRONTEND_GATES.md` before runtime integration.

## Next

1. Re-review W1 when it publishes canonical migrations and customer/contract/dashboard contracts.
2. Rebase/replay this branch only after W1 meets the gate and W4 accepts the integration base.
3. Adapt the accessible field and loading/error primitives as separate tested commits.
4. Implement Dashboard slice 1 from `W2_DASHBOARD_SLICE_1.md` against W1-backed projections.
5. Implement Customer 360 Identity + Attention from `W2_CUSTOMER_360_SLICE_1.md`.
6. Apply the acceptance contract and collect responsive/accessibility evidence.

## Required contracts

### W1

- Exact accepted integration commit and supported Node/package-manager versions.
- Authenticated workspace/user presentation contract for the shell.
- Versioned read models for company/customer, contacts, assignee, services, lines, operator, contracts, permanence and renewal.
- Pagination, search, filter, loading, error and empty semantics for list endpoints.
- Dashboard query/read model with source-backed tasks, meetings, renewals, permanence alerts and opportunities.
- Dashboard envelope and section projections detailed in `docs/master/W2_DASHBOARD_COMMAND_CENTER.md`.
- Customer 360 presentation needs and action semantics detailed in `docs/master/W2_CUSTOMER_360_SPEC.md`.

### W3

- Close the additive UI-contract items in `W2_HANDOFF_W3_ASSISTANT_UI.md`: envelope version, canonical navigation/entity taxonomy, confirmation lifecycle, safe notices, continuation and streaming.
- Keep deep links as closed route descriptors resolved by W2, never arbitrary model URLs.

### W4

- Confirm which branch is the integration base until protected `main` exists.
- Confirm the canonical unit/component test runner once the Node app lands.
- Review auth, RLS, sensitive logs and assistant confirmations as release gates, not frontend responsibilities.
- Respond to `W2_HANDOFF_W4_FRONTEND_GATES.md` on route authorization, browser telemetry, PII masking and evidence requirements.

## Handoffs

- **W2 → W1:** close `W2_HANDOFF_W1_CANONICAL_GATE.md`; app plus tenant identity remain insufficient while customer/contract/dashboard contracts and W4 acceptance are absent.
- **W2 → W3:** READ candidate reviewed through `7be1e8f`; mark the stable subset and respond to `W2_HANDOFF_W3_ASSISTANT_UI.md` before W2 integrates streaming or any confirmation UI.
- **W2 → W4:** the frontend will preserve server-side authorization boundaries, avoid sensitive client logs and add responsive/accessibility evidence to PRs.

## Blockers

- W1 now has a Next.js application and canonical tenant-identity migration, but customer/contract/dashboard contracts remain unpublished.
- W4 has not accepted W1 PR `#11` / `61848cf` as the canonical integration base; the PR is unreviewed and Secret scan is failing.
- W3 has published a usable v1 UI contract; the additive integration questions are now explicit rather than blocking all presentation work.
- The historical repository is read-only and is not a delivery target.

## Validation evidence

- `bash scripts/ci/detect-project.sh`
- `bash scripts/ci/check-migrations.sh`
- `bash scripts/ci/test-guardrails.sh`
- GitHub PR `#8` checks at `b6f0070`: migration policy, baseline guardrails, secret scan, dependency review and Node quality gate passed; critical Playwright correctly skipped because no application exists.
- GitHub PR `#11` read-only review at `61848cf`: quality, migration, guardrails and dependency checks pass; Secret scan fails and no review is recorded, so W2 integration remains blocked.

Application typecheck, lint, unit tests and build remain inapplicable on this documentation-only branch until it is safely rebased onto the accepted canonical application.
