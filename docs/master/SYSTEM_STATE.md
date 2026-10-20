# CRM Telecom — system state

## Sprint continuation — 2026-10-20, units29/30

PR175 reuses its integration branch: Oier21/22 exact selections accepted and
reproduced before/after (5parser+3conceptUI+6focus FAIL →16concept/24parser/48UI PASS).
Caller20 adopted only for diagnosis; original issue effect/cause UNKNOWN.
Own30 adds explicit immutable sold-version selection for service creation using
the existing optional canonical field;18UI/15contracts/lint/types/defaultbuild44
PASS locally on dbc904ac. [Selection/evidence](../integration/UNIT_29_OIER_SELECTION_20261020.md),
[three-create contract and acceptance window](../integration/UNIT_30_TELECOM_THREE_CREATES_20261020.md).
No inherited hosted acceptance, telecom physical journey NOT_RUN; W5 resource/
fixtures/window and independent Oier access required. CORE162 remains two writes.
SQL87/Storage/AI writes unchanged. Final remote SHA/tree and CI in issue67.
29/f315 now has its own Supabase39488102448SUCCESS (87/4042/115UI/teardown),
including invalid/lost receipts; original39458747653 cause/effect remain UNKNOWN.
31 adds [read-only issue observations](../integration/UNIT_31_ISSUE_OBSERVATION_20261020.md),
13Node/lint/syntaxPASS; physical SQL pending its own run.30 has a separate three-
create check prepared in the existing disposable acceptance, not hosted acceptance.

## Sprint continuation — 2026-10-20, unit28

W5 reports exact a9e deployment6ad78f6c810c781fba4f5880 and API/page A/B controls
in issue67/6295242000/6295591477; independent Oier access and visual acceptance remain
blocked. Successor branch `codex/demo-cloud-composition-20261020` composes PR174,
the two reviewed W5 platform commits and Oier172/173. Own63browser/38controlsPASS,
1physicalSKIP, inventory123/87 and global lint/defaultbuildTypes44PASS; no hosted
acceptance inherited. [Bounded handoff](../integration/UNIT_28_DEMO_COMPOSITION_20261020.md).
Final SHA/tree/CI and deployment request in issue67; a9e/174 stay frozen. No new SQL,
workflow171, Storage or production. Historical checkpoints below retain their sources.

## Current master integration — 2026-10-20

Product/check sourcebd0b353c76f8d10e09a82183008ad41e2da878e5/tree7b34b9e3862368997d95d10aadd24e920ff42aa8,
own PR156. Edge163, explicit W5profile87, QA162, billing167/callers, login168,
dashboard scope/loading and simple catalog169 publication are composed. Own global
lint/827assistant/buildTypes44/staticlogin3 PASS; Windows bootstrap659/664PASS,
five unchanged POSIX import-fixture failures. The final docs/TOML checkpoint and
its own CI/source/tree are recorded in issue67. Earlier global checks above belong
to96f, not automatically this source.24 adds login notice9NextPASS/build44;
25 adds catalog journey4controlledPASS/types/lint;26 changes only3UI literals.
100bf CI terminal:710preview/664bootstrap/827assistant/build44PASS, quality FAIL
fiveHIGH; Supabase87/4042/113UI PASS/2TIMEOUT, teardownPASS. Catalog new physical
run and mobile portfolio QA remain pending; native87/restore/profile PASS scoped.

Hosted core is already reported by W5 at deploy6ad75c93ac4914f9005f4767/app e42
plus versioned Netlify config; W0 corroborated the synthetic draft. Independent
hosted A/B, voice and the new composition remain unaccepted. W5 reports outside-
cohort negatives; these are not admitted-tenant isolation. No longer infer the
old Netlify admission failure or absent cloud persistence as the current state.

[Current integration](../integration/INTEGRATION_CURRENT.md), [cloud handoff](../integration/CLOUD_CANDIDATE_HANDOFF.md),
[commercial acceptance](../integration/COMMERCIAL_ACCEPTANCE.md), [coordination](../integration/COORDINATION.md),
[next work](../integration/NEXT_WORK.md) supersede current-state readings of older
snapshots below. Storage166/88 remains proposal/contentOFF; W5 deploy/reproduction,
environment manifest, five HIGH/history and assigned independent security review
remain open. No main/production, cloud SQL or resellpro change; business AI writesOFF.

## Integration checkpoint — 2026-10-20

Candidate product ddf3ef26e6d50cc5bda7d3cb6515d2e8e456014d/tree972ef4edfd204240598a1c7a414f015313c78ead, own branch/draftPR156; later documentary checkpoints are identified in issue67. It composes inactive staging admission/default closure, reviewed billing parser/proposals, PT409/migration87, ten commercial consumers and the exact later opportunity-archive patch. No main merge, accepted release or hosted acceptance. [Current handoff](../integration/HANDOFF_20261019.md) and [source-bound evidence](../integration/RECOVERY_20261020_EVIDENCE.json) preserve all sources and failures.

