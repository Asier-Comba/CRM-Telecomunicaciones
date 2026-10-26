# Unit 57 — only tear down an onboarding database created by this execution

Date: 2026-10-26. CLAIM: issue #67, comment 6413295950.

## Problem and provenance

The W5 onboarding race harness selected in unit 56 always entered `finally` and
called `dropdb --force`, even if `createdb` failed. The fixed database name could
therefore refer to a pre-existing database that this execution did not create.
This is a reproduced failure path, not a report of observed database loss.

Source: W5 `54feb851ab2f9e8f08a80395d0b7ba5269bb31cb`, selected as
`ef0851f176f00acfc6b0d4864262cd936fee105c`. Unit 56 checkpoint:
`acb70a692c7ccc07421c27f8815a9f2a91287232`, tree
`90954e20d08beb5db24b29aa375c8d651f0dfbb6`. Product base remains #175
`f9aa469bec768ad73572a2f462f1f1505e6791a5`.

This follow-up deliberately patches the selected script: its blob is no longer
identical to the W5 original after this unit. The unit 56 four-blob identity claim
describes the recorded unit 56 checkpoint only. The SQL, concurrency assertions,
image check, 45-second process bound and outer disposable-container lifecycle
are unchanged. No product source or migration changes.

## Minimal change

Record successful creation before running SQL. Only that recorded success permits
database teardown. A failed creation or launch never claims ownership or emits
`ONBOARDING NATIVE RACES TEARDOWN PASS`. A later SQL failure still tears down the
owned database. A failed teardown still fails the harness.

If the creation outcome is uncertain, this code intentionally does not attempt a
destructive cleanup of an unowned name; the existing outer disposable CI container
teardown remains responsible for its resources.

## Causal regression

`tests/platform/native-onboarding-cleanup.test.mjs` executes the actual, unmodified
module bytes through Node's VM module loader, substituting the Docker process and
filesystem boundaries. The child process uses `--experimental-vm-modules`; normal
platform test invocation requires no additional flag or package. The simulator
does not run Docker, SQL, a provider or a network request. These results prove
failure-path ownership behavior, not native PostgreSQL acceptance.

| Scenario | Before guard | After guard |
| --- | --- | --- |
| `createdb` returns failure for an existing name | FAIL: unwanted `dropdb --force` | PASS: no drop, no teardown PASS |
| creation process emits an error | FAIL: unwanted `dropdb --force` | PASS: original error, no drop |
| creation succeeds, bootstrap SQL fails | PASS: one drop of owned name | PASS: one drop of owned name |
| owned teardown fails | PASS: error, no success marker | PASS: error, no success marker |

Commands and results on Node 24.20.0:

- `node --test tests/platform/native-onboarding-cleanup.test.mjs`: before **2 PASS / 2 FAIL**; after **4 PASS / 0 FAIL**.
- `node --test tests/platform/*.test.mjs`: **113 PASS / 0 FAIL / 1 SKIP** (Docker unavailable locally).
- `node --check scripts/security/native-postgres/onboarding-provision-races.mjs`: PASS.
- ESLint on the changed script and regression file: PASS.
- `git diff --check`: PASS.

The independent tests assert the observable process calls and outcome markers;
they do not inspect the spelling of the ownership guard. The full native happy
path for this changed source must be proved by its own CI after composition.
Unit 56 native/browser results are historical evidence for its exact checkpoint,
not inherited proof for this change.

## Acceptance and ownership

IMPLEMENTADO / TESTED_LOCAL. TESTED_NATIVE and TESTED_BROWSER on the follow-up
source remain pending its own remote CI. TESTED_HOSTED: NOT_RUN.
W4_ACCEPTED: PENDING; W5 review requested on the same Draft integration PR #191.
No new PR, deployment, staging write, authentication recovery, migration, cost,
AI provider call or release authorization is implied. Presentation resources
remain protected. Final source SHA/tree and run IDs are recorded in the PR and
issue after commit, avoiding a self-referential source claim here.
