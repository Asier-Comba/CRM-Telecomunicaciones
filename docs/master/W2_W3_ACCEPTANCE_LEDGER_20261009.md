# W2/W3 — Acceptance ledger, 9 October 2026

Owner: development integration coordinator consuming separately owned W2/W3 changes. Remote GitHub HEADs and exact executed trees remain authoritative. PUBLIC is a critical governance risk; recommend PRIVATE without changing visibility. Original snapshots 00–19 are unavailable; current versioned contracts support the recorded units. No main merge, force push, production or W4/W5 infrastructure change.

## Accepted source executions

| Unit | Exact source | Actual Supabase run / job | Result and scope |
|---|---|---|---|
| Portability #37 | `d5f1ab7a53ad717c80e1c20077140edd346ec699` | 37853501369 / 113572037773 | Reproduced 106 then 107/107; Auth200, 3349+227, 70 migrations, teardown PASS |
| Auth readiness #41 | `55fa568581b7798d42dfcb2774533f1764215b58` | 37853592165 / 113572590749 | 107/107; actual held SSR/hydration, Auth cookie, teardown PASS |
| History UI #42 | `92ea85c718cb685fa1de140eda7e1e37a85b904e` | 37855856474 / 113579731794 | 107/107; backend/API/browser scope, CAS, replay, cursor, revocation; 73 migrations, teardown PASS |
| Document consumer #44 | `8961a03d342795d63993987d557f091e3261bff7` | 37859235830 / 113590756210 | 107/107; actual binary HTTP200/SQL/idempotency; old base had history backend/API, not the new history browser; teardown PASS |
| Mobile history title #45 | `c2b3f01efd0d4f67309d29c7776c9e732f7d9a16` | 37858184829 / 113587337893 | 107/107; history backend/API/browser, reviewed real390 capture, teardown PASS |
| Earlier composition #38 | `64cc55f9d88e314f0c740a3b1829ff61571c5c3d` | 37859621301 / 113591978389 | 107/107; Auth200, 3468+227, history all layers, teardown PASS |
| Authorized context #46 | `4b99bdb641e6a1ebf0184af81a04b0bde2324bff` | 37860033524 / 113593302372 and 113600020312 | 107/107 twice; own/foreign/invalid/viewer ordinary-read context and recovery/revocation, teardown PASS |
| Document expiry #47 | `7bbeb0d9e3118570f154e5999537ebaf88a0271e` | 37861185190 / 113597100033 | 107/107; server instant/Madrid presentation, notice removed after real finalize, teardown PASS |
| Billing labels #48 | `e3427a4c5cd9467588e5de40178d4b0a94569cb9` | 37861643193 / 113598545197 | 107/107; paid/PDF/payment SQL preserved; three real widths reviewed, teardown PASS |

Native prerequisite #43 source `ca817a11809e6ff2c0b91540a7a0e30ccdcfcac6`, executed `6051abcb386c1d815ba2305749b92443c87e45c4` / tree `daa794b63125a4b24e14dd27188534569f8567b9`: Windows482+3 local PASS and quality37856526529/job113581920266 lint/types/build PASS. Closed zero-port refusals and CI are not physical business-effect durability proof.

All recorded quality executions retain full audit five HIGH FAIL under #29. Passing lint/types/tests/build does not mean full quality/release approval. Dependent/skipped checks are not PASS. Historical failures remain in unit checkpoints; no green is transferred between trees.

## New functional integration sources

- Grounding #49 source `1a4a86bcaa552fd703748a008f6ca2303b61453b`, tree `2e692cab5874e6e00a04ecd00f3ff9f5b0829a71`; actual37866108212/job113613109294 executed `6ba8c2540c1acea8864d718e6f430ff7de852943` with identical tree. **107/107**, Auth200, 3520+227, 73 migrations, history backend/API/browser, actual cookie reads/grounding/partiality/ambiguity/own/foreign/forged reference/revocation and teardown PASS. Planner is a fixed synthetic fixture, not natural-language/live-model evidence. Quality37866108225/job113613110122 lint/types411+482/build PASS; audit FAIL. Original107 case names match accepted38@64 without additions/removals/duplicates.
- Composition #51 source `693e1d0ab3842686a951741638bfe3008b77fe43`, tree `f522e41ccb0f705455497387ae4408115d040c8e`; actual37868045689/job113619400760 executed `09d4ba59653151e2bafd63c921e17ecec62dddfd` with identical tree. **107/107**, Auth200, 3532+227, 73 migrations, history all layers plus authorized context/revocation/read-grounding and teardown PASS. Normally merges46/47/48/50/49. Quality37868045699/job113619401253 lint/types411+482/build PASS, audit FAIL. Reproduced held-route removal race: immediate removal10/10 errors versus drain-before-targeted-removal0/10. Original8af run37866848174/job113615493262 failed without final report/confirmed teardown; new693 whole PASS does not erase that failure.
- Context control/detail evidence #52 source `20300df2b0fc7fad9bf719ec7b5db8332c501867`, tree `d7c2df78b5bb99b38c5efdce3597596e15956453`; actual37868283862/job113620152349 executed `08a32f678120e48202fbe8893221f27596274d0f` with identical tree. **107/107**, Auth200, 3535+227, 73 migrations, history all layers, recovered-context positive HTTP200/render followed by ordinary identity403, grounding and teardown PASS. Quality37868283828/job113620152565 lint/types411+482/build PASS, audit FAIL. First74e1 run37867306599/job113616986302 failed before W2 with context timeout/teardown PASS; image showed expected clear/alert, original substep remains unknown. Reviewed six real frames from artifact11589758572: sold version legible; location rows/footer partly cropped and Customer360=1/list=2 after create. Functional acceptance does not imply complete visual acceptance; #53 addresses both demonstrated issues.

