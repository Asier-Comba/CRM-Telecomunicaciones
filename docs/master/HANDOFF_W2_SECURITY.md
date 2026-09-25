# W4 → W2 security handoff

- Date: 2026-09-25
- W2 reviewed head: `eabb342`
- W2 CI evidence: run `#40` green
- Scope: frontend authorization, browser telemetry, PII and assistant READ UI
- Gate: policy is ready; runtime integration still waits for an accepted W1 base

## Authorization and protected navigation

1. **Workspace resolver:** no implementation is accepted yet. W1 must publish one server-only
   resolver that authenticates the session, loads an active `workspace_members` row and derives
   the allowed workspace/resource. W2 must depend on that contract and must not accept a browser
   workspace ID as authority.
2. **Existence privacy:** entity routes return the same external not-found response for absent and
   unauthorized resources. Server telemetry may distinguish a stable denial code without logging
   the resource or customer payload.
3. **Membership changes:** authorization is re-evaluated on every server request. Authorization-
   sensitive responses are not shared-cacheable; cache keys include actor and workspace. Removal,
   suspension, role change or workspace switch invalidates the affected server cache and the next
   denial forces W2 to discard protected client state before navigation.
4. **Module discovery:** only global non-tenant help/marketing surfaces are discoverable without a
   capability. Tenant modules, integrations, counts and entity destinations require an active
   membership plus a server-issued capability. Hiding remains UX defense in depth, not auth.

## Logging and browser telemetry

5. The approved client allowlist is: contract version, closed safe status/error code, block kind,
   opaque request correlation ID, duration bucket and retry outcome. Release version and
   environment may be added by trusted build configuration. No prompt, answer, entity label/ID,
   contact field, workspace ID, URL/query, payload, token or provider detail is allowed.
6. A validated opaque correlation ID may be shown to the user. It must be random, bounded, contain
   no tenant/user/time encoding and grant no lookup capability.
7. The reporting vendor is not selected. W2 must use one application wrapper that accepts only the
   allowlisted envelope. Client and ingestion boundaries both redact/reject unknown keys. No vendor
   browser SDK or session replay is enabled before W4 reviews destination, retention, sampling,
   source maps and data-processing settings.

## PII and sensitive presentation

8. Lists, search suggestions, notifications and screenshots use masked/minimal projections. Full
   CIF, email, phone, contract/line identifiers and document metadata require an explicit
   field-level server capability on the entity response. Search stays server-side and returns
   authorized minimal results; the browser never downloads a tenant directory to filter locally.
   Document filenames, free-text metadata and provider identifiers are treated as sensitive.
9. Copying full contact, tax, contract, line or document values requires a separate `pii:copy`
   capability and emits a server-side audit event containing actor, workspace, entity type, field
   class, timestamp and outcome—never the copied value. Bulk export uses a separate capability and
   stronger audit/rate-limit policy.
10. Tests and screenshots use obviously synthetic fixtures only: reserved domains, non-routable
    identifiers, invented names and deterministic IDs. Production exports and merely anonymized
    customer rows are forbidden in source control and CI artifacts. Failure screenshots/traces are
    retained only after automatic redaction is proven; otherwise they are disabled for sensitive
    flows.

## Assistant READ UI

11. Yes: when `grounded=false`, entity/table/evidence blocks are omitted. Safe answer text may be
    shown with a visible limitation only after the closed response validator accepts it.
12. Yes: unknown entity/navigation descriptors remain non-interactive. Telemetry records only the
    supported contract version and a closed `unsupported_descriptor` code—not the descriptor value.
13. Never render or log system/developer prompts, chain-of-thought/reasoning, tool arguments/results,
    provider payload/errors, arbitrary URLs/HTML, credentials, authorization inputs, workspace/user
    selectors, hidden provider IDs or fields outside the closed READ schema.

## QA evidence

14. The accepted base must expose canonical package scripts before the runner is final. Minimum
    tooling contract: component/unit tests through the repository `test` script, automated axe
    assertions on critical states, and Playwright for route/auth/responsive flows. W2 must not add a
    parallel package manager or bypass W4's production-deny E2E guard.
15. A W2 runtime PR must include: green lint/types/tests/build; validator fixtures; keyboard and
    focus tests; axe evidence; 320/375/768/1024/1440 viewport coverage; forbidden/not-found parity;
    membership removal and workspace-switch invalidation; PII masking/copy-capability tests; log
    capture proving forbidden fields absent; and non-production Playwright evidence for changed
    critical routes.

## Acceptance boundary

These decisions authorize W2 to continue specifications and synthetic fixtures. They do not approve
runtime integration, W1's current authorization implementation, assistant mutations or production
telemetry. Any exception requires a new versioned finding with risk and acceptance criteria.
