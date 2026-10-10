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

## Additional accepted product sources

| Unit | Source / tree | Actual whole run / job; executed source | Result / reviewed scope |
|---|---|---|---|
| Inventory cards #55 | e299463de904919a2cc6d84c41298a08f8723865 / 0e77312fe4b5d755c3d31e562539751bca318775 | 37876172793 / 113645181136;3539282c6f0e4cdd294b5c66e2854f79de2f6a81 | 107/107; seven first SIM/case/portability records and fields at their recorded widths |
| Portability captions/reasons #56 | efe4574667a1f832212c2a2b61697a5097f5c24d / dde50587f56a175adef4ccf35c1c4310a6e3f262 | 37879102026 attempt2 / 113657091961;55ac1f882c8a5b5e63e56327fe8f773ff4b38397 | 107/107 observed; eight real frames including rejected390 with both operators/motive; first attempt FAIL remains |
| Agenda summary refresh #57 | cf09fa8a228d34d93c13bd367daf7ecf60ff36ff / 96a3634a23f623443b45f1c86653472c546d55e4 | 37877326207 / 113648792590;e0071ea200c4f2a45aeaed28a6f73ae2a5b5da65 | 107/107; task2/meeting1 summary and Agenda tab preserved, lower calendar outside1440 frame |
| Customer service creation #58 | 892a62bb89dcd8988c31009394b80683be8a9728 / dc241034fc676e552844a2e4e474dbb107fcda29 | 37883410770 / 113667967776;eaef39007146d6e110e43db7ac8691221559bc4a | 107/107; actual receipt/read/SQL+1/KPI/no second write/viewer; created record and all fields complete1440/768/390 |
| Opportunity confirmed read #59 | 138ea1ac388f50105ce403f0d5bc9ca33193dc0d / 191318cff377cca48f74d8ab9ee3a30f455523a5 | 37885028346 / 113672994142;08a0d103ddb691ecd5cd32cd7e33b005b40a1473 | 107/107; confirmed read recovery and product links, four scoped frames; earlier administrative cause remains open |
| History loss diagnostics #60 | 3d7db04418bf06a5f5298a8108ec2a125fc34cb3 / b9f57288a4570642f051088ea67e0085ab13acae | 37881632961 / 113662398256;3c189f4f6f114aa692da426847720d03aa02de32 | 107/107 compatibility; no failed branch reached in this CI, original lost-delivery cause NOT_ISOLATED |
| Complete inventory #61 | 251aea67696f78b982958c20586d25fabf74bdf9 / b0f103fcfbba21e59c805f15d8ea38cec4416272 | 37886141151 / 113676531285;1bd835ac40a959b20cfe799a1526feede9af2192 | 107/107; twelve first-record frames1440/768/390; lower opportunity rows cropped at768/390 |

Each listed execution has an identical tree to its source; Auth200,3535+227,73 migrations, history backend/API/browser/CAS/cursor/revocation/context/read-grounding and teardown PASS. Grounding planner is a fixed synthetic fixture, not live semantic quality. Physical AI business durability NOT_TESTED. Their exact quality jobs respectively37876172797/113645180960,37879102040/113654406940,37877326124/113648791961,37883410827/113667968127,37885028349/113672994308,37881633004/113662398412,37886141149/113676477494 pass lint/types411+482/build66, retain five HIGH full-audit FAIL and dependent SKIPPED checks. Source acceptance never transfers to a new composed tree.

#56 same executed SHA/tree attempt1/job113654407220 failed pre-W2 W3_HISTORY_UI_CREATE_LOST_DELIVERY_TIMEOUT. Attempt2 passed without a source change: original cause NOT_ISOLATED, neither erased nor described as fixed. Source60 only adds bounded closed operation/status/time/DOM flags and a before-route-drain frame for future failures; its accepted CI did not produce such a failure. First56@805107 had partially loaded operator labels in390; current eight frames address that visual issue, not the history cause.

#58 first99@99d5d9eb1573cc99e10a089965492d218481cd51 had107 in37878820654/job113653505119 but only partial summary frames, with the new record outside all three frames. Source37d03c2fee143ce5314f24c17bd0776bf0ef18d6 failed106/107 in37880879085/job113660047045 after reaching all three strict new-record captures; the failure frame shows detail navigation after the stale390 marker, original precise latency cause NOT_ISOLATED. Current892 explicitly awaits the three actual detail reads/service-contract-customer before the same heading assertion, with unchanged budgets; its own107 and frames are accepted. No inferred second write or weakened assertion.

## Previously accepted canonical composition

Canonical #38 source6b31dea11a5a833c57face2219a5356ce2a962ca/tree042f528e45c8f3a60a72047e2641feea0038a824: actual37875866602/job113644205689 executed767e7cafdbac41ec46e2ed0ea48fa4c149f0401d with identical tree,107/107/Auth200/3535+227/73/historyall/context/grounding/teardown PASS; documents200 bodies134/813ms. Quality37875866664/job113644205454 lint/types411+482/build66 PASS,full audit fiveHIGH FAIL; dependent checks SKIPPED. Six actual contract/location1440/768/390 frames reviewed complete inartifact11592962305. It normally consumed54 through code merge d51e7aad7df7331b2d28016861542ebf4bd447b7.

Predecessor e6ca5dc7875d5552d12ef2da72039608e74890e7/tree3fd60c7e68b8f927dde6ef7e01cc234590426f19,actual37861869713/job113599260301,executed1eceba59a09e9ee6c6088bd4f8f77a0009b99f29 retains FAIL104/107 (proposal UTC oracle, customer draft readiness, mobile shell step); original shell cause NOT_ISOLATED. Source50@f92 standalone failed before W2; only consumed improvements accepted in51. Earlier64cc accepted107 remains historical, not a replacement for new failures.

## Previous canonical candidate6b5: terminal failure retained

Normal preparation merge1016eee20b9f5dbc31453cdea895267f433d98c5/tree5883f6dec885e12382c649af880ef3f334ab5bf7 consumes accepted55/57/56/60/58/59/61. Canonical code merge110eee081c2ff8dd96fe875bcf566dbaf7114e6a has the same tree, normally merging preparation into the prior canonical6b31. This ledger adds a new commit/tree; the new HEAD must earn its own107/Auth/history/context/grounding/teardown/quality and visual review. Source PASS never transfers to the new canonical. Terminal evidence will be recorded in the PR checkpoint without a further status-only code commit.

That ledger commit was6b5df7a4a029a59dcc52e02dec745dd0dfd8af31/tree741dd648cae75be4957417aa0f214136dc45f0ab. Its own37888964737/job113685300183 executed5f4d6be576baa4d5ee85ff8dffcebeef8e533567/identical tree and failed106/107 solely in customer360_loaded_telecom_desktop_tablet_mobile/TIMEOUT. The failed frame shows Portabilidades1440 before its first capture; the exact assertion/cause remains NOT_ISOLATED. Auth200/3535+227/73/history/context/grounding/teardown PASS; document200 bodies136/870ms. Quality37888964775/job113685300503 lint/types411+482/build66 PASS,audit fiveHIGH FAIL. This failure remains historical evidence.

The shared layout conflict retained all prior record captions, portability reason labels and class choices, then applied only source61's timing formatter, renewal caption and complete line/commercial card widths. The earlier service conflict added Servicios while retaining accepted classes. The administrative fixture conflict retained the entire preparation journey file and applied only source59's accepted helper import/call, preserving Agenda assertions and all107 names. No changes to src/assistant or the73 migrations against preserved W3@972e96c680a39db25ed1555de4eed9b7149925e3.