Own ddf3 checks:45controlled-browser/827assistant PASS, targetedlint/types/build44PASS;650/656bootstrapPASS, six failures retained(5WindowsPOSIX+owner85/86profile rejects87). Earlier d3e06 has339browser/63logic/globalqualityPASS,941 has187browser/24parser/10conceptsPASS and9cfc has52admissioncontrolsPASS; do not aggregate across SHAs. The candidate requires its own CI. Ownerprofile/manifest/workflows stay untouched; request6289026792 asks for explicit pinned87 compatibility. Native1f49 image download failed before migration, not native87PASS.

Last complete real-local acceptance:1f49 tested merge81fced3c4ca62835dcf7c322bdcc9b04570423f3/tree933ef74d identical verified; Supabase39410699669SUCCESS,87migrations,4042backend,114UI, actual getUser cohort decisions/local-session cleanup andteardownPASS.710browser exactunionPASS. LOCAL_SUPABASE_DOCKER, hostedNOT_TESTED; not inherited by later13/14/15 changes. Prior failed/cancelled runs remain preserved.

Cowork reports staging87/PT409 and private preview, but Netlify Edge Access/P0Storage/independentW4 and authorized cohort remain unresolved. The application flags stay OFF/unset, no real cohort values or hosted changes. No model calls/spending or business AI writes; no main merge or resellpro change. Older checkpoints below remain historical.

## Integration checkpoint — 2026-10-19

Candidate product source: `111d2dbe9eb4dfb386c9e364c5f5e78ffd991ffd`, tree `3a499a9625cb202b7f007d0f95b08a5e7165eb10`, branch `codex/product-integration-20261019`, draft PR #156 against W5/PR155. No accepted release source and no main merge.

Eight bounded units integrate case-note focus, contact recovery/state, billing command/receipt recovery, fiscal retry visibility, and customer save/archive/restore recovery. Own verification on349549f:89 browser checks with controlled HTTP, lint, types and build66 PASS. Hosted Auth/DB and complete requirement acceptance are not established by those checks. [Latest handoff](../integration/HANDOFF_20261019.md) and [unit08 evidence](../integration/UNIT_08_CUSTOMER_STATE_20261019.md) distinguish exact sources and preserved failures; issue #67 records later CI.

Unit09 adds SIM replacement-inventory read recovery: own111d has24 controlled-HTTP browser checks, targeted lint, types/build66 PASS; no write authorization claim. Prior5332 CLI has4042backend/112UI/teardownPASS in disposable local Supabase before workflow cancellation; that workflow remainsCANCELLED. [Unit09](../integration/UNIT_09_SIM_READ_RECOVERY_20261019.md) and [CLI evidence](../integration/CI_5332_CLI_RESULT_20261019.md) preserve the distinction. No inherited PASS on the current source.

Cowork reports staging schema86 and a private preview at https://crm-telecom-staging-preview.netlify.app on olderc597+Netlify configuration, product flagsOFF and synthetic accounts disabled. This is not an integrated hosted acceptance. Storage/HTTP findings, application activation policy/cohort, applicable CI failures and independent W4 review remain blocking. Business AI writes remainOFF; no live model spending. No cloud mutation from this branch and no change to resellpro.

## Historical snapshot — 2026-09-26

The following snapshot is retained as historical evidence. Its provisioning and implementation gaps must not be interpreted as the current state; use the dated integration evidence above.

Verified: 2026-09-26 UTC

| Area | Verified head/state | Release consequence |
|---|---|---|
| Accepted base | None | No `main`, integration base, staging deploy or production release |
| W1 | `w1/bootstrap-canonical@61848cf`, PR #11 draft/changes requested | Real Next.js app and first identity migration exist; P0 secret history, suspended-workspace authorization, schema/app drift and incomplete schema remain |
| W2 | `w2/frontend-bootstrap-readiness@0dcbdd6`, PR #8 draft | READ/presentation contracts may continue; route-ID and telemetry gaps are fixed; runtime JSON parsing hardening and accepted W1 remain |
| W3 | `w3/assistant-runtime-foundation@874259e`, PR #9 draft/changes requested | Framework reconciliation/outage findings are fixed; mutation release still lacks durable cross-process stores, recovery and accepted-base integration |
| W4 | Latest implementation `fe6060f`, CI #88 green; status-only follow-up also green | Audit trail only; preserve it and later transport reviewed controls onto the accepted W1 base |
| Staging | Not provisioned | No isolated environment or staging acceptance evidence |
| Production | Untouched | No deploy, DNS, data, secrets or infrastructure mutation |

### P0/P1 recorded in the historical snapshot

- **P0:** no accepted canonical application/schema/auth/RLS base; PR #11 Secret Scan fails.
- **P0:** suspended `workspaces` remain authorized when membership is active.
- **P0:** 32 relations/views and two RPCs remain missing from canonical migrations; onboarding/routes disagree with the identity schema.
- **P0:** assistant mutations lack durable atomic stores, crash/restart evidence, scoped service principals and authorized reconciliation.
- **P1:** W2 Dashboard/Customer transport seams rely on TypeScript shapes and accept normalized impossible dates.
- **P1:** W3 output-value defense misses bare Bearer and AWS credential-assignment variants.
- **P1:** Dependency Review is configured but action-skipped until repository Dependency Graph is enabled.
- **P1:** isolated staging and a successful non-production restore exercise do not exist.

Machine-readable release state: `.security/release-gates.json`.
