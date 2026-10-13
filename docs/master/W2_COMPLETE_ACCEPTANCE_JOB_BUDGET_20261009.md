# W2 — Complete acceptance job budget

Owner: W2 acceptance orchestration. Candidate based on PR #86, source `b11cc7ba880b1a056756f68cf705ed72d2776eff`.

The complete Supabase job includes dependency installation, the production build, Chromium and PDF renderer installation, a disposable real Supabase stack, Auth/PostgREST/Storage checks, persisted assistant history, 107 product journeys, teardown and artifact upload. Its configured 25-minute deadline has repeatedly truncated this work.

## Measured evidence

- PR #84 source `428d92b79856f1af1ad116c00ac062b46dceabf5`, execution `47bf34a0189a8d0ba977e61e548fef09f3c62941`, run `37942527163`, job `113860292410`: started at 14:13:07 UTC and cancelled at 14:38:29 UTC on 2026-10-09. The retained safe artifact `11624420101` contains the final report written at 14:38:20 UTC: 107/107, Auth, persisted history and teardown PASS. The workflow conclusion remains CANCELLED; it is not a successful workflow. Desktop/tablet relation screenshots also require the separate visual correction in PR #84.
- PR #81 source `41d4f30a0ea6e03bdb96e6fb0076ca5eab1d579a`, execution `40a11803fd33e9be91f28c7beb0fbd9d8989b57e`, run `37944123989`, job `113865823916`: cancelled at the same 25-minute boundary. Its progress log contains 103 completed checks, all PASS, with the last at 14:51:14.922 UTC. There is no final report or confirmed teardown. Partial progress is not 107/107 acceptance.

## Bounded change

Only `jobs.local-platform.timeout-minutes` changes from 25 to 35. Ten minutes of bounded headroom allow the full sequence, cleanup and uploads to finish despite runner/install variability. This setting is the repository's job deadline, not a platform quota. The separate browser secret-boundary job keeps its existing 12-minute deadline.

All individual operation limits, assertions, test order, 107 check names, production build, authorization checks, CAS, idempotency, private-value checks, teardown logic and artifact policies remain byte-for-byte unchanged from the base source. No retry, suppression, mock success, dependency override or security exemption is introduced. AI business writes remain disabled; issue #10 and independent W4 approval remain pending.

## Validation and acceptance

Review the exact workflow diff and compare every non-document blob to the base: the workflow is the sole implementation change. Run the existing bootstrap guard suite against this candidate. The candidate still requires its own real-local run, an actual final 107/107 report, confirmed teardown and a SUCCESS workflow conclusion. A genuine failed check remains a failure even if the job now has enough time to report it. The previous financial/contact failures and cancelled runs remain in the evidence ledger.

This change does not adopt PR #82 or #84 product behavior. Their eventual composition needs its own complete run and fresh visual review. Production, main, VPS, DNS, external accounts and other Work ownership are unchanged.
