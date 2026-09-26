# W2_STATUS — Frontend, UX & Product Experience

- Updated: 2026-09-26
- Branch: `w2/frontend-bootstrap-readiness`
- Audit-trail base: `w4/security-baseline` at `4ef9a5a`
- Latest delivery commit: `7937cbb` (`fix(w2): detach and bound client telemetry`)
- Last verified remote checkpoint: `7937cbb` on `origin/w2/frontend-bootstrap-readiness`
- Draft PR: `#8` targeting `w4/security-baseline`
- State: W1 `telecom.v0` contracts published; runtime integration remains blocked by W4 rejection of PR `#13`

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
- Published the W4 auth/logging/PII frontend gate questions and refreshed the W3 READ-contract handoff against `7be1e8f`.
- Synced the `eabb342` milestone and open W1/W3/W4 requests in the existing accessible `CRM TELECOM-MASTER` handoff thread; the shared `W2 listo para UI` conversation remains inaccessible to this session.
- Reviewed W4 `27e1e42`: no W2 runtime/security blocker was found; server-side workspace resolution, protected navigation, security headers and error/PII handling remain explicit integration review gates.
- Added 14 transport-neutral Customer 360 and Dashboard UI-state acceptance fixtures without defining W1 fields, enums or endpoints.
- Reviewed superseding W1 candidate `w1/bootstrap-sanitized@75c2103`, PR `#13`, `telecom.v0` contracts and tenant authorization contract.
- Accepted W1's customer/company, contract, service/line and dashboard types as a stable presentation starting point; SQL/domain implementation remains draft.
- Read W4 through `10ee3aa`, including its 15 explicit frontend security decisions and executable observability-safety gate.
- Read W3 `874259e`: `AssistantResponse` v1 READ structures are stable; canonical entity/module taxonomy remains a W1 dependency and mutation release remains gated by Issue `#10`.
- Added an executable, transport-neutral W2 presentation contract with closed route descriptors, sensitive-field states and fail-closed section transitions.
- Reconciled all nine assistant READ cases with W3's executable matrix and added streaming interruption/cancellation plus stale-continuation fixtures.
- Published the concrete W1 `telecom.v0` acceptance/missing-field/ambiguity review in `W2_REVIEW_W1_TELECOM_V0.md`.
- Defined server-first Customer 360 and Dashboard component boundaries with small capability-driven client islands.
- Added a machine-checked responsive/accessibility/visual QA matrix for 320/375/768/1024/1440 px and synthetic state coverage.
- Added a semantic design-token and primitive contract without locking concrete values before the accepted Tailwind/theme base.
- Added an architecture-only assistant mutation state machine: blocked by default, exact opaque confirmation reuse, expiry/cancel/conflict/failure and status-only reconciliation.
- Incorporated W4 `106848a` immediately: closed route IDs now reject path, query, fragment, percent-encoding, whitespace and control syntax while retaining URL-safe opaque IDs.
- Added a closed browser-telemetry validator that rejects customer/workspace/entity IDs, URLs, prompts, answers, payloads, provider details and unknown codes before vendor integration exists.
- Added an executable W1 `telecom.v0` → W2 Dashboard adapter candidate: it preserves section freshness/errors, fails closed on unknown statuses and unsafe IDs, redacts provider errors, avoids false completeness and does not invent renewal/permanence deep links.
- Added an executable Customer 360 identity adapter candidate: it verifies the server-resolved workspace, distinguishes missing from unauthorized sensitive fields, strips raw CIF/email/phone values and keeps unpublished attention sections explicitly unsupported rather than falsely empty.
- Incorporated W4 `48cfd14`: browser telemetry now returns a detached frozen projection, admits only catalogued/bounded contract versions and rejects mutation, oversized, secret-shaped and non-finite variants.
- Published and SHA-verified `origin/w2/frontend-bootstrap-readiness` in the canonical repository.
- Opened draft PR `#8` for review without assuming or merging into a future `main`.

## Doing

- Extending the `telecom.v0` presentation seam without copying backend rows into components; Dashboard v0 is covered and Customer 360 attention remains blocked on the missing W1 projection.
- Preparing closed route descriptors, accessibility assertions and responsive evidence contracts for immediate transport to the accepted base.
- Holding integration until W1 satisfies the exact gate in `W2_HANDOFF_W1_CANONICAL_GATE.md`.
- Applying W4's PII field-capability, not-found parity and membership/workspace invalidation requirements to W2 artifacts; the `48cfd14` telemetry P1 is fixed at `7937cbb`.
- Monitoring superseding W1 PR `#13` at `75c2103`; CI is green, but W4 has `CHANGES_REQUESTED` and explicitly rejects it as sanitized/canonical.
- Keeping assistant mutation/confirmation UI release-disabled while Issue `#10` remains open; preview architecture may be specified but not wired.

## Next

1. Publish candidate TypeScript presentation interfaces, closed navigation descriptors and UI state machines against `telecom.v0`.
2. Expand fixture-driven acceptance for Customer 360, Dashboard and Assistant READ interruption/continuation states.
3. Review every W1 contract delta for missing fields, ambiguity, breaking changes or acceptance.
4. When W4 names an accepted W1 SHA, create `w2/ui-integration-v1` from it and selectively transport reusable W2 artifacts.
5. Implement primitives/accessibility, shell, dashboard boundary and Customer 360 Identity + Attention as separate tested commits.

