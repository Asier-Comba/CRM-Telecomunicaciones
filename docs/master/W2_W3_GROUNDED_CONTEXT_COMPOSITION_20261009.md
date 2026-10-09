# W2/W3 grounded-context composition — 9 October 2026

Owner: W2/W3 integration coordinator. Isolated candidate branch `codex/w2-w3-grounded-context-composition`, base PR38 `e6ca5dc7875d5552d12ef2da72039608e74890e7` (actual104/107; Auth/history/teardownPASS). No main merge or force push.

## Reviewed sources

| Unit | Exact source | Independent actual evidence |
| --- | --- | --- |
| W2 authorized assistant display context #46 | `4b99bdb641e6a1ebf0184af81a04b0bde2324bff` | Run37860033524 attempts1/2, jobs113593302372/113600020312, executed2efe6bd19eedb4a873b5604ab32d8c2b78449944, tree12bcaac4a06e32ab332399eb451279eb6d7a1215:107/107 twice; Auth/backend3480+227/73migrations/history backend+API+browser/context roles+foreign+invalid+revocation/teardownPASS. Initial5b20b1d unexplained failure is not declared fixed. |
| W2 document expiry #47 | `7bbeb0d9e3118570f154e5999537ebaf88a0271e` | Run37861185190/job113597100033, executed3721b67041a92031b3d7a62d37b3989d218966a7, treeb30a203ded8748034aedb5fe7b95a34526c8a03e:107/107, Auth/backend3409+227/73/history backend+API/teardownPASS. Old base lacked new history browser; composition must prove both. |
| W2 invoice labels #48 | `e3427a4c5cd9467588e5de40178d4b0a94569cb9` | Run37861643193/job113598545197, executed7ed637366415453eb05cf771f198be758814a48b, treea2ad6277da50413907d9b1d56e3e2f23fa242dc5:107/107; Auth/backend3468+227/73/history backend+API+browser/teardownPASS. Paid-detail captures1440/768/390 reviewed. |
| W2 billing clock/customer readiness #50 | `f92f91c3ebc5770745531507e3ab2bb7793797ef` | Original run37864177898/job113606845535 failed in the preceding history route callback before W2; new billing cases NOT_REACHED. Quality lint/types411+482/buildPASS, full audit5HIGH FAIL. Product readiness and exact per-journey date require this candidate's real proof. Mobile shell remains diagnostic only. |
| W3 actual read grounding #49 | `1a4a86bcaa552fd703748a008f6ca2303b61453b` | Independent actual CI PENDING. Prior90bddea failed AUTH_PROFILE_REFUSED with teardownPASS and completed history-browser breadcrumb. Fix follows existing production membership selection over actual RLS rows and retains hostile profile preference. Plain Node import failure reproduced/fixed by established transform flag. Live model/provider/NL/UI/factory/production handle issuance/business durability remain unproven. |

All recorded trees match their tested source. All independent quality executions remain **FAIL full audit5HIGH**, despite passing lint/types/tests/build. Dependent skipped gates are not PASS. No individual green becomes composition acceptance.

## Merge review and required consumer preservation

Sources are consumed by normal merges, not copied over another Work. Review confirms only W2 features and W3 test acceptance/workflow are added; diff against W3 base `972e96c680a39db25ed1555de4eed9b7149925e3` for `src/assistant` and `supabase/migrations` is empty. All73 migrations, W3 kernel, RLS/CAS/idempotency and W4/W5 owned infrastructure remain unchanged.

Manual conflicts preserve document prepare/finalize receipt/CAS/Storage protocol and Madrid expiry assertions alongside every invoice label assertion. Financial comparison preserves all currency/cut/from/to assertions and holds/releases the real customer response; its financial response listener is registered before this single navigation, avoiding a second reload while a previous read could still be in flight. No substituted success, timeout increase, automatic retry or dropped permission assertion.

History conflicts preserve #46 own/foreign/invalid/viewer/context-revocation cases and fixture restoration; #49 mandatory upstream200 before intentional delivery loss; same UUID/body retry/single SQL row; all literal history/CAS/20+2 messages/archive/20+1 thread cursor tests; fixed failure phase/kind/HTTP diagnostics with screenshot. Viewer cookie and wb remain supplied to that browser; grounding runs only after it returns, before releasing the existing dev server.

The existing107 W2 journeys remain. Read planner is explicitly deterministic synthetic, while Auth/PostgREST/cookie reads/history RPC are actual disposable-stack calls. Its seven read cases require source time/partiality/ambiguous dependency/foreign and forged reference rejection/revocation/no final facts/13 generic historical messages/unchanged full business fixture snapshots. A fixed helper success is not semantic model or interactive query acceptance.

## Preparation checks and remaining gates

Local changed-file lint, TypeScript, all three acceptance-script syntax checks, history/telecom client21/21 and application-turn4/4 PASS, zero skips. The later financial listener edit also passes lint/syntax; no TS app code changed after the type check. Existing transformed guard checks on the consumed helper require three closed refusals and zero SQL/RPC calls. Full lint/types/tests/build and actual107/Auth/history/grounding/teardown are **PENDING on this new exact source**. Last Windows inspection15.7GiB/2.61GiB free: no local Docker/app/full browser stack started. CI is disposable and is not a persistent local installation.

Visual review of accepted45 artifact11585353128 confirmed masked SIM and closed-case readonly states at390, but named contract-sold-version/service-locations captures show Customer360 above the relevant details because main scrolls internally. Those frames do not establish detail visual acceptance. Improve target framing independently after stability; do not infer overall premium readiness.

Issue10/physical assistant business durability/independent W4 approval continue to block AI business writes. Issue29 full audit5HIGH remains enforced; latest official braces3.0.3 is still affected, advisory lists no patch, and latest Next lint plugin16.4 still pins fast-glob3.3.1. No override/downgrade/suppression. Repository PUBLIC is a critical governance risk: recommend PRIVATE without changing visibility. Original snapshots00–19 unavailable; current contracts sufficient for these units.

W5 PR34 source85d3a60a7b34af4aac5465f3b30130f742e49900 remains intact, future74 union NOT_APPLIED/NOT_TESTED. Official CLI2.119.0 verified without login/link/init/start/PATH change. Postgres15.19/17.11 patch notice handed to W5/W4, no engine upgrade. VPS/production/DNS/correos/n8n/providers/external sends untouched.

Next three: collect the exact-source full candidate proof and any fixed failure stage; correct remaining demonstrated regressions and re-run; normally compose accepted result into #38, then advance honest detail visual/grounded-read/local/W5 gates.
