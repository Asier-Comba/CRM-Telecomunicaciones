# Unit 56 — exact remote acceptance checkpoint

This report describes source `acb70a692c7ccc07421c27f8815a9f2a91287232`,
tree `90954e20d08beb5db24b29aa375c8d651f0dfbb6`, base
`f9aa469bec768ad73572a2f462f1f1505e6791a5`. Actions executed merge
`da3b935e083e569a09817aca6d50c637ffdeabbe`: its parents and identical source
tree were checked. Attempt 1 only; this Work did not cancel or rerun these jobs.
Later source changes, including unit 57, need their own CI.

## Results

| Evidence | Exact run | Result and scope |
| --- | --- | --- |
| Main CI | [40302666731](https://github.com/Asier-Comba/CRM-Telecomunicaciones/actions/runs/40302666731) | SUCCESS; quality 672 bootstrap + 827 assistant, build 44 routes, npm audit 0; native PostgreSQL, restore, Windows launcher and branch-history scan PASS |
| Preview union | Same run, job 121509945666 | 940/940 exact cases: 470 desktop + 470 mobile; workers 1, retries 0; synthetic preview, not real Auth |
| Real disposable Supabase | [40302666528](https://github.com/Asier-Comba/CRM-Telecomunicaciones/actions/runs/40302666528), job 121504070484 | FAILURE; 87 migrations, Auth/JWT/PostgREST/RPC PASS; W1 3815 + W2 takeover 227 backend checks; actual browser 115 PASS / 1 FAIL of 116; teardown PASS |
| Native compatibility | 40302666670 / 40302666765 / 40302666600 | Profile 87 / grants 86 / W2 business consumer SUCCESS |
| Enterprise platform | [40302666517](https://github.com/Asier-Comba/CRM-Telecomunicaciones/actions/runs/40302666517) | App image scan PASS without HIGH/CRITICAL or secret findings; auxiliary image scans fail: n8n 93 HIGH/13 CRITICAL; Postgres 25 HIGH/1 CRITICAL, zero secret matches |
| Global reachable history | [40302666649](https://github.com/Asier-Comba/CRM-Telecomunicaciones/actions/runs/40302666649) | BLOCKED_FINDINGS; 28 pattern matches across 446 refs/1649 commits; zero exceptions; requires W4 investigation, not an assertion that all matches are actual leaked credentials |

Dependency review and Critical Playwright were conditionally SKIPPED. They are
not executed acceptance. The general Storage field in the Supabase summary is
`NOT_TESTED`; specific document checks do not turn that field into global PASS.
Provider AI and business writes stay OFF. No staging data or hosted service changed.

Native onboarding in job 121504070773 passed: 20 synthetic users, same-input
3x12, different-input 3x12, queued 2x2, replay, sequential and five concurrent
cross-user slug collisions (23505), then teardown PASS. This authenticates the
selected W5 harness at this checkpoint, not a later patched blob.

## Real browser failure and owner handoff

`billing_lost_receipt_seven_commands_same_intent_single_persisted_effect`:
TIMEOUT after 9094 ms. The equivalent invalid-receipt seven-command check passed.
The failed screenshot shows initial invoice/financial-summary loading with issuer
and customer-fiscal buttons disabled and no dialog. The failure action retains
the generic check name: no `billing_uncertain:*` phase was entered. Only the
INVALID_RECEIPT invoice-issue observation exists in the safe report.

This points the investigation to initial navigation, availability or opening
before the first replay. It does not establish a network cause or a failed
invoice effect. The final global action is a later logout step, not the failure
location. No timeout, assertion or security gate was weakened. Product source
and W2's harness remain unchanged. Precise W2 handoff: issue #67/6413682227.

Real login, owner and viewer sessions, customer/Customer360 collections, contract,
service/line, opportunities, fiscal issue/PDF/payment, read recovery, three-width
views, revocation and real logout are individually listed as PASS in the report.
Their success does not erase the missing lost-reply journey. Hosted acceptance
is separately BLOCKED: browser observation of Netlify was denied by a saved
origin permission. No workaround or credential operation was attempted.

## Recoverable evidence

- Preview union artifact 12641538626, SHA256 `42f5b7bd4671eae8860699a58c09e75aa55f6a558a914e8d437cfd9feb374a80`.
- Preview desktop screenshots 12642075207, SHA256 `78fc3bf1310499892923df4f29dcb8f459dbb77692d8dbbd720f458e251412cd`; eight images inspected, including 390/768/1440. Fixture counts are not hosted customer facts.
- Supabase safe JSON 12642386759, SHA256 `acf06eb8dbc1cc5e57be07d2fe6b038ffe4e0f4205ef1cbbb314ef619d53d574`.
- Real-local synthetic UI screenshots 12643325531, SHA256 `6353f722e678f6b8ed372bc0392f5c35f1d27cc8ff0f437a5efe7c9269b4163c`.

Artifacts downloaded through the connector and their archive hashes verified.
Retention is seven days; copies remain in the task's local integration evidence
folder. Do not publish raw logs, session values or private environment settings.

IMPLEMENTADO / TESTED_LOCAL / TESTED_NATIVE: yes for this checkpoint's scope.
TESTED_BROWSER: partial real acceptance (115/116), synthetic preview complete.
TESTED_HOSTED: BLOCKED. W4_ACCEPTED: PENDING. RELEASE: NOT_ACCEPTED.
The next exact-source run is required by the real unit 57 cleanup correction;
the present failure remains evidence even if a later run passes.