#59 own138/tree191 accepted107 in37885028346/job113672994142, executed08a0d103ddb691ecd5cd32cd7e33b005b40a1473/identical tree. Document200 bodies139/770ms. Four reviewed frames inartifact11595958039 show the fixed alert/read-only recovery button1440 and product links1440/768/390; the title or lower form is outside some frames. Safeartifact11596172725 records create200/five editor200 reads after creation/reload with failureDOMnull. Earlier409 FAIL106 from ambiguous alert and d5aa FAIL106 from administrative timeout remain; administrative cause NOT_ISOLATED, instrumentation is not a demonstrated fix.

#61 own251/treeb0f accepted107 in37886141151/job113676531285, executed1bd835ac40a959b20cfe799a1526feede9af2192/identical tree. Auth200,3535+227,73 migrations/history all layers/context/grounding/teardown PASS; document200 bodies164/3802ms. Quality37886141149/job113676477494 lint/types411+482/build66 PASS,audit fiveHIGH FAIL; baseline PASS/dependents SKIPPED. Twelve actual first-record frames reviewed fromartifact11597047985: complete line12 fields, renewal/permanence dates/status/Spanish attention and opportunity fields at1440/768/390. Lower fourth opportunity row/footer falls outside768/390 frames; no all-rows or premium-complete claim. Initial5c87 run37885930788/job113675820563 was automatically CANCELLED, counts NULL/no final report/teardown NOT_CONFIRMED; earlier CI37885930859 preview CANCELLED. Neither is PASS.

## Accepted Customer360 diagnostic source64 and new canonical candidate

Source64 ca888dbf65fb88a7e0a6ee489b60248d89e74510/treead33681dfc967943ea363d07130876ca35e7e78d earned own107/107 in37908899019/job113748987081, executedfee702caf16010e43cf88bedd0b9cc47cc518b52/identical tree. Auth200/3535+227/73/history backend/API/browser/CAS/cursor/revocation/context/read-grounding/teardown PASS; documents200 bodies171/4953ms. Quality37908899040/job113748987585 same executed tree: lint/types411+482/build66 PASS,audit fiveHIGH FAIL. Twelve actual loaded line/SIM/portability/case frames1440/768/390 reviewed inartifact11607270885: each target first record and fields complete; lower rows may fall outside the viewport. This is scoped visual evidence, not all-rows/premium acceptance.

Source64 changes only diagnostic phases and failure-only bounded numeric geometry, preserving original actions, scroll alignment, ratio1 and budgets. AST verification preserves92 prior calls and107 names in63 tracked helpers. The failure branch was NOT_EXECUTED in its own CI: safeartifact11606652258 has no failure or layout diagnostic. An actual-helper synthetic DOM/HTTP test with an explicit one-pixel clipping injection verifies the diagnostic branch and exclusion of IDs/content/URL, without Auth/DB. A separate native Chromium synthetic layout probe reproduced start-alignment fractional clipping in12/24 samples and center ratio1 in24/24; this mechanism does NOT establish the original CI cause. No alignment/product fix is claimed or applied.

Normal code merge54484d93e6ae6b7ca8fe3a681f4c8406d8a5adb1 consumes64 into canonical38 with the identical ad336 tree. This updated ledger creates a new HEAD/tree, requiring fresh own whole107/quality/captures. No src/assistant or73 migration delta against W3@972. Terminal status belongs in the current PR checkpoint. Renewal62 and line63 remain separate, unconsumed product sources until their own corrected-tree gates pass.

Renewal62 first542/tree12c995 failed106/107 in37889483263/job113686916516, executede0800852801a66ef90662d76ee5b5c9c44799b3c/identical tree, solely administrative heading timeout while customer.create was still pending. New renewal journey PASS and three full actual created-record frames reviewed. Follow-up2cc3243e06332ac1234ddc775a8659f908c8b736/tree618205549ddef3c0c64294dd1d8a955843f94953 preregisters/validates the actual command/confirmation/detail/reload reads before unchanged5s render assertions, preserving30s page waits and all43 prior calls/107 names. Real CustomerEditor/intents/parsers/React with6s synthetic HTTP reproduced the overlap and verifies updated helper recovery without another write; no Auth/DB or server-latency cause acceptance. Own37910125217 remains pending at this ledger snapshot; exact quality37910125220/job113753000145 executed26517bb29a269450f167bac43eb67577e602a86a/identical tree, lint/types411+482/build66 PASS,audit fiveHIGH FAIL.

Line63 first1a791/treea04b06f failed106 in37890026379/job113688624878 at an empty disabled service picker. Actual React reproduction isolated its parent guard; explicit customer-scoped service selection fixes that flow while preserving default parent requirements. Follow-upcaec95e8cf9b47453af0dac5b393e47eac650637/treecd555ed84cfc9e0d9bdfb3530f2ff490d5121585 earned106/107 in37907933962/job113745826830, executed6c913295f7b3b62cc4dc3fe418800313c7b1934b/identical tree, solely the same Customer360 visual case. Its new line journey PASS and three actual full twelve-field target captures reviewed inartifact11605524348. Exact quality37907933976/job113745827406 lint/types411+482/build66 PASS,audit fiveHIGH FAIL. Source63 now normally consumes accepted64 instrumentation for a new own run, without claiming a fix for the unknown visual cause or inheriting64's107.

## Remaining limits and next three tasks

Issue29 full audit remains enforced; no override/downgrade/suppression. Issue10 physical confirmation/idempotency/outbox/dispatcher durability and independent W4 approval remain unresolved; AI business writes remain disabled. Interactive semantic/live-model quality, production reference issuance, broader premium acceptance and persistent local installation remain unfinished.

Windows approximately15.7GiB total/4.22GiB available at latest inspection, below the guide7GiB free for a complete Supabase stack. Full Docker/Supabase/app/browser local execution remains resource-blocked; Docker stays stopped. Official CLI2.119.0 verified without accounts/login/link/init/start/PATH change. Disposable real CI is not a persistent local installation; no personal processes or Docker settings changed.

W5 #34 remains `85d3a60a7b34af4aac5465f3b30130f742e49900`; future74-migration union is NOT_APPLIED/NOT_TESTED. Postgres15.19/17.11 notice was handed off without an engine upgrade. Infrastructure is not duplicated. [W5 checkpoint](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/34#issuecomment-6070820501). W3 #31 remains `972e96c680a39db25ed1555de4eed9b7149925e3` before composition. VPS/production/DNS/emails/n8n/providers untouched.

Next three: collect the new canonical exact-tree107/quality/frames and measure any recurring visual failure; require fresh own107/quality/created-record captures for corrected62/63; compose only verified product sources with another own107, then continue product/local/W5 under the independent security gates. Resume from remote HEAD/checkpoints/executed SHA/tree/latest run, never inherited green.

## Renewal acceptance and preparation snapshot (supersedes the earlier pending2cc note)

Renewal62 source2cc3243e06332ac1234ddc775a8659f908c8b736/tree618205549ddef3c0c64294dd1d8a955843f94953 earned own107/107 in37910125217/job113752999501, executed26517bb29a269450f167bac43eb67577e602a86a/identical tree. Auth200/3535+227/73 migrations/history backend/API/browser/CAS/cursor/revocation/context/read-grounding/teardown PASS; documents200 bodies133/817ms. Exact quality37910125220/job113753000145 lint/types411+482/build66 PASS,audit fiveHIGH FAIL,baseline/migrations/secret/Windows/PGlite/nativePG/preview PASS,dependents SKIPPED. Three actual target-record frames1440/768/390 reviewed inartifact11606343620: target09oct2027, null windows, open/manual, all six fields visible, real summary2renewals/0commitments and tab retained. Safeartifact11607226705 records actual create200, confirmation200, detail200 and reload200 at the new closed phases with failureDOMnull.

The updated administrative measurement passed its own full suite without expanding the5s rendering/30s transport budgets or issuing another write. Original542 FAIL106 remains; the cause of the server delay is NOT_ISOLATED. Creation/import refusal/exact replay/read503/SQL+1/KPI/viewer gates remain, and no API/backend/schema/W3 capability change is introduced.

