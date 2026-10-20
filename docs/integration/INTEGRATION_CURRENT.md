# Current product integration — 20 October 2026

Branch: `codex/product-integration-20261019`, draft PR156. This document supersedes
the current-state paragraphs of earlier checkpoints; historical evidence remains intact.
The exact commit/tree and latest CI are recorded in issue67 after each publication.

## Candidate summary

Checkpoint100bf is now terminal, without cancellation: preview union710PASS,
bootstrap664PASS, assistant827PASS, build/types44PASS; quality ultimately fails
the five HIGH audit findings. Native87 fresh/restore schema, rows, RLS, scope,
320-function privilege matrix, role calls and ACL-loss negative control PASS.
The separate W5profile87 also PASS13 controls, completion/restart/teardown;
full23 and verifiedAbsence remain NOT_RUN. Supabase39435611024 has87migrations,
4042backend,113UI PASS and two TIMEOUT: mobile portfolio bounded search and the
new catalog publication journey. Identity/session cleanup and teardown PASS,
server exit0. This is FAIL, not115PASS. The new source requires its own CI.

Product/check source `96f64699dcc76a464beced28f047d928d516ccba`,
tree `86c6fc4338215a49ee0d15c94f3993eb82db2210`. Subsequent documentary/configuration
checkpoint is pinned in issue67; do not infer its pending CI from these checks.
Own composed global lint,827 assistant tests, production build/types44 pages and
3 compiled-login semantics checks PASS. Windows bootstrap659/664PASS: five unchanged
POSIX permission/import-fixture failures remain; strict85/86-versus87 assertion is
now correctly closed by owner profile87 adoption, not waived.

Published Edge c0 has its own terminal CI: Supabase39429051262 PASS87migrations,
4042backend/114UI/teardown; browser710PASS and native87 fresh/restored role/ACL
controls PASS. Checkout85acfed35f0b2302a2ce75d614482568cee4cf72/tree b99c0231
identical to c0 verified. Its quality656/657 fails obsolete86 assertion and five
HIGH remain. These earlier positives do not qualify the later composition.

Only W5's exact netlify.toml from07f97a33 is additionally composed (blob
2e4fcd58a081974f3129e44a8be047bf4a672163). Its deploy workflow is withheld:
missing mandatory87 check currently only warns, dispatcher registration is not
demonstrated, and adapter/config/environment/artifact provenance needs W5 closure.
Plain Next build does not prove a Netlify build or hosted acceptance.

Canonical next delivery: [cloud handoff](CLOUD_CANDIDATE_HANDOFF.md),
[commercial acceptance](COMMERCIAL_ACCEPTANCE.md), [coordination](COORDINATION.md),
[next work](NEXT_WORK.md). Source-bound recovery20 JSON remains historical evidence.

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

## Unit17: explicit profile87 compatibility

Adopted only the six paths of PR164 `a1ab802092ba38c7aca2dfea451922a3dcfa05c4`.
The old85/86 loader/manifest, hosted SQL and all87 migration blobs are unchanged.
Own baseline5PASS/1FAIL of6 documents the obsolete assertion that strict86 would
admit an87 checkout. Owner correction now asserts that refusal and adds an explicit
exact87 profile. Own13/13 closure/negative controls and targeted lint PASS. No native
resource was started locally. W5 run39425772055/job118637826429 independently read:
source a1ab,87/profile_87, completion_primitive/restart/teardown PASS; full23 and
verifiedAbsence NOT_RUN. That physical result is not inherited by our composition.
Our newly adopted workflow must run on the new source. Legacy86 workflows remain
enabled and their strict refusal is recorded separately; no waiver or SQL delivery.

## Unit18: QA-only cloud consumer

