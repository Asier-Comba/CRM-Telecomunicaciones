# Current product integration — 20 October 2026

Branch: `codex/product-integration-20261019`, draft PR156. This document supersedes
the current-state paragraphs of earlier checkpoints; historical evidence remains intact.
The exact commit/tree and latest CI are recorded in issue67 after each publication.

## Unit16: Netlify Edge admission

Adopted the two-file delta from PR163 `e42cfd59615a284bf26a758c4078c299bed39290`
without importing unrelated application changes. The direct production NODE_ENV
define is used only for the actual runtime process.env object. Explicit supplied
objects still require NODE_ENV; origin, project, private cohort, confirmed synthetic
identity, fresh server getUser, permissions and default closure remain enforced.
Proxy responses keep exact no-store, Pragma and Expires contracts.

Independent compiler control adopted from Oier `9abe438f4135a9b1c847e5ee7e968600f79ad32e`.
Own causal baseline on3b80:8PASS/2FAIL of10. With the minimal Edge delta:
45/45 directed admission/compiler controls PASS, zero skipped/cancelled/retries.
Targeted lint, TypeScript and production build PASS with Node24.19.0/Next16.3.8.
The first lint launcher used system npm/Node and was stopped after verifying its
own process tree; retained as an incomplete tooling attempt, not a lint failure or
product result. Explicit fixed-runtime validation then completed successfully.
These tests compile actual source with the installed Next production define;
they are not Deno execution, hosted negative tests or independent security approval.

## Hosted evidence already achieved

W5 PR157 CLOUD_HANDOFF section10 reports deploy `6ad75c93ac4914f9005f4767`,
application e42 plus separately versioned Netlify configuration: ordinary Auth,
customer creation/reload/Customer360, text proposal300+63=363EUR and draft readback.
W0 corroborated the synthetic draft in Supabase. This is HOSTED_CORE_REPORTED,
not our independent execution or whole SaaS acceptance. W5 later reports
out-of-cohort negatives; these are distinct from admitted A/B tenant isolation.
The previous3b80 disposable real-local4042backend/114UI/710preview results retain
their exact source; no result is inherited by this Edge composition.

## Work in order

Review/adopt exact W5 profile87; classify its successful physical completion
primitive separately from legacy failures and unrun full23/verifiedAbsence.
Review W5 deploy contract; adopt QA-only PR162; review Oier UX07 proposal instead
of duplicating it. Dashboard scope/loading is integrator-owned. W5 deploys the
next exact candidate; Oier runs independent hosted QA in an authorized window.
Storage166/88 remains proposal, affected content OFF. Independent security reviewer
must be identified by owners. Five HIGH, applicable CI and full acceptance remain
open. No main merge, hosted SQL, hosting mutation, production, resellpro or AI writes.