Preparation normally merges canonicald67 and accepted62. Its new combined tree requires fresh whole107/quality/captures after consumption into canonical38. Canonicald67 and line88 own executions continue uninterrupted; line88 is not consumed while its own gate is pending. No inherited green, no speculative scroll fix, no main merge or force push.

## Terminal d67 evidence and accepted line88 (supersedes the pending snapshot)

Canonical d67ad1cd6ba4ebb9169bc82eb50dba3dec82e705/tree f01bd0b44bb9f0cd05495d6112b38dcfa1b3956a failed106/107 in37912158519/job113759627029, executed ba8f5201a7db35f7a09fe252c15da555eb22f9f4/identical tree. Only admin_real_login_write_and_owner_protection failed at admin:created_customer_heading. Closed transport evidence: customer.create request4780ms/200 response8939ms, confirmation request8973ms/200 response9122ms; detail requests9720/9721ms had no responses before the original5s rendering timeout. The actual failure frame shows Cargando cliente, heading=false/customer_read_loading=true/unavailable=false. Unlike source542's pending-command drawer, this failure reached the detail loading screen. Both demonstrate transport/render budget overlap; neither establishes the cause of backend latency. Source62's accepted measurement separates actual command/confirmed detail/reload transport from unchanged5s render checks, without extra writes or expanded30s page waits.

d67 Auth200/3535+227/73/history/CAS/cursor/revocation/context/read-grounding/teardown PASS; document200 bodies150/4010ms. Loaded Customer360 visual case PASS and failure diagnostic null: original6b5/caec visual cause remains NOT_ISOLATED. Quality37912158525/job113759627616, identical executed tree, lint/types411+482/build66 PASS, full audit fiveHIGH FAIL; baseline/migrations/secret/Windows/PGlite/nativePG/preview PASS, dependents SKIPPED. Failure artifact11609330623 and safeartifact11609615564 retained; failed administrative frame reviewed.

Line63 source88fade562609d720f776b26cccd60d99da662b1c/tree7fc32f74ea22fb028f3a23132f5d9722347916e2 earned own107/107 in37912162485/job113759639181, executed8fb5a7af1a4263b4555518cb1bef79659253279d/identical tree. Auth200/3535+227/73/history/CAS/cursor/revocation/context/read-grounding/teardown PASS; documents200 bodies151/4892ms. Quality37912162427/job113759639324, identical executed tree, lint/types411+482/build66 PASS, full audit fiveHIGH FAIL; baseline/migrations/secret/Windows/PGlite/nativePG/preview PASS, dependents SKIPPED. All three fresh created-line target frames1440/768/390 reviewed inartifact11609850209: target second card, all twelve fields complete, pending line with actual service/operator and no invented number/SIM/activation. Earlier1a791 and caec failures remain above; diagnostic failure branch not exercised by this passing run.

Normal merge9aec2cc2b1828a518c7f6b908b3641a302e2a03d consumes frozen preparation727 (accepted62 plus d67). Normal merge51b8070d072f368d53de6952c92976165ab71d55 consumes accepted line88. The sole conflict in CustomerIntegratedPanels was resolved by preserving both accepted imports and area dispatches, with all existing clauses intact. Preparation727 remains frozen as isolated permanence65's base; permanence65 is not consumed before its own gate. This ledger produces a new canonical HEAD/tree requiring its own whole107/Auth/history/quality and fresh created-renewal/line captures. Historical failures remain terminal. No inherited green, schema/backend/W3 change, alignment patch, main merge or force push.

Next three: execute the composed canonical gate and review its own frames; collect permanence65's isolated exact-tree evidence and fix only demonstrated failures; continue Customer360 product/local/W5 work with issue29/10 and independent W4 limits intact.

## Accepted composed1c5, accepted permanence65 and new candidate

Canonical1c5cd51b4f96f83c0bf938026226aa53369f2d0e/treea4a7927784b90900edf5aa622e1da5f5dcec328b earned own107/107 in37915949238/job113772033756, executed2fd2090a1e1b588b7a476115302fce09ed07039b/identical tree. Auth200/3535+227/73/history backend/API/browser/CAS/cursor/revocation/context/read-grounding/teardown PASS; documents200 bodies160/11782ms. Quality37915949145/job113772033013, same execution/tree: lint/types411+482/build66 PASS, full audit fiveHIGH FAIL; baseline/migrations/secret/Windows/PGlite/nativePG/preview PASS, dependents SKIPPED. Six fresh created-renewal/line target frames1440/768/390 reviewed inartifact11611031942: target renewal second row has all six fields and09oct2027/null windows/open/manual; target line first card has all twelve fields, pending/mobile/actual operator/no invented number/SIM/activation. Lower line records are cropped and not claimed complete. Safeartifact11610832045 retained. This run validates the new composition and administrative transport/render measurement; original d67/542 failures and unknown backend latency cause remain.

Permanence65 source2e6b108b49087ce18fe825a7ef8c1d40c7f5af20/tree6d1cdda36490203d13990564ee71debfdadd9862 earned own107/107 in37915051260/job113769085697, executedff33bee48a82413eb607a663d2360f85e091a56b/identical tree on frozen preparation727. Auth200/3535+227/73/history/CAS/cursor/revocation/context/read-grounding/teardown PASS; documents200 bodies149/3798ms. Quality37915055660/job113769088751, identical execution/tree: lint/types411+482/build66 PASS, full audit fiveHIGH FAIL; baseline/migrations/secret/Windows/PGlite/nativePG/preview PASS, dependents SKIPPED. Three actual created-permanence target frames1440/768/390 reviewed inartifact11610011393: minimum term09oct2026 through07apr2027/180days/current/open/manual, all seven fields and whole target visible. Actual summary3renewals/2commitments includes an earlier cancelled commitment; the filtered open collection has one record. Imported-parent refusal, real commit/lost response/exact replay/read503/SQL+1/no additional write/authoritative KPI/viewer all pass. Safeartifact11610271207 retained. This source's test extension follows all previous global permanence/renewal assertions and preserves their original SQL selection.

Normal mergec12ab2978e902b24eae06fca6a207cd0df5855fa/tree39954070ef372f04f9b477df913eb6d5616c085c consumes65 into accepted canonical1c5. The only conflict was the import list, resolved by keeping both existing lines and new permanences; all three area dispatches remain. This updated ledger creates a new HEAD/tree requiring fresh own107/Auth/history/quality and created-permanence/renewal/line frame review. Frozen preparation727 is preserved. No acceptance transfers from65 or1c5, no alignment patch, backend/API/schema/src/lib/src/assistant/73migration changes, main merge or force push.

Separate SIM confirmed-read source66@9550dc0ef5e0684095528911ee40fb26fac2b4b5/tree7ba11c63940f09c8945c6308e325759655de3389 and case confirmed-read source69@bb8b52441a4a977cdcc350cc25d66c4dbac53fe6/treecebf487de152c3df8bf8cb37fe60e6332fec113c remain unconsumed pending their own107 and capture review. Their focused native React/component/parser reproductions use explicit synthetic loopback/presentation/provider adapters without Auth/DB; they do not claim Supabase acceptance. Original SIM91/case127/main1935 actions and107 names are preserved. SIM uses the unchanged shared reviewed-command hook; case preserves its prior command handling and accepts newer mutable metadata on identical immutable ancestry.

Next three: collect this new composed permanence gate and review its own frames; require exact-source full gates/frames for66/69 and fix only observed failures; compose only accepted sources with another own gate and continue product/local/W5. Issues29/10, independent W4, live semantic quality and persistent Windows environment remain open; IA business writes OFF and production/VPS untouched.


## Measured field-label collision and accepted SIM consumption