PR162 advanced during review to `dcb4b222baa79141757c8372fc8a25c7e7540190`.
Reviewed its exact two-file QA08 delta and adopted14 QA/documentation paths only.
No commercial161 component, dependency, workflow or hosted credential imported.
Own14 runner controls plus10 compiledEdge regressions PASS; targeted lint and
TypeScript PASS. Missing-manifest preflight is NOT_RUN/exit2 before connection.
The runner preserves a lock/journal per approved window, ordinary sign-in,
server provider identity/workspace/role checks, A's two permitted mutations,
authoritative readback and B's own positive before cross-tenant denials.
Both exact draft labels are supported for the pending UX proposal. Hosted run,
voice and independent DB read remain NOT_RUN; no browser/session was attached.

## Unit19: truthful dashboard scope and loading

Read the actual dashboard RPC predicates: personal counts use assignee/owner;
services/lines/plans follow the assigned contract, while workspace reads remain
owner/admin-only. Owner/admin now start with the already-authorized workspace
view; member/viewer retain personal scope. The screen explains unassigned clients,
legitimate personal zeros, snapshot states versus period flows and the agenda window.
Changing scope/period or refreshing clears previous figures while the next read
is pending. No SQL, role, count, aggregate, fixture data or permission was changed.

Own qualified baseline before03:5FAIL/1PASS at390 (default selection, missing
zero/scope explanations). After02:18/18 controls PASS in390/768/1440, no retries,
skips/flaky;5 dashboard contract regressions, targeted lint, types/build PASS.
Actual ProductProvider/component/repository with controlled HTTP, not hosted AuthDB.
Loaded mobile/desktop captures visually reviewed. Earlier before01/02 and after01
are preserved: copied fixture provider alias and missing query-string routing made
the role cases unqualified. After01 had12FAIL/6PASS; no clean result is inferred.
The fixture was repaired before qualified before03/after02; expectations unchanged.

## Unit20: integrated billing presentation

Selectively adopted PR167 `a8735b55bf61717526bf247739db41c55244c136`:
three product blobs and three exact QA locators. The integrated repository remains
the actual server API transport in both disposable local and staging contexts.
Its notice no longer claims a local database or saved changes before a receipt;
integrated drafts have neutral labels, while in-memory demo drafts retain local
labels and their no-persistence warning. Success messages remain after validated
receipts/readback. Parser local/no-generative-AI description is unchanged.

Own causal label check1FAIL before, then51/51 relevant browser regressions PASS
in390/768/1440 with zero retries/skips/flaky. Targeted lint/types PASS. HTTP and
Speech are controlled; real dictation, hosted AuthDB and independent acceptance
are NOT_RUN. Production rebuild is deferred to the next composed login checkpoint;
no earlier build is assigned to this change. Runner162's exact old/new label
compatibility was already adopted before this presentation change.

## Unit21: password accessibility

PR168 login-only delta and compiled-HTML verifier adopted in
`a2198b238416241078809373846cb023cc78f534`, tree de55828b83c29c8aa5ace0cbbbc7265751466d7b.
Own real compiled baseline from1f5edbec:3FAIL; fresh a219 build/types and lint PASS,
then3/3 static Chromium observations PASS at390/768/1440 (HTML digest
d51bd6173a0d5c13a4a8207c2e412aad10eb781c376c8fc78545e4f98e409eea).
The label names the password input, recovery keeps its own button name. No JS,
network, credentials, hydration, sent recovery email or hosted Auth was exercised.

## Unit22: simple tariff price publication

Reviewed PR169 `6d9f7437426e636600a1c5dbd18a9d1d68656b92` against current
catalog.v1 parsers/receipts and unchanged parent blob. Two product files plus
owner controls are selected; no backend/SQL/permission changes. Owner/admin
can publish an explicitly reviewed simple monthly price version, one base
component and no invented entitlements/bundle. Fresh parent/CAS, immutable same
command on uncertainty and receipt/readback-only recovery preserve effect identity.
Own baseline1FAIL (missing action);48/48 directed/regression cases PASS in three
widths,7 contract tests and targeted lint/types PASS. Loaded/review screenshots
visually reviewed. These are controlled HTTP, not persisted AuthDB acceptance.
Own product-catalog-browser helper adds a real-local ordinary UI publication,
terms check and reload of its existing newly created synthetic tariff. No new
resource, SQL or hosted execution. That extra physical check is NOT_RUN until
the candidate's Supabase CI; its result must not be inferred from48 controls.
Full composed build follows with caller compatibility; no old build inherited.

