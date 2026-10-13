# Access-gate changes trigger the existing complete local acceptance

Observed104 sourcefe01f3869d494d954a6f086f019a07111fe2b79f changed AuthGate,
its component-effect tests and documentation. CI37985685245 started, but the
Supabase-local pull_request path filter did not include AuthGate, so no automatic
Auth/PostgREST/Storage/product-browser gate started. The same unchanged35minute
workflow was explicitly dispatched on the exact source as37985766380. This is
an observed routing omission, not a suite success or product-server diagnosis.

The existing pull_request filter now also covers src/components/AuthGate.tsx.
No workflow, fixture/runtime, dependency, command, credential, permission, timeout,
retry, oracle, check count/name or independent-job behavior is added or altered.
Ordinary pull-request updates to that protected entry component therefore run
the same disposable full suite as product integration changes. Unrelated docs
retain existing filtering. Explicit workflow_dispatch remains available.

This W1 unit starts from accepted101 executed
6de84f246195bdb2da03c5bca3d7049b9b25b5cb, source
817992dfe73f25971483ec87857b0d920914b100/tree
c465cd4a860ed3fcfb0589ac7a9f83234ab38d60: doctor/test/guide refresh mapping unit,
four native regressions, CI37978901350/job113984098913417bootstrap+483assistant/
build66/lint/types PASS, audit5HIGH FAIL, independent jobs PASS. No unit101 own107
was claimed because its scope did not activate this suite. Its doctor/test/guide
blobs are unchanged here. Previouscanonical9cf owns107/46QA separately.

The new routing candidate requires its own complete107/Auth/history/grounding/
Storage/teardown, quality and fresh visual review before canonical adoption.
The AuthGate product recovery104 remains isolated; this unit does not contain
that product change or establish a fix for the observed103 access-check stall.
Historical106/107 and cancellations remain recorded. W5 enterprise infrastructure
and owner branch are unchanged; this is the existing W1/W2 local acceptance filter,
not a competing fixture or deployment workflow.

FiveHIGH audit failures, physical issue10/independentW4, persistent Windows,
live semantics and commercial acceptance remain open. Business AI writes OFF.
Main/production/VPS/accounts/DNS/providers/W4W5 remain unchanged.