Canonicalc10/tree78e7e3 failed106/107 in37918784303/job113781389754, executed4a746ccbbd8e5e6a399349ce3bda25c0e4ccc254/identical tree. Source69bb8/treecebf487 also failed106/107 in37918305039/job113779795206, executedf0740eaa0d49484dddb48d2d4c0af94079cfecc5/identical tree. Both fail only loaded Customer360 at Portabilidades:1440:field:Completada/TIMEOUT. Both actual diagnostics show first row x265/y64/w1150/h301 inside main x240/y64/w1200/h896, intersection1, ten fields/four rows. The real bb8 failure capture shows the completion-date definition label and completed status badge. Actual CustomerDomainPages/Status/Badge and full-helper native reproduction proves original selector chooses2 fields, updated exact text intersected with dt chooses1 and passes unchanged count1/ratio1 checks for all four domains and three widths. See W2_CUSTOMER360_EXACT_FIELD_LABEL_20261009.md for exact hashes and explicit synthetic provider/CSS/HTTP scope. Earlier6b5/caec failures lack that diagnostic; do not assume the same original cause or apply a speculative scroll fix.

Both runs retain Auth200/3535+227/73/history backend/API/browser/CAS/cursor/revocation/context/read-grounding/teardown PASS. Documents200 bodyc10 160/4114ms,bb8 182/4039ms. Their exact quality37918784380/job113781394291 and37918305038/job113779795155 pass lint/types411+482/build66 and fail full audit fiveHIGH;baseline/migrations/secret/Windows/PGlite/nativePG/preview PASS,dependents SKIPPED. Safeartifacts11611439026/11611791718 retained. Case confirmed-create subjourney passes and fresh complete target frames1440/768/390 inartifact11611991565 are reviewed:Documentation/High/Open/due16oct2026/notoverdue/zero notes,actual summary3 and record link. This scoped pass does not erase the global106 and case code is not consumed. Its follow-up sourcebe43548bc6c90442fd38c696791c740f2f456de0/tree3a9831429b4985c920ddcd725065945a42f78b13 contains only the field-selector correction/documentation above bb8;fresh own gate37922377964 pending. The correction commit alone is cherry-picked here without consuming case implementation.

SIM66 source9550dc0ef5e0684095528911ee40fb26fac2b4b5/tree7ba11c63940f09c8945c6308e325759655de3389 earned own107 in37917146474/job113776017079, executed3c589960100d7775b700f0957326a60c7eabf0b0/identical tree. Auth200/3535+227/73/history all layers/CAS/cursor/revocation/context/read-grounding/teardown PASS;documents200 body116/1464ms. Exact quality37917146460/job113776017320 lint/types411+482/build66 PASS,fullaudit fiveHIGH FAIL;baseline/migrations/secret/Windows/PGlite/nativePG/preview PASS,dependents SKIPPED. Three fresh createdSIM target frames1440/768/390 inartifact11610868537 reviewed:whole six-field eSIM Prepared/Manual,no inventedICCID/EID/activation/association,actualKPI4/tab retained. Source accepted as scoped product evidence and consumed by normal merge1c1b15c17b48c0d08858068bca4eb61420af01e4. New combined HEAD/tree still needs fresh own107 and capture review, no green transfer.

Portability72 sourcea42a98ae40d3f108d983da3f6cb5dd6c1a414189/tree7a5950ecba35d45122427a8e44592f1921e37048 failed106/107 in37920152452/job113785874555, executedad36ae4d526b6d6d81c09927a1646f0f7f5c7fdc/identical tree. Only portability_rejected_cancelled_preserve_previous_masked_history at portability_creation:real_commit_lost_delivery/TIMEOUT;new created-portability frames absent. Actual failure frame shows the form already closed and registered record link/KPI4. New test mistakenly intercepted /api/portabilities/v1 while production telecomBoundary uses /api/portability/v1. Thus expected lost-response alert was not injected. Test correction and endpoint-bound focused reproduction are in progress on72, unconsumed. Auth200/3535+227/73/history/context/read-grounding/teardown PASS,documents200 body134/848ms. Exact quality37920152423/job113785874705 lint/types411+482/build66 PASS,fullaudit fiveHIGH FAIL;other independent jobsPASS/dependentsSKIPPED. Full loaded Customer360 case passed here;that does not invalidate the demonstrated completed-row selector collision on c10/bb8.

W5#70 currentac60a468b30a46409892082bd6ea8c35cbc35f51/treedc948e88802b351e0bc854b83a6a3444986b3871 was reviewed statically only here:all73 product migration blobs and71 W5@85 blobs identical in74 union,manifest296/295 identical,38 service_role revokes match,current src/lib/src/assistant unchanged. Owner reports earlier376 native74 restore PASS and owncurrentac60 fresh Auth/browser/recovery pending;no runtime reconstruction/ACL/restore or independentW4 approval executed here and no candidate adopted. Avoid interpreting the earlier future-union NOT_TESTED note as absence of another owner's separately attributed execution. W4#68 and vendor#71 preserve their owners;no duplicate implementation. Issue67 coordination index records SHA-specific checkpoints.

Next three:collect the new composed SIM+exact-field-label gate and own created-record frames;require source69/72 corrected own107 and frames before consumption;continue product/local/W5 with exact compatibility and independent gates. Issues29/10,independentW4,live semantic/premium/commercial acceptance and persistentWindows remain open;AI business writes OFF,production/VPS untouched.


## Three terminal product acceptances recovered after workstation shutdown

All local product worktrees resumed clean; saved executed refs match downloaded closed reports. No source was reset and no test restarted merely because the workstation shut down.

Canonical9ab36e242ff4678ee518c1d1606f0035139fcd39/treed9c51fa9072909a527f5f0572beabc9f442e6aec earned own107/107 in37923112003/job113795548444, executed949951fc13c9560b795f58b8433a09b29add1b23/identical tree. Auth200/3535+227/73/history backend/API/browser/CAS/cursor/revocation/context/read-grounding/teardown PASS;documents200 bodies175/4774ms. Exact quality37923111985/job113795548079 lint/types411+482/build66 PASS, fullaudit fiveHIGH FAIL;baseline/migrations/secret/Windows/PGlite/nativePG/preview PASS,dependentsSKIPPED. Six fresh target frames1440/768/390 reviewed inartifact11614285416: SIM six fields/prepared eSIM/manual/no inventedICCID/EID/activation/association/actualKPI4 and permanence seven fields/minimumterm09oct2026–07apr2027/180days/current/open/manual/actualsummary3renewals+2commitments. Whole targets and tabs visible; no claim about every lower row. Safeartifact11614047566 has no failures/layout diagnostic. This validates the consumed SIM/permanence composition and exact-definition-label correction while preserving c10/bb8 failures and audit/security limits.

Case69 earned107/107 in37922377964/job113793136303 on actual tested merge907cb4a28ac95f7226252c0f51dedf872d2b1847/tree299655caec4f86e7326ac5be6ce231ebdc35a553. HEADbe43548bc6c90442fd38c696791c740f2f456de0/tree3a9831429b4985c920ddcd725065945a42f78b13 differs: the tested merge includes permanence65 from canonicalc10. Acceptance belongs to907cb/tree299655, not the unexecuted standaloneHEAD or later base. Auth200/3535+227/73/history all layers/CAS/cursor/revocation/context/read-grounding/teardown PASS;documents200 bodies167/3948ms. Exact quality37922377989/job113793136496 lint/types411+482/build66 PASS, fullaudit fiveHIGH FAIL;other jobsPASS/dependentsSKIPPED. Three fresh case target frames1440/768/390 reviewed inartifact11612929338:whole seven-field Documentation/High/Open/due16oct2026/not overdue/zero notes/updated record,actualKPI3 and current link. Actual lost commit/replay/read503/SQL+1/no thirdPOST/read-only recovery/viewer PASS. Safeartifact11612914309 has no failure/layout diagnostic. Normal integration consumes the exact saved tested907cb merge; it does not silently relabel the source tree or erase bb8FAIL106.