## Unit23: integrated billing caller compatibility

Reviewed PR167 follow-up `e89b2358e063719c5bf59c745699177a15673a5c` /
delivery c38bcf7b. Its six script parents are identical to our checkout; a byte
comparison proves only the three exact integrated draft labels changed. No SQL,
financial/permission/effect/replay assertion, timeout or cleanup changed. Preview's
in-memory product-rebuild labels remain local. Own actual-component selector
baseline1FAIL, then3/3 widths PASS and targeted lint PASS; no writes from that bank.
The original owner103PASS/11TIMEOUT real-local result stays failed and separately
attributed. These selector controls do not prove all eleven causes repaired.
The next physical candidate run must verify the complete integration and new
catalog check; expect a collected UI inventory, never a predeclared PASS count.

## Unit24 follow-up: restricted-access notice

After freezing100bf, a read-only actual Next observation reproduced the W5 login
symptom locally at390/1440: HTTP200, password enabled, query consumed, no JS errors,
but no notice/toast visible. This identifies missing feedback, not the hosted Auth
cause. A persistent alert now handles only the known staging_access_denied reason;
it never renders arbitrary query text or changes Auth/SDK/admission/roles/cookies.
Qualified before02:1FAIL. After01:9/9 actual Next cases PASS at390/768/1440 for
notice, ordinary login and unknown-query non-reflection; no credentials or writes.
Targeted lint and fresh production build/types44PASS; screenshots inspected.
The initial custom observer failed automatic server shutdown: its verified own
PID21308 tree was manually closed and port63042 verified free, not teardownPASS.
The first new test config used a wrong cwd (MODULE_NOT_FOUND), retained unqualified;
the repaired before02/after01 kept expectations/timeouts. After01 port52424 free.
All100bf workflows finished before this follow-up publication; none was cancelled.

## Unit25: independent catalog publication journey

The failed100bf synthetic screenshot shows an operator drawer intercepting the
next tab click. The exported journey reproduces that captured precondition with
the actual component/repository and controlled HTTP: before02 fails at that click.
It now starts at the ordinary /catalog route, selects its created operator and
keeps exact receipt, immutable terms and reload/readback assertions. Fixed phases
are logged without IDs, credentials or response bodies. No product/SQL change.
Qualified final after04:4PASS (one journey at1440 plus three existing term-scope
regressions at390/768/1440); TypeScript PASS. Earlier after03 runs the same helper
three times at1440, not three-width acceptance. Initial before01 browser-path,
after01 syntax and after02 encoding setup failures remain unqualified evidence.
The first lint attempt referenced the test path moved into canonical preview
collection and fails ENOENT; the final-path lint is recorded separately.
The first100bf real-local catalog TIMEOUT and mobile portfolio TIMEOUT remain FAIL.
Only a new exact-source physical run can qualify this helper and publication.

## Work in order

Wait the exact candidate's CI, including the new ordinary catalog publication.
W5 closes deploy gates/provenance and deploys the reviewed exact source/config;
Oier executes independent hosted QA in its authorized window. No old hosted or
local positive is transferred to that deployment. Continue by actual catalogue →
contract → service → line acceptance, rather than duplicate existing consumers.
Storage166/88 remains proposal, affected content OFF. Independent security reviewer
must be identified by owners. Five HIGH, applicable CI and full acceptance remain
open. No main merge, hosted SQL, hosting mutation, production, resellpro or AI writes.
