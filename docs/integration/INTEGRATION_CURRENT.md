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

## Work in order

Review/adopt exact W5 profile87; classify its successful physical completion
primitive separately from legacy failures and unrun full23/verifiedAbsence.
Review W5 deploy contract; adopt QA-only PR162; review Oier UX07 proposal instead
of duplicating it. Dashboard scope/loading is integrator-owned. W5 deploys the
next exact candidate; Oier runs independent hosted QA in an authorized window.
Storage166/88 remains proposal, affected content OFF. Independent security reviewer
must be identified by owners. Five HIGH, applicable CI and full acceptance remain
open. No main merge, hosted SQL, hosting mutation, production, resellpro or AI writes.