Portability72 source509a4695b6e2d4c2109adc9f3094c3dcd42812a0/tree3d5340e64430509d06c9a36db142b594122d64e3 earned own107/107 in37923577721/job113797101043, executed920269ae54cf2ae91b772a96767df8c7ce65ff80/identical tree. Auth200/3535+227/73/history all layers/CAS/cursor/revocation/context/read-grounding/teardown PASS;documents200 bodies137/797ms. Exact quality37923577737/job113797100747 lint/types411+482/build66 PASS, fullaudit fiveHIGH FAIL;other jobsPASS/dependentsSKIPPED. Three fresh target frames1440/768/390 reviewed inartifact11614265489:whole ten-field inbound portability/actual donor and target operators/request09oct2026/draft/manual/masked number/no invented schedule/completion/reason,actualKPI4 and current link. Real commit/lost response/exact replay/read503/SQL+1/unchanged line version/no thirdPOST/current ancestry/read-only recovery/viewer PASS. Safeartifact11614125927 has no failure/layout diagnostic. A42FAIL106 and its wrong plural route remain recorded; the production singular route/failed-delivery event correction is now actually exercised, with no success fabrication or expanded budget.

The new composition normally merges tested907cb and accepted509a into accepted9ab. Both merges preserve prior product/backend/assistant/migration ownership and do not merge into main. The resulting new HEAD/tree needs its own whole107,quality and fresh case/portability/SIM/permanence frame review before product acceptance; no green transfers from these three prior executions.

After restart15.7GiB total/3.19GiB free remains below the full-stack guide7GiB. Docker stays stopped, no personal processes/settings/volumes changed, and disposable CI is not a persistent Windows installation. IndependentW4,issue29 fullaudit,issue10 physical business durability,live semantic/premium/commercial acceptance remain open;AI business writes OFF. W5d365 compatibility was checked statically against9ab:all73 product/71 platform blobs identical in74 union,manifest296/295 and38 revokes match,src/lib/assistant unchanged. Owner's priorac60 actual107 in37919617891/job113784227189/execa3c12f033511e0ff3a4642a8d0ba140b6e7e1bcc/74migrations was verified by closed report; no result transfers to d365,new product or business durability. No W4 findings published,vendor candidate adoption,production/VPS/DNS/mail/operator effects.

Next three:complete exact local checks and push this combined product candidate;collect its own107/quality and review its fresh target frames;handoff only a verified exact product checkpoint to W5 through67 while continuing the authorised product/local work within independent gates.


## Billing, portfolio and mobile team composition after recovery — 9 October 2026

The following own candidates are now consumed by ordinary merges. Their scoped
evidence belongs to their recorded executions. This composition adds the recovery
doctor, native driver contract and this ledger, so its new source/tree must earn
its own full107/Auth/history/context/grounding/Storage/teardown, quality and fresh
36 target-frame review. No prior green transfers to this new canonical tree.

| Candidate | Source / actual executed / identical tree | Own run / job and reviewed scope |
|---|---|---|
| Billing88 | 18472b45fa164c79adbc4561edd3b7666195d702 / 7bb01a6661fec4b23c6d0da8c65e1f94f46e3f00 / e0c40845d000dae14d411a9ca6a0704d1fbba79a | 37962817594 / 113929668624 SUCCESS107/107; 33 actually reviewed billing/Customer360 frames at1440/768/390. Tablet status/USD tokens complete. |
| Portfolio95 | 5434e6287d16177af990868ab92612af201760be / 655be7f58fc4eaf10c60b0a56bc5bcb4c461a0fe / 0594852ed4aa48364e82a6b11effc4958cc76ab6 | 37963658888 / 113932491946 SUCCESS107/107; 33 billing/Customer360 plus6 portfolio frames actually reviewed. Inventory geometry and current referenced article complete; supplemental customer/operator labels still loading in the top inventory frames. |
| Team96 | ce413350dc0f50f77b659cc54a653e98afba8190 / a3ca711c0b78177b40beaf6d75638b60c733c82b / d1a69d4bdf422fded713dfea6fcf8a780cf3487f | 37967937923 / 113946914234 SUCCESS107/107; 36 fresh target frames actually reviewed. Four team fields/controls complete in mobile cards and tablet/desktop table. |
| Recovery93 | a95da69beb3e4c7c95ab2eed39ebc92c41eee3e5 / 0d6425d8dd906cf4dc931905d30f66197f7eb921 / 2bb2028c4960eab914af7b55b79d524c2f2fe457 | 37957997644 / 113913311198 lint/types413+482/build66 PASS; audit5HIGH FAIL. Two native Windows privacy/dirty-tree/remote-Docker tests PASS. Read-only diagnosis, no installation or107 claim. |
| Driver contract94 | 5c1a54a0cbc826776dc8f911fb5aed4886d7161f / d5db9435b0a53f1f77009478f9159a9a6d1de166 / 5d232303af522c8a1bc0e78725964999c30da1ea | 37958946595 / 113916547418 lint/types411+482/build66 PASS; audit5HIGH FAIL. Document only; no native adapter/scenario executed. |

The three product candidates retain Auth200,3535+227 backend checks,73 migrations,
history backend/API/browser/CAS/cursor/revocation, authorized context/read-grounding,
Storage, teardown PASS and0pageerrors. Their exact functional quality jobs
113929668100/113932492339/113946914067 pass lint/types413+482/build66 and preserve
the fiveHIGH audit failure; all independent jobs pass and dependents are skipped.
Actual safe/product artifacts for96: 11635037733/11635142598.

Billing composes fiscal current-read recovery, complete five-field invoice rows
and authorized client relation choices. The token fix applies nowrap only to the
status/money spans; the existing assertions now check all received invoice tokens.
Current-invoice PDF metadata is pending in some desktop frames; target frame
acceptance does not assert all asynchronous components ready in every screenshot.

Portfolio correlates the exact ordinary current-navigation portfolio.get request,
HTTP200/closed envelope/current kind-id DTO before the unchanged5s render check.
Native real components/repository/parsers with explicit in-memory HTTP demonstrate
valid6500ms transport: old TIMEOUT5091ms, correlated PASS6861ms;503 and foreign DTO
refused,4reads0commands0errors. This mechanism does not establish the original
server delay in W5#92. Existing5s/15s/30s budgets and55 main names remain.

Team changes only presentation of the four table cells plus removed→Retirado.
Native real components/roles/repository/parsers/ConfirmDialog/Button/Geist show
old390 overflow, complete updated6rows at1440/768/390, protected self/owner/removed/
admin peers, Escape0commands and four explicit memory actions with CAS1/2/3/4,
distinct command IDs and receipt versions2/3/4/5. This is not native Auth/DB proof.
The real full suite and36 reviewed frames provide the separate integrated proof.

All product/backend/assistant/migration/package/workflow and acceptance-helper
blobs are identical to the accepted96 execution. Recovery93 adds only its three
files;94 changes only the driver contract document. No main or W4/W5 branch is
changed, no force push. Exact canonical execution/result will be recorded in its
remote checkpoint rather than a new status-only source commit.

Historical canonicald6 retains original37929913690/job113817820638 SUCCESS107 and
repeat37933829500/job113830819477 FAILURE106 financial_currency_comparison, precise
cause unisolated. BillingF09 retains37949967801/job113885892552 FAILURE106;311 retains
37954177106/job113900335163 early history CREATE_UPSTREAM HTTP500. A035 retains
37957116328/job113910333057 SUCCESS107 plus its actually reviewed tablet token and
team clipping gaps; its diagnostic categories do not establish that500's cause.
W5#92 owner035de4c retains37956588534/job113908530775 FAILURE106, mobile portfolio
exact_reference TIMEOUT. No prior failure/cancellation is erased or relabelled.

