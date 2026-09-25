# W3 handoff — assistant control plane

Severity: **P0 release gate for assistant mutations**
Evidence: the repository contained no agent/tool implementation at W4 baseline creation.
Risk: prompt injection or hallucinated identifiers could cross tenant boundaries, invoke arbitrary integrations or perform unconfirmed writes.

## Required fix

- Define each tool with a strict schema and server-side capability check.
- Resolve workspace and resource ownership independently of model arguments.
- Replace arbitrary SQL/URL execution with parameterized operations and destination allowlists.
- Bind confirmations to user, workspace, action, canonical arguments and short expiry.
- Add idempotency keys and postcondition/audit events for mutations.
- Treat retrieved content, imports, webpages and tool output as untrusted prompt material.

## Acceptance criteria

- Prompt-injection tests cannot change workspace, tool, URL, SQL or confirmation state.
- Hallucinated and cross-tenant IDs return a stable denial without revealing existence.
- Replayed or altered confirmations fail.
- Retried writes are idempotent.
- The model cannot access service-role credentials or arbitrary network destinations.
- Every mutation emits a redacted audit event with actor, workspace, tool, outcome and correlation ID.
