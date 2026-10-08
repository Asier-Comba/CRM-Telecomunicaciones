# W2/W3 — Acceptance ledger, 9 October 2026

Owner: W2 integration coordinator consuming separately owned W2/W3 changes. Repository remote remains the authority. PUBLIC visibility is a critical governance risk; recommend PRIVATE, do not change visibility. Original master snapshots00–19 remain unavailable; current versioned contracts support these units.

## Accepted exact executions

- Portability PR37: source `d5f1ab7a53ad717c80e1c20077140edd346ec699`; executed `fdb3eed4cf36b1d3da8ded4a4704afb441cfd0f4`, tree `6ba1e3849097dea0d0ec1ab7d6150862c5752ea0` equals source. Supabase run37853501369/job113572037773: **107/107**, Auth200, backend3349+227,70 migrations, teardownPASS. Quality37853501382/job113572038728:lint/types/405 tests/buildPASS, full audit5HIGH FAIL.
- Auth readiness PR41: source `55fa568581b7798d42dfcb2774533f1764215b58`; executed `3a7f252e12e2f6bdabfafc0137196842c70c8240`, tree `ed4679a222161907338f31234adf6e3f602692c0` equals source. Supabase37853592165/job113572590749: **107/107**, Auth200,3349+227,70 migrations, teardownPASS; actual SSR-held-script readiness/cookie login. Quality37853592128/job113572340843:lint/types/405/buildPASS, audit5HIGH FAIL.
- Composed persisted history UI PR42: source `92ea85c718cb685fa1de140eda7e1e37a85b904e`; executed `0d6ed4ab70d77d58e7a777be631a34299f3d59ab`, tree `d6a7ccc3ea7d76ab7934142ed191377e6ad7fa0e` equals source. Supabase37855856474/job113579731794: **107/107**, Auth200,3468+227,73 migrations, backend history scope/replay/CAS/revocation, cookie lifecycle and NEW real browser history/CAS/pagination/revocation PASS, teardownPASS. Quality37855856487/job113579731511:lint/types/410+481/buildPASS, audit5HIGH FAIL. Reviewed real desktop/mobile captures show literal inert injection and persisted history; mobile rename input still cramped, addressed independently in PR45.
- Native prerequisite exit PR43: source `ca817a11809e6ff2c0b91540a7a0e30ccdcfcac6`; executed `6051abcb386c1d815ba2305749b92443c87e45c4`, tree `daa794b63125a4b24e14dd27188534569f8567b9` equals source. Windows482/482 assistant and3/3 refusal tests, zero skips. Quality37856526529/job113581920266:lint/types/407+482/buildPASS, audit5HIGH FAIL. Runner-only CI does not prove Supabase or physical business effect durability.

The first mandatory portability reproduction/correction and an entire W2/W3 Auth/history/product107/107 are demonstrated on the exact executions above. This does not close the broader product/security/local/provider gates.

## Current composition candidate

The owned `codex/w2-w3-portability-composition` branch normally merges reviewed PR42 and PR43 exact sources on base `0fa8864928074e86a40cdc38707111df7f1f7060`; code merge `a575f9075e8a9f5026df001a4f418d455343f000` precedes this status-only documentation commit. No force push or main merge. Diff against W3 source `972e96c680a39db25ed1555de4eed9b7149925e3` for `src/assistant` and `supabase/migrations` is empty: core contracts and all73 migrations remain unchanged. New W3 delta is only the isolated CLI exit/test; W2 delta is the reviewed display client/provider/browser consumer.

Local composition Windows whole assistant **482/482**, `--test-concurrency=2` limits test-file memory scheduling but preserves every case and each case's own concurrent race controls; client3/3 and browser syntax PASS. New full lint/types/tests/build and actual Supabase/history/product107/107 are PENDING on this candidate. Source-wise accepted executions above are never assigned automatically to the merge. The predecessor composition0fa had106/107 at upload; this remains a historical failure, not the latest accepted history source.

## Independent candidates and failures

PR44 W2 document consumer first source9683cade9f15c5af1ec96f80eac29910f19aa1f7 fails103/107 at command preparation due to an introduced `data`/`receipt` envelope mistake; ticket failures are downstream. Corrected source `8961a03d342795d63993987d557f091e3261bff7` requires the actual published command `receipt` and binary `data`, with unchanged30s page/5s expect budgets and strong ID/CAS/Storage/SQL/DOM checks. Document transport5/5/syntax/lint PASS; new Supabase37859235830 and quality37859235799 PENDING. Not consumed in this composition until reviewed evidence permits.

PR45 W2 mobile history title source `c2b3f01efd0d4f67309d29c7776c9e732f7d9a16`:lint/typesPASS, actual captures/full acceptance PENDING. PR46 W2 authorized display context source `5b20b1d12b36344cbe11aa71d5c875fb6b473bf3`:lint/types/syntax and21+4 meaningful boundaries PASS; own/foreign/viewer/revocation context/full actual acceptance PENDING. Neither source is consumed here or accepted from source alone.

## Remaining limits and handoff

Issue29 remains enforced full audit5HIGH; omit-dev0 does not replace full audit. No override/downgrade/suppression or false fixed claim. Dependency review and dependent critical Playwright are SKIPPED, not PASS. Physical assistant business durability NOT_TESTED; issue10/independentW4 approval still block IA business writes. Read context offered handles, semantic/live-model quality, invoice proposal flow and broader premium product acceptance remain unfinished.

Windows15.7GiB with approximately3GiB available; complete Docker/Supabase/app/browser installation remains resource-blocked. Verified official CLI2.119.0 is installed without account/login/link/init/start/PATH change. WSL2/hipervisor confirmed; no personal process or Docker setting changed. Real disposable CI is not a persistent local installation.

W5 PR34 at `85d3a60a7b34af4aac5465f3b30130f742e49900` remains unchanged. Its future74-migration union is NOT_APPLIED/NOT_TESTED; no enterprise/staging/production/worker or W4 acceptance inferred. Existing W5 contracts/scripts are preserved, coordination in [PR34 checkpoint](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/34#issuecomment-6070820501). Providers/VPS/DNS/production/external sends remain untouched.

Next three: collect this exact candidate's complete gates; inspect/review independent document/layout/context candidates before normal composition and fresh107; advance grounded read/product/local/W5 tasks with exact-source independent security gates. Resume via remote fetch/HEAD/local tree/PR checkpoints/latest executed SHA, never memory or an inherited green.