Issue29/audit5HIGH remains enforced without downgrade/override/suppression;
issue10 physical native adapter/23 scenarios/four20-worker races/six rollback
points/SIGKILL/Postgres restart and independent W4 remain unaccepted. Fixed
synthetic planner grounding does not prove live model semantics. Persistent
Windows installation remains blocked by memory/prerequisites and five POSIX
private-file tests; the doctor does not start Docker or claim acceptance. W5's
fixture/recovery proof does not establish business durability. AI business writes
remain OFF; no accounts, production/VPS/DNS/email/n8n/provider changes.

Next three: collect this new canonical's exact own107/quality and36 fresh frames;
handoff only its verified SHA/tree evidence to W5 via the existing checkpoints;
continue scoped product/local/native adapter work while preserving independent
security, resource and commercial gates.


## Current import reads and driver admission composition — 9 October 2026

Ordinary merges now consume the following own executed commits. No main or owner
W4/W5 branch is changed. Previous canonical56b source56b812e48ae6c1ef8f6fe72fdf71d3dbb6e0317f,
executed0d381b3fbf303d3bcfeeaa8ef469c6ed3ac0f04d/tree7e5022dc22108da819618c4bcd3ac0df2f3370cd,
closed its own37971192526/job113957939952 SUCCESS107 and36 fresh reviewed frames.
CI37971192581/job113957943553 lint/types415+482/build66 PASS, audit5HIGH FAIL;
independent jobs PASS. This historical acceptance does not transfer to this tree.

| Own candidate | Source / executed / identical tree | Closed evidence |
|---|---|---|
| Import labels97, included by98 | c9605698efc3d2d89a434885280a970056ea5112 / edc06b00a72741375395b9e189284b033a7fa25e / 15b20befb2f67ddbf7fb229c952790326b551b72 | Supabase37970661693/job113956133872 SUCCESS107, quality37970661659/job113956133401413+482/build66 PASS/audit5HIGH FAIL,43 actual reviewed frames. Existing management frame was above import panel, not visual cancellation proof. |
| Current import read98 | 3aaba3628b0b45537067d8c4258da6a1a90ec815 / 0827f55ea81297cd179029b42d13c3e6b459b44d / 9d8c299d7506b9e88361800e332e226ff65c2590 | Supabase37973646837/job113966447102 SUCCESS107; quality37973646914/job113966320572413+482/build66 PASS/audit5HIGH FAIL.46 actual reviewed fresh frames, safe11639700108/product11639635231. |
| Driver export admission99 | 3749000bc151813a17111cb23ff12e78c1472ef5 / c0779660dc72f78256ad52d6bc2984a8a7c0f9e2 / 963914282c6e4d5e0e6cc44e72e28b166e38f8a4 | CI37975483707/job113972590794415+483/build66 PASS/audit5HIGH FAIL. All independent jobs PASS. Runner/test/doc scope does not trigger a new Supabase run; no107 claim for this unit. |

Import97 fixes ten missing family labels and renders eight closed states in
Spanish while preserving their values/colors, handlers, filters, pagination,
roles, CAS and cancellation confirmation. Native real components/repository/
parsers/React/Tailwind/Geist proof at18families/eightstates/threewidths has57reads,
zero commands;14 existing import/client tests, exactlint/types PASS.

Import98 correlates the ordinary Actualizar importaciones click to its exact
same-originPOST/api/import/v1 importjob.list request with only limit20, HTTP200,
closed envelope and actual parser. Expected already-cancelled synthetic job must
match id/kind/status. Every received row's family/state/counter/button is checked
inside main and viewport after ordinary vertical scroll, then three new frames
are captured. The prior management frame receives only scrollIntoViewIfNeeded.
Main outside the single import/call and capture focus is byte-identical;55 main
names/order,107checks and all existing budgets remain. Native69reads/0commands/
0errors,18families/eightstates/threewidths,503/extraDTO/missingrequiredID refused;
member/viewer no panel/read. Native memory HTTP is not Auth/SQL cancellation.

Own98 full gate proves Auth200,73 migrations,3535+227 backend checks,historyAPI/
browser/CAS/cursor/revocation/context/grounding/Storage/teardown PASS,0pageerrors.
Document responses200 with headers/body182/188ms and757/760ms. All46 actual frames
reviewed: five current jobs complete on1440/768/390, fourCancelado/oneCargado,
Identificadores protegidos/Clientes/Servicios,0filas andVertrabajo; management
now shows four cancelled records. Separate107 checks SQL cancellation+reload.
Six portfolio frames include still-loading supplemental labels in upper inventory;
no all-enrichment-ready claim. Billing currentA/2026/000008 EUR30.25 controls complete,
desktop list/PDFmetadata pending, tablet/mobile PDFmetadata ready; tablet status/
USD tokens intact. Mobile invoice frame shows complete paid/current EUR cards,
other rows checked via normal scroll. Team six desktop/tablet rows complete;
mobile top administrator and retired-member cards complete, remainder checked
via helper scroll. Customer360 sixSIM/sevenpermanence/sevencase/tenportability
fields complete on three widths, masked portability061 and phase-specific counts.

Driver99 rejects twelve incomplete-interface variants before setup with exit2,
zero setup/zero stdout and closed durable_driver_exports_required. Complete six
functions still reach setup and retain existing closed failure reporting. Prior
synthetic marker reproduced setup despite missing exports before the fix. Two
native regression tests and exact lint/types PASS; temporary checkout restored.
This structural admission is not driver approval, import-effect sandboxing,
credential validation, adapter/store/SQL/provider implementation or physical
durability proof. Existing23scenario/20worker/SIGKILL/rollback/fence/restart oracles
are unchanged. Business AI writes remain OFF until issue10 and independentW4.

All product/backend/migration/package/workflow/security-helper blobs in this new
composition match accepted98 exactly. Driver runner/test/doc match99 exactly.
Only the prior doctor/bootstrap/doc and acceptance ledger supplement them.
The new source/tree requires its own107/Auth/history/grounding/Storage/teardown,
quality and46 fresh actual reviewed frames. Unit results are not inherited.

Historical98@576f6d9524cc7e470402b29fd04d5ea606197a72/exec35bbf3b2ada28203d8078e146a0300f1b6280553/
tree9989771bdf1ddd978f8d672557fa2b9795159b9e retains37973268822 CANCELLED after
ordinary source advancement, quality37973268627/job113965026596413+482/build66 PASS/
audit5HIGH FAIL. All earlier106/500/cancellation/QA failures above remain recorded.
FiveHIGH audit failure remains enforced, no overrides/downgrades/suppression;
physical adapter/independentW4/liveLLM/persistentWindows/commercial acceptance
remain open. Read-only doctor reports about2GiB free, localDocker stopped and
preflightBLOCKED; no heavy local stack or personal process is changed.

Next three: close this exact new canonical's own107/quality and46fresh QA; publish
only verified checkpoint SHA/tree to W5; continue open product/local/durability
tasks within ownership and resource limits. Production/VPS/DNS/accounts/provider
boundaries remain unchanged.


## Current labels, access recovery and closed evidence composition — 9 October 2026


Previous canonical source9cf6c10eae9b6c301b6f79753ffbaafd6eebc7ad, executed84cd318697882505890484730e42c83eb9fa7366, treefcc2485c06f6693ab3ec71c9dd747abf4ec8f43c closed own107 and46 actually reviewed frames. Quality415+483/build66/lint/types PASS, audit5HIGH FAIL. That acceptance does not transfer to this new composition.


| Own unit | Source / consumed executed / identical tree | Own closed evidence |
|---|---|---|

