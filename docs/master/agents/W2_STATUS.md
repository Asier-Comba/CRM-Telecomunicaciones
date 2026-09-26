# W2_STATUS — Frontend, UX & Product Experience

- Updated: 2026-09-26
- Branch: `w2/frontend-bootstrap-readiness`
- Audit-trail base: `w4/security-baseline` at `4ef9a5a`
- Latest delivery commit: `6fdc9b2` (`test(w2): add UI state acceptance fixtures`)
- Last verified remote checkpoint: `d1df763` on `origin/w2/frontend-bootstrap-readiness`
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
- Read W4 `e33a07f` and its 15 explicit frontend security decisions in `HANDOFF_W2_SECURITY.md`.
- Read W3 `a57641a`: `AssistantResponse` v1 READ structures are stable; canonical entity/module taxonomy remains a W1 dependency and mutation release remains gated by Issue `#10`.
- Published and SHA-verified `origin/w2/frontend-bootstrap-readiness` in the canonical repository.
- Opened draft PR `#8` for review without assuming or merging into a future `main`.

## Doing

- Translating `telecom.v0` into exact W2 candidate presentation interfaces and adapter/state-machine fixtures without copying backend rows into components.
- Preparing closed route descriptors, accessibility assertions and responsive evidence contracts for immediate transport to the accepted base.
- Holding integration until W1 satisfies the exact gate in `W2_HANDOFF_W1_CANONICAL_GATE.md`.
- Applying W4's browser telemetry allowlist, PII field-capability policy, not-found parity and membership-invalidation requirements to W2 artifacts.
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

- **W2 → W1:** `telecom.v0` is accepted as a presentation starting point; the exact missing/ambiguous fields above must be resolved before Customer 360 and action-rich Dashboard implementation.
- **W2 → W3:** READ v1 is accepted for renderer preparation; W2 will not hardcode entity taxonomy or enable confirmation actions while W1/W4 gates remain open.
- **W2 → W4:** all 15 frontend security answers are accepted as binding defaults; runtime evidence will cover telemetry, PII, authorization invalidation, keyboard, axe and responsive states.

## Blockers

- W1 PR `#13` supersedes PR `#11` operationally, but W4 rejects `75c2103` as sanitized/canonical: historical values remain reachable, strict schema drift fails, tenant resolution is not application-wide and RLS evidence is static.
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
- W4 `e33a07f`: PR `#13` is explicitly not an accepted integration base; W2 has no new runtime blocker.
- W3 `a57641a`: six checks pass/skip appropriately; Issue `#10` remains open with two W4 evidence comments.

Application typecheck, lint, unit tests and build remain inapplicable on this documentation-only branch until the reusable work is selectively transported onto a new branch from the accepted canonical application.