## Required contracts

### W1

- Exact W4-accepted integration SHA and clean canonical migration chain.
- Accepted application-wide tenant resolver and shell/session presentation projection; current team-only adoption is insufficient.
- Customer attention projection for tasks, meetings, alerts and recent activity; `CustomerCompanyV0` currently covers identity/contact/assignee only.
- Contract/service collections with completeness, pagination and freshness semantics for Customer 360.
- Dashboard item discriminators and widget-specific fields; generic `DashboardItemV0.status: string` is not exhaustive enough for status/urgency claims.
- Dashboard pagination/window/freshness SLA and per-action capability descriptors, which remain draft.
- Field-level reveal/copy capabilities for CIF, contact methods, contract/line identifiers and document metadata.

### W3

- Keep the stable v1 READ subset and streaming final-event rule compatible while W2 builds the renderer seam.
- Publish canonical module/entity taxonomy only after W1 route/entity taxonomy is accepted.
- Keep deep links as closed descriptors resolved by W2; unknown descriptors remain non-interactive.

### W4

- Name the exact W1 SHA apt for frontend integration after secret/history, tenant authorization, schema and clean-CI gates close.
- Re-review W2 runtime against the 15 decisions in `HANDOFF_W2_SECURITY.md`.
- Keep assistant mutation UI release-gated until Issue `#10` closes with durable integration evidence.

## Handoffs

- **W2 → W1:** `telecom.v0` is accepted as a presentation starting point; `W2_REVIEW_W1_TELECOM_V0.md` records the minimum additive fields and ambiguities required before action-rich Customer 360 and Dashboard implementation.
- **W2 → W3:** READ v1 is accepted for renderer preparation; W2 will not hardcode entity taxonomy or enable confirmation actions while W1/W4 gates remain open.
- **W2 → W4:** all 15 frontend security answers are accepted as binding defaults; runtime evidence will cover telemetry, PII, authorization invalidation, keyboard, axe and responsive states.

## Blockers

- W1 PR `#13` supersedes PR `#11` operationally, but W4 rejects `75c2103` as sanitized/canonical: historical values remain reachable, strict schema drift fails, tenant resolution is not application-wide and RLS evidence is static.
- W4 `48cfd14` proves an additional P0 in the tenant helpers carried by `75c2103`: active memberships remain authorizing when the owning workspace is suspended.
- W4 has not named any SHA apt for frontend integration; therefore `w2/ui-integration-v1` must not yet be created.
- `telecom.v0` lacks several Customer 360 attention/action and widget-specific semantics required for final UI implementation.
- W3 READ UI can advance, but Issue `#10` remains open for durable mutation safety and output-value redaction.
- The historical repository is read-only and is not a delivery target.

## Validation evidence

- `bash scripts/ci/detect-project.sh`
- `bash scripts/ci/check-migrations.sh`
- `bash scripts/ci/test-guardrails.sh`
- `jq empty docs/master/fixtures/W2_CUSTOMER_DASHBOARD_UI_STATE_FIXTURES.json`
- Fixture audit: seven Customer 360 scenarios, seven Dashboard scenarios and unique scenario IDs.
- GitHub PR `#8` checks at `eabb342`: migration policy, baseline guardrails, secret scan, dependency review and Node quality gate passed; critical Playwright correctly skipped because no application exists.
- GitHub PR `#8` checks at `6fdc9b2`: the same six checks completed successfully/appropriately skipped after the UI-state fixture delivery.
- GitHub PR `#13` at `75c2103`: six checks pass/skip appropriately, but W4 review is `CHANGES_REQUESTED`; generic Secret Scan green does not override W4's direct reachable-history evidence.
- `node --experimental-strip-types --test docs/master/contracts/*.test.ts`: 51/51 pass.
- GitHub PR `#8` at `283c14d`: six checks pass/skip appropriately; W4's merged-baseline guardrail job executed all six W2 contract-test files, including route-ID and telemetry negatives, and reported documentation contract tests passed.
- W4 `106848a`: PR `#13` is explicitly not an accepted integration base; docs-contract CI is now enforced and the route-ID finding has been fixed by W2.
- W3 `874259e`: stable READ subset and nine-case compatibility matrix published; Issue `#10` remains open for durable mutation integration.
- Dashboard adapter fixture evidence at `ffb9eb1`: six synthetic cases cover bounded completeness, closed task navigation, non-interactive renewal IDs, unknown status/ID rejection, source-error redaction and invalid freshness.
- Customer identity adapter evidence at `b559a54`: seven synthetic cases cover PII omission, missing-vs-hidden semantics, partial unsupported sections, cross-workspace denial, primary-contact ambiguity/absence and invalid IDs/freshness.
- W4 `48cfd14` adds an executable tenant-isolation harness and identifies workspace suspension as a P0 W1 blocker; inspection confirms the same helper gap remains in `w1/bootstrap-sanitized@75c2103`.
- Telemetry adversarial evidence at `7937cbb`: detached/frozen output plus unregistered, oversized, secret-shaped and non-finite version negatives pass in the 51-test suite.

Application typecheck, lint, unit tests and build remain inapplicable on this documentation-only branch until the reusable work is selectively transported onto a new branch from the accepted canonical application.
