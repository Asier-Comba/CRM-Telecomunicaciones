# Observability baseline

## Structured event envelope

Every server, job and integration event should include:

- UTC timestamp, severity and stable event name
- request/job correlation ID
- deployment commit/version and environment
- route/tool/job name and duration
- outcome plus stable error code
- pseudonymous actor ID and workspace ID only when needed for investigation
- external provider name and provider request ID where safe

Never log access/refresh tokens, cookies, authorization headers, API keys, raw prompts, full model output, message bodies, imported rows, arbitrary request bodies or database connection strings.

## Required signals

- authentication failures and membership/role denials
- cross-tenant access denials and invalid resource ownership
- rate-limit events
- assistant tool validation, confirmation, authorization and idempotency failures
- webhook signature/replay failures
- external integration errors and latency
- import/background-job lifecycle and dead letters
- migration/deployment version and health
- backup completion and restore-test evidence

## Minimum alerts

- sustained 5xx/error-rate increase
- authentication or authorization denial spike
- repeated webhook signature/replay failures
- background queue age or dead-letter growth
- backup failure or missing scheduled backup
- assistant mutation failures/confirmation bypass attempt

Alert payloads use counts and identifiers, not sensitive content.
