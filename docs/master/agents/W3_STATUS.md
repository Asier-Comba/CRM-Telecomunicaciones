# W3 status — AI, assistant and integrations

- Updated: 2026-09-26
- Branch: `w3/assistant-runtime-foundation`
- Pull request: `#9` targeting `w4/security-baseline` — **DRAFT, do not merge**
Latest code checkpoint: `d510bed` (`feat(assistant): add reconciliation and output boundaries`)

## Isolation gate

The W3 foundation remains isolated. It will not be merged, rebased onto the product candidate or wired into application routes until there is one W1 base accepted for integration with telecom contracts and a reviewed workspace/authorization boundary.

W3 read `w1/bootstrap-sanitized@75c2103`, including W1's `telecom.v0` read contracts and membership resolver. This is useful published input, but it is not yet an accepted canonical base: W4 has `CHANGES_REQUESTED`, reports secret-history/schema/auth discrepancies and has not accepted its RLS evidence. W3 therefore did not invent adapters or register production telecom capabilities in this cycle.

## Delivered in this cycle

- Capability contract version 3 requires explicit raw-provider-to-DTO output projection and a declared high-confidence secret-value scan policy.
- Projected outputs still traverse recursive closed/bounded schemas; secret material in otherwise allowed strings is rejected before model/UI exposure.
- Idempotency reservations now carry a five-minute lease. Unknown post-effect completion remains pending during the lease, then fails closed as `reconciliation_required`; it is never re-executed automatically.
- Confirmation cancellation-store failure returns a bounded retryable result and redacted audit reason.
- Audit-sink failure returns a bounded retryable result. A completed write remains replayable and is not executed twice on retry.
- W2's nine READ fixtures were reconciled into `evals/ui/assistant-read-contract.v1.json` and execute in the unit suite.
- Stable READ UI scope and strict decisions for taxonomy, truncated tables, ungrounded evidence and prompt-only follow-ups are documented for W2.
- W4 receives an updated review handoff that distinguishes framework behavior from still-missing durable/cross-process evidence.

## Adversarial evidence

The 37-test suite now includes:

- prompt injection, hallucinated capabilities and invalid structured plans;
- nested workspace selectors, arbitrary SQL/URL-shaped arguments and forged resource IDs;
- unknown-versus-unauthorized non-enumeration;
- invented, altered, expired, cancelled, replayed and cross-tenant confirmations;
- twenty concurrent duplicate writes with one effect;
- twenty distinct valid confirmations raced under one idempotency key with one effect;
- reservation-store failure before the handler with zero effects;
- post-effect completion uncertainty, lease expiry, explicit reconciliation and replay without a second effect;
- cross-actor idempotency conflict and independent cross-workspace operation;
- cancellation-store and audit-sink outages;
- output projection failures, unknown/sensitive keys, secret values and oversized output;
- all nine W2 READ response compatibility decisions.

## Cross-work coordination

### W1

Read the latest sanitized candidate and its published tenant/telecom v0 material. No capability adapter was connected because the branch remains a rejected candidate rather than the accepted base requested by the isolation gate. Once W1/W4 publish the accepted commit, W3 will map exact service/read-model contracts instead of copying conceptual eval names.

### W2

Read `origin/w2/frontend-bootstrap-readiness@d1df763`. `AssistantResponse` v1 READ envelope, safe notices, tables, prompt-only follow-ups and final-event streaming are stable. Entity/navigation blocks remain conditional on the injected W1 taxonomy. Mutation controls remain disabled. Detailed alignment is in `W3_HANDOFF_W2_UI.md` and `W3_REVIEW_W2_READ_FIXTURES.md`.

### W4

Read `origin/w4/security-baseline@e33a07f` and its latest assistant revalidation. The three independent framework findings—stuck completion state, uncaught cancellation outage and secret material in allowed values—are addressed with direct tests. Durable stores, crash/restart/outbox behavior, live RLS and production authentication remain open release gates and are not claimed.

## Known blockers

- W1 has published a candidate identity/telecom v0 design, but W4 has not accepted a canonical integration base, schema/RLS chain or authorization evidence.
- No durable confirmation/idempotency adapter or cross-process/restart test environment exists.
- No test Supabase environment is available; W3 makes no live RLS claim.
- Dependency Review is still a repository-owner configuration blocker: the job wrapper is green while the actual dependency-review step is skipped. The owner must enable Dependency Graph and `DEPENDENCY_REVIEW_ENABLED=true`. W3 will not bypass this control; npm audit remains additive evidence only.
- PR #9 remains draft and `CHANGES_REQUESTED`; it must not be merged.

## Validation evidence

- `npm run lint`: pass (12 TypeScript files).
- `npm run typecheck`: pass.
- `npm test`: 37/37 pass.
- `npm run build`: pass through the test build plus the final gate.
- W2 compatibility matrix: 9/9 expected accept/reject decisions pass.
- No merge, deployment, Supabase mutation or production action performed.