| PR100 | 2c7fcacd6b6839af356441dd40fad5ff156eb50a / e57809cc2a63b97893c7d2b393f191676f2845e3 / d10eea79706c3003bb496885ef6899f00d8b3731 | Supabase37984596356/job114003299332 SUCCESS107; CI37984596418/job114003298193 PASS_422_483_BUILD66, audit5HIGH FAIL, independents PASS; 55 fresh actual reviewed frames in own manifest. |

| PR103 | f8e711d47cd22f9403e60719fff20349c88579ad / 7a50e0e70ddee41282b77571da11d06ca579b241 / 05ee586dd1114d883021a3d9346e2e341c990110 | Supabase37981798580/job114004947233 SUCCESS107; CI37981798548/job113993896841 PASS_415_485_BUILD66, audit5HIGH FAIL, independents PASS; 46 fresh actual reviewed frames in own manifest. |

| PR104 | fe01f3869d494d954a6f086f019a07111fe2b79f / 9b39a4d25c669edc60ff54a7be370ee245e9a3ec / 782810a235f0fa1542d648f8005b20696d29756a | Supabase37985766380/job114007242106 SUCCESS107; CI37985685245/job114006978639 PASS_420_483_BUILD66, audit5HIGH FAIL, independents PASS; 46 fresh actual reviewed frames in own manifest. |

| PR105 | 586e06d4849afdbb1db30f36425000af54bfbd4d / 79240e4ccd711907248be751bb13ed50c0be1efb / 7120a2b23c5188608ec331ef26a9c3c71f8f4174 | Supabase37986414270/job114009402297 SUCCESS107; CI37986414361/job114009403465 PASS_417_483_BUILD66, audit5HIGH FAIL, independents PASS; 46 fresh actual reviewed frames in own manifest. |

| PR106 | 0a4ee2f0b0bc53c6181b3006eb5b0a2f8d9f1efb / 2abfa1908da142c39ce697f5a70dbeecfc2052b4 / cb18d94e2f3edb91374cc8b26e4543600b2816b8 | Supabase37987401757/job114012708418 SUCCESS107; CI37987401404/job114012708795 PASS_424_483_BUILD66, audit5HIGH FAIL, independents PASS; 55 fresh actual reviewed frames in own manifest. |



PR100 supplies progressive current reference labels, with actual complete contract inventory20rows/threewidths/18reads/zero commands native proof; late publishers are disposed and previous repository/rows identities are hidden synchronously. PR102 current-document closed history reload is included identically by100 and106. PR103 rejects accessors/hidden/symbol/proxy/dense-array-invalid evidence without executing getters; it is structural admission, not physical durability. PR104 closes rejected getUser access checks and redirects to the existing login error; disposed responses stay inert. Its source dispatch and consumed CI merge have identical trees. PR105 includes101 explicit branch recovery doctor/tests/documentation, adding only the AuthGate workflow path. PR106 observes bounded current-main-document Auth user HTTP headers/categories only and handles both pending navigation/request rejections. These counters never prove authorization.



Every overlapping unit blob was identical before mutation; every resulting changed blob equals its accepted executed unit. Protected schema/RLS/SDK/durable DB contract/package/security DB helpers are byte-identical to9cf. Workflow differs only by one AuthGate path; existing107 names/checks,55 main checks, budgets/retries/skips/commands and permissions are preserved. No W4/W5 owner adoption, main, force push, production, VPS, DNS, accounts, providers or real data.



Historical100@448/39c HISTORY_RENAME_TIMEOUT before W2 remains FAILURE. PR103 attempt1 run37981798580/job113993896737 remains FAILURE106/107 at portfolio768 current request; reviewed frame showed Verificando acceso… before portfolio.get, original cause unknown. Attempt2 same source/executed closed107, demonstrating compatibility on that run without claiming root cause/stability. All older failures/cancellations recorded above remain.



Fresh manifests retain asynchronous list/PDF/label loads and mobile content below viewport; ordinary helper scrolling is distinct from what each screenshot shows. Native memory transport proofs do not establish Auth/SQL/full app/physical driver behavior. Five HIGH audit remains enforced; no suppression/override/downgrade. Issue10 physical adapter/store/registered dispatcher/native23scenarios, independent W4, persistent Windows stack, live and commercial acceptance stay open. Business AI writes OFF.



This new source requires its own exact107/Auth/history/grounding/Storage/teardown, quality and55 fresh actually reviewed frames. Before those gates close it is a candidate, with9cf remaining the last scoped accepted canonical. Next: native exact composition checks, ordinary push and own gates, fresh visual review and verified checkpoints.


## Native PostgreSQL registry recovery composition — 9 October 2026

Previous source 52f9f0d226664b32f94d0fb732b32ffcbdf1dd5a, executed f7f0f886c5eac2eccb36512c6b98c7b7d7872d4b, tree 900225e2d6a76fd244bf83ddc31d0fc3b0fa8703: own Supabase 37990750515/job 114023972661 SUCCESS107 and55 fresh actually reviewed frames; quality434+485/build66/lint/types PASS, audit5HIGH FAIL. Its two native PostgreSQL jobs114023972625 and114027230729 failed before startup on Docker Hub pull-rate limit; both remain FAILURE, no native DB evidence attributed to that tree. Product evidence does not make its overall CI green.

Consumed isolated PR107 source ab95daa94f552114f7c1d441060f748e0431bc53, executed 18976e7d7186c2ff5b2a1082bc839792826a4eed, identical tree 355f055bb459352c033d3e6553ea2fc1ce369049: own CI 37992182312/native job 114028919906 SUCCESS73 migrations, fresh/restored296-function privilege matrix/RLS/roles, ACL-loss negative control and independent20-process product/B3/notification/automation/service-commercial races; native teardown PASS. Quality437+485/build66/lint/types and12 synthetic preview browser tests PASS, audit5HIGH FAIL, two dependent gates SKIPPED. Three local image-boundary tests/lint4/Bash syntax/diff PASS. No unit Supabase107 or product QA claimed for this CI-only diff; SQL Auth/Storage fixtures do not prove real JWT/Storage or W4/#22/issue10.

Both official registries were queried read-only and gave the same postgres:16 OCI index and Linux/amd64 digest. Exact ECR Public index pinned; shell and both race scripts admit only that digest or exact legacy local postgres:16. All seven accepted unit blobs verified identical after ordinary merge. Product, schema/RLS, SQL fixtures, packages and Supabase acceptance workflow are byte-identical to previous52f. W5 received proposal/evidence through its existing GitHub checkpoint; its owner branches/enterprise infrastructure are untouched.

This new tree requires own native PostgreSQL, lint/types/tests/build, Supabase107/Auth/history/grounding/Storage/teardown and55 fresh reviewed frames; no inherited gates. Until those close, canonical acceptance remains pending, last earlier accepted scope9cf remains recorded. Issue10 physical adapter/dispatcher/23process scenarios, independent W4, five-HIGH audit, Windows persistent stack, live and commercial acceptance stay open; business AI writes OFF. No main/force push/production/VPS/DNS/accounts/providers/real data.


## Current-history proof, private PDF and first-row recovery composition — 10 October 2026

Previous canonical 158682461863fc16609db44d18de14389a947841, executed c6c3446c79dea4ba5fa8e9fd43b59c26dcce33a8, tree 26b2fc04f2c3220b9850600fca5878872a558836, earned own107/55 actually reviewed frames,437+485/lint/types/build66/native73/296/preview12. Audit5HIGH remains FAIL. The frozen own158 evidence and frame/archive hashes are versioned below; no acceptance transfers to this new tree.

