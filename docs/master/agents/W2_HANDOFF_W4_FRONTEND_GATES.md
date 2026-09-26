# W2 → W4 handoff — frontend auth, logging and PII gates

- Date: 2026-09-25
- W2 branch: `w2/frontend-bootstrap-readiness`
- W4 source reviewed: `w4/security-baseline` at `5cb872c`
- Status: policy accepted and transport-neutral findings addressed; runtime integration still blocked on W1

## 2026-09-26 implementation evidence

- `64c9f8e`: external Dashboard/Customer DTOs now start as `unknown`, pass closed parsers, reject impossible calendar dates and never throw on malformed JSON. Dashboard policy rejects only the malformed section; it never silently drops an item.
- `068e1a6`: suspension/removal/session loss/revocation/logout purge all protected browser state. Workspace switch and role downgrade purge then require server reauthorization; old-epoch responses cannot repopulate data.
- `068e1a6`: W3 operation status is exact, detached, strict-date validated and correlated by server-issued `operationRef`; stale/late events and blind write retries are rejected.
- `63bb7cd`: contract/service/line DTOs have separate closed parsers and presentation models; foreign scope fails closed, display identifiers remain hidden and pagination completeness is not fabricated.
- Application-level axe, focus, responsive and Playwright evidence remains correctly deferred until W4 publishes an accepted W1 integration SHA.

## Known W4 gates already accepted by W2

- Do not integrate onto W1 until its sanitized base has fully green CI and W4 explicitly approves it.
- Active `workspace_members` is the tenant authorization source; browser-provided workspace IDs are not authority.
- Resource destinations and server loaders must reauthorize access.
- UI control visibility is not authorization.
- Raw provider/SQL/stack/prompt/payload detail must not reach product UI or client logs.
- Assistant mutations remain excluded while Issue `#10` is open.
- W3 capability outputs need closed bounded schemas and source redaction before being trusted by UI.
- Cross-tenant, role-removal and workspace-switch behavior must fail closed.

## W2 questions requiring explicit W4 response

### Auth and protected navigation

1. Which accepted server-side workspace resolver must W2 route loaders/query adapters call?
2. Should forbidden and not-found intentionally share the same external route behavior to avoid entity-existence leakage?
3. What cache invalidation is mandatory when membership/role changes while a page is open?
4. Which shell modules may be discovered versus completely hidden when a capability is absent?

### Logging and browser telemetry

5. Confirm the allowlist for client telemetry. W2 currently proposes only contract version, safe status/block kind, request correlation ID, timing and retry outcome—never message/answer/entity/contact content.
6. Confirm whether route/error boundaries may expose a request correlation ID to the user.
7. Confirm the approved client error-reporting mechanism and redaction responsibility.

### PII and sensitive presentation

8. Define display/masking/search constraints for CIF, contact email/phone, contract numbers, line identifiers and document metadata.
9. Define whether copying contact/contract values requires a separate capability or audit event.
10. Confirm what synthetic fixture policy W2 must enforce in component/E2E tests and screenshots.

### Assistant READ UI

11. Confirm whether `grounded=false` evidence blocks must be omitted as W2 currently specifies.
12. Confirm that unknown entity/navigation descriptors must remain non-interactive and unlogged except for safe type/version telemetry.
13. Identify any additional read-only assistant output fields that must never reach browser rendering/logging.

### QA evidence

14. Confirm the canonical component test runner and accessibility tooling after the base is accepted.
15. Confirm the minimum PR evidence for keyboard, responsive, PII/logging and authorization-sensitive frontend changes.

## W2 implementation defaults until response

- Fail closed on unsupported permission/entity/navigation states.
- Keep customer identity visible only when its authorized route projection succeeds.
- Omit sensitive optional data rather than infer permission.
- Keep errors generic and scoped; preserve safe recovery.
- Log no response payloads or customer data.
- Use synthetic fixtures only.
- Make all assistant mutation controls unavailable.

Please record accepted/default-changed items in `W4_STATUS.md` or a versioned handoff so W2 can bind them to implementation tests.
