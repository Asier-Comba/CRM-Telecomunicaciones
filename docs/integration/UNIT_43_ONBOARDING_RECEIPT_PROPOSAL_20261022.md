# Onboarding receipt contract proposal — 22 October 2026

Claim: issue67/6339241654. Branch
`codex/onboarding-receipt-contract-proposal-20261022`, from commercial candidate
`f9aa469bec768ad73572a2f462f1f1505e6791a5`.
**NOT adopted into PR175. Backend-owner W1 and independent W4 review pending.**
No silence, local test or author decision is treated as shared-contract acceptance.

## Concrete owner decision

The current route returns200 for null/empty successful RPC data and201 for an
invalid-ID row. These were controlled malformed RPC results, NOT an observed
Supabase failure, authorization bypass or real provisioning effect.

Propose validating the existing single `provision_workspace` result before
acknowledging: UUID, nonblank bounded name, canonical bounded slug, current schema
role owner/admin/member/viewer and boolean created. Accept the existing single-row
array and single-object result; retain201new/200existing and all valid response
fields. Project only the canonical five fields. Reject multiple rows or malformed
results with **502**, code **onboarding_unconfirmed**, and a safe fixed message.
This error does NOT imply rollback; the server never repeats the RPC.

The existing selected181UI already treats5xx as uncertain and offers only explicit
access reads while mounted. This proposal neither creates a new read endpoint nor
claims durable recovery across reload. W1 must accept/reject the status/code,
field constraints and recovery authority; no deployment or integration is implied.

Auth getUser precedes exactly one existing RPC; duplicate409/suspended403,
unauthenticated401 and unconfigured503 semantics remain unchanged. No SQL,
RLS/grants, privileged key, workspace selector, provisioning policy, AuthGate,
provider or platform change. No authorization is inferred from response shape.

## Evidence on this proposal

Original QA38test/followup selected with author attribution:
`9cec6aeb`→`cb5c595`, `2cf8bcd7`→`adf4564`.
Own original baseline6PASS/3FAIL preserved. Extended handler baseline10PASS/
12FAIL of22; no removed assertion, retry, security condition or longer timeout.

Handler code `2562ebd6d25a31b7b41d962de16942c0c8e45992`,
tree `a369e3c1ba24f7ecc6a4c2d651bc36e780ac4c09`:
- Actual handler/NextResponse with controlled Auth/RPC:22/22PASS.
- Existing atomic-onboarding source controls:3/3PASS; combined25PASS/0FAIL/0SKIP.
- Focused lint, TypeScript and defaultbuild44routes PASS, exit0.

Bridge source `d8f9d9d627361189f89ca4788061b04bfa39bbfb`,
tree `52d402ee1fa2a313f08204dd60fd270571bbdaf2` adds only a test:
- Actual UI→actual handler/NextResponse, injected Auth/RPC and controlled SDK:
  **15/15PASS**, null/empty/invalid-ID/new/existing at390/768/1440.
- Each case asserts one POST and exactly getUser→provision_workspace once;
  uncertain results permit explicit reads without another POST and later route
  only after a positive controlled membership read. No page errors.
- Retries0/skips0/timeouts0. Final focused lint and TypeScript PASS.
- Initial bridge collection failed because import.meta is unsupported in this
  Playwright CommonJS context; the harness was corrected using package-relative
  createRequire. Original attempt retained; no product assertion changed.

These40checks are separate from candidate175's158local/940CI UI and its own real
Supabase run. They do NOT prove Auth/DB transactions, isolation, durable idempotency,
hosted behavior or no already-committed effect. No full green suite is transferred.
The final documentary source/tree and review URL are recorded in issue67.

## Handoff and next3

1. W1 decide and review this precise502/receipt proposal and publish canonical
   authenticated recovery/absence/suspension semantics across reload.
2. W4 independently review authorization, no-rePOST and safe uncertainty; W5
   provide an authorized disposable physical test before any hosted consumption.
3. Integrator selects only accepted deltas into a fresh single commercial
   successor and reruns relevant controls; never treat this branch as a release.

Commercial candidate remains175/f9aa. No main merge, real account/workspace,
live RPC, invoice, customer, production, deployment, secret or paid provider was
used. Budget0EUR, AI business writesOFF, StorageOFF, RELEASE_NOT_ACCEPTED.