Consumed PR110: source 7ab25740ea1a3a0f01bf9d1f6e12a833ac97b5d4; executed c12cbeea559b77944212c3ad585d5a3031ef182c; identical tree 3b1ca363ad7d378e3d11541947219f7aa8acdff4. Own CI 37998353415/quality job 114050009619: PASS_441_BOOTSTRAP_485_ASSISTANT_LINT_TYPES_BUILD66; native job 114050009468: PASS_OWN_73_FRESH_RESTORE_296_PRIVILEGES_SCOPE_RACES; audit5HIGH FAIL. Own Supabase 37998353417/job 114050009295:107/107,Auth200,73migrations,3535+227backend,history API/browser/CAS/cursor/revocation/context/grounding/Storage and teardown PASS.55 fresh actually reviewed own frames with per-source asynchronous limits. Preview18/34 includes six actual desktop/mobile reset/409/committed200 transport cases;116 includes four current-document reload200/403, six actual-component SSR/hydration and six actual history-codec current reopen200/HTML500/foreign-DTO cases. The marker is diagnostic only, never identity or authorization evidence. No physical business durability or live-model proof.

Consumed PR116: source b14f839def6a6053c6d989123e964fcfdd52063e; executed e920a85e24bd02a18493b92945cbe35bf45a18dc; identical tree 1b7e1205ae253fd204ef3770b717de9abfe36a89. Own CI 38009039691/quality job 114084496404: PASS_456_BOOTSTRAP_485_ASSISTANT_LINT_TYPES_BUILD66; native job 114084496538: PASS_OWN_73_FRESH_RESTORE_296_PRIVILEGES_SCOPE_RACES; audit5HIGH FAIL. Own Supabase 38009039655/job 114084496416:107/107,Auth200,73migrations,3535+227backend,history API/browser/CAS/cursor/revocation/context/grounding/Storage and teardown PASS.55 fresh actually reviewed own frames with per-source asynchronous limits. Preview18/34 includes six actual desktop/mobile reset/409/committed200 transport cases;116 includes four current-document reload200/403, six actual-component SSR/hydration and six actual history-codec current reopen200/HTML500/foreign-DTO cases. The marker is diagnostic only, never identity or authorization evidence. No physical business durability or live-model proof.

Consumed PR112: source da6d073eedf249d3cb35dc182b4b989070be1aec; executed 7024b6cd6865fcc041695882cc697ca00fdbee2f; identical tree 023a3496799fe780e4c13517dd4b91ccfbb86c10. Own CI 37999994765/quality job 114055465222: PASS_447_BOOTSTRAP_485_ASSISTANT_LINT_TYPES_BUILD66; native job 114055465036: PASS_OWN_73_FRESH_RESTORE_296_PRIVILEGES_SCOPE_RACES; audit5HIGH FAIL. Own Supabase 37999994843/job 114055464919:107/107,Auth200,73migrations,3535+227backend,history API/browser/CAS/cursor/revocation/context/grounding/Storage and teardown PASS.55 fresh actually reviewed own frames with per-source asynchronous limits. Preview18/34 includes six actual desktop/mobile reset/409/committed200 transport cases;116 includes four current-document reload200/403, six actual-component SSR/hydration and six actual history-codec current reopen200/HTML500/foreign-DTO cases. The marker is diagnostic only, never identity or authorization evidence. No physical business durability or live-model proof.

Consumed PR109: source 2b324d3d37630c36803ae2db7fca51f1efeb053f; executed 3ff4daf38f05c0296619150e454ddf2fc39c56d0; identical tree 7a9bba15ad633f71b769f44c1eb6b36fd5d05612. Own CI 37995863849/quality job 114041656366: PASS_437_BOOTSTRAP_485_ASSISTANT_LINT_TYPES_BUILD66; native job 114041656645: PASS_OWN_73_FRESH_RESTORE_296_PRIVILEGES_SCOPE_RACES; audit5HIGH FAIL. Two owner documents; current Iteration6 W2 physical adapter, W3 behavior, W5 infrastructure, W4 independent acceptance; no physical implementation. No107 or visual proof claimed for documentation.

Consumed PR114: source c827490ff4a4777df21101a72cd05c70925ca366; executed 4664e334b4ceef3a121988470c1b5112fb9eee9d; identical tree fd0f77d55b5e1e1f25065dc6c9078038cf5c76d8. Own CI 38005815336/quality job 114074231489: PASS_437_BOOTSTRAP_485_ASSISTANT_LINT_TYPES_BUILD66; native job 114074232575: PASS_OWN_73_FRESH_RESTORE_296_PRIVILEGES_SCOPE_RACES; audit5HIGH FAIL. One current Windows recovery guide; current38/67 checkpoints, historical88 distinction, source/execution/tree/run/job, preservation and resource limits; no Windows installation claim. No107 or visual proof claimed for documentation.

Original PR108@33d run37995229138/job114039443447 remains FAILURE after53 UI completion events, no final safe report/teardown unconfirmed; exact socket-reset root cause not established. Recovery108@6c8 run38001908294/job114061723637 remains FAILURE106/107 at admin:reloaded_customer_read, teardownPASS. Its closed trace shows a previous-document response during reload but does not establish the exact original server/protocol cause. PR113@afb run38004901162/job114071322553 remains FAILURE106/107 at desktop portfolio current_request with0 auth-user GET requests and the access-check spinner; admin passed that attempt, exact original cause unknown. An installed-SDK in-process callback probe did not reproduce a deadlock. PR115@c442 run38007717467/job114080266793 remains FAILURE beforeW2 at W3_HISTORY_UI_HISTORY_REOPEN_MESSAGES_TIMEOUT,Auth/73migrations/teardownPASS, no107 result or W2 product artifact. Its one actually viewed failure frame shows an invalid-history alert; generic/network/syntax server categories do not establish the exact cause. Accepted116@b14 preserves the queue/test and110/admin/lifecycle blobs and earns independent full gates for its own tree, including current ordinary reopen reads in parallel with the original20-message assertion. This does not relabel108/113/115 as PASS or claim the original upstream cause was fixed. Original PR111@665 secret-scan job114053584876 remains FAILURE on the closed evidence-label false positive; its own107 does not clear the scan or become replacement112 evidence. Replacement112 has independent scan and full gates, with no allowlist/history rewrite/force push. All previous52f failures and older partial/cancelled runs remain recorded.

Accepted unit blobs are identical after ordinary merges. Schema, RLS, assistant contracts, workflow and package files remain byte-identical to158;109 changes only two owner documents;114 changes only the existing recovery guide. New source requires own462+485/lint/types/build66/native73/296/preview34/Supabase107/55 fresh reviewed frames. These are pending, not inferred from units. Physical23 durable scenarios, W4/#22,5HIGH audit,40live,Windows persistent stack and commercial/release remain open; business AI effects OFF. No main/production/VPS/DNS/accounts/providers/real data or W4/W5 branch adoption.


Unpublished local composition46eadc66bd42c709fa3edb69b367d19688af4834 remains rejected and preserved:63 relevant regressions/lint/diff passed,but the reachable-HEAD scanner flagged two assistant-written historical header-observation notes under the access field. Private adjudication matched both verbatim to frozen own110/112 notes; neither is a credential. The replacement starts from the same verified ordinary-merge parent and applies the documentation record without making46e an ancestor. Only those two evidence field names become read_observation_notes; text remains unchanged,field mapping and original-note hashes are explicit. No source-unit blob,product,authorization,schema,dependency,workflow,scanner rule or allowlist changes; no reset/force push or rejection relabelledPASS. Replacement checks must run on its exact source.


The second unpublished candidatefe6668c8f7c22c7f5bef5ad183844d4e7fa70d72 also remains rejected and preserved:63 regressions/lint/diff passed,but two original_access_note_sha256 fields matched the generic API-key heuristic. Each flagged value was privately recomputed as the exact SHA256 of the unchanged frozen own review text; neither is a credential. The current representation uses original_note_sha256 with identical values and mapping. The same approved ordinary-merge parent is retained; neither rejected candidate is an ancestor. All rules remain enabled; a preliminary stdin scan precedes this commit and a separate reachable-HEAD scan and exact-source checks remain mandatory before push.