## Customer360 creation and reviewed detail sources

- #53 source `93d5432c7ac6b4ab3943ba18654690b6026fecfa`, tree `d895da0b331150ca266737b8cf65dc180c47d618`; actual37873188978/job113635667405 executed `e892be85a8015f124ada43d317f4d2e13696d923` with identical tree: **107/107**, Auth200,3535+227,73 migrations, history/context/grounding and teardown PASS. Quality37873188970/job113635667674 lint/types411+482/build PASS; full audit fiveHIGH FAIL. Actual artifact11592027648: six contract/location detail frames at390/768/1440 reviewed with full rows/footer, Manual origin and masked addresses. Real summary/SQL/KPI creation checks PASS.
- #54 source `671cb86278a5fd014c08c31c6b8aef76c5046c01`, tree `41e368a64f0b76450a3ea7b194525a685f46f743`; actual37873598652/job113636950142 executed `388140228868b1e61d841de17fd5ed1914e98fce` with identical tree: **107/107**, Auth200,3535+227,73 migrations, history/context/grounding and teardown PASS. Quality37873598633/job113636949963 lint/types411+482/build PASS; full audit fiveHIGH FAIL. Actual artifact11591727630: six contract/location detail frames at390/768/1440 reviewed with full rows/footer, Manual origin and masked addresses. Real summary/SQL/KPI creation checks PASS.

#53 first7f2/tree7e9 actual37870963378/job113628706851 remains FAIL106/107 at strict768 contract detail; summary2/list2 correct but table origin outside viewport. Source93 fixes this with existing cards below1280 while retaining strict assertions. Source54 adds SIM/portability/case summary notifications only after validated receipt success; no optimistic counter, API/schema/authority changes. All107 names and existing private reveal/CAS/retry assertions remain.

## Current development composition

Before consumption, canonical #38 source `e6ca5dc7875d5552d12ef2da72039608e74890e7`, tree `3fd60c7e68b8f927dde6ef7e01cc234590426f19`, actual37861869713/job113599260301 executed `1eceba59a09e9ee6c6088bd4f8f77a0009b99f29` with identical tree: **FAIL104/107** (proposal UTC day oracle, selected-customer draft readiness, mobile shell step). Auth/history/teardown passed; no claim the original shell cause was identified. The same journeys later pass in49/51/52. Source50@f92 standalone failed before W2 in37864177898/job113606845535; only its consumed improvements are accepted in51@693.

Canonical #38 now normally consumes accepted54@671 (including53/52/51/49 and earlier46/47/48/50 improvements), merge `d51e7aad7df7331b2d28016861542ebf4bd447b7`, after reviewing the34-file difference against e6. Ancestry verified; diff for `src/assistant` and all73 `supabase/migrations` against preserved W3@972 is EMPTY. No main merge, reset or force push. This ledger commit creates a new tree: its fresh whole107/Auth/history/context/grounding/teardown and quality gates are PENDING, with no transferred source green. Terminal evidence will be recorded in the canonical PR checkpoint without another status-only code commit.

## Remaining limits and next three tasks

Issue29 full audit remains enforced; no override/downgrade/suppression. Issue10 physical confirmation/idempotency/outbox/dispatcher durability and independent W4 approval remain unresolved; AI business writes remain disabled. Interactive semantic/live-model quality, production reference issuance, broader premium acceptance and persistent local installation remain unfinished.

Windows approximately15.7GiB total/2.65GiB available at latest inspection. Full Docker/Supabase/app/browser local execution remains resource-blocked; Docker stays stopped. Official CLI2.119.0 verified without accounts/login/link/init/start/PATH change. Disposable real CI is not a persistent local installation; no personal processes or Docker settings changed.

W5 #34 remains `85d3a60a7b34af4aac5465f3b30130f742e49900`; future74-migration union is NOT_APPLIED/NOT_TESTED. Postgres15.19/17.11 notice was handed off without an engine upgrade. Infrastructure is not duplicated. [W5 checkpoint](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/34#issuecomment-6070820501). W3 #31 remains `972e96c680a39db25ed1555de4eed9b7149925e3` before composition. VPS/production/DNS/emails/n8n/providers untouched.

Next three: collect this new exact canonical source complete gates; improve demonstrated SIM/case/portability tablet readability with real evidence; continue safe read/local/W5 work with independent security gates. Resume from remote HEAD/checkpoints/executed SHA/tree/latest run, never inherited green.