# Unit36 — exact invoice series, selected from Oier178

PR178 source11769380081d7248dc913efc636c5a3ee97b8a5e read and frozen. Only
two functional files selected with cherry-pick-x, not the branch/review evidence:
b4c15424→4d6f4a37,78751dee→8fdbd987,046d9da1→023c7a73 (tests/fixture),
335206ca→a24da5b5 and d5299a6239fd403b5204741102b3436243b04c7d→60d7634f.
Final IntegratedBilling blob72a093a3ba01518c6dd3a67bc5648c894ef2f5e9 and
billing-financial-refresh.spec blob446d7c110a230cf00cb3e27cb1b7a02d2dcd1712
EXACT against Oier d5299.35 PromptBuilder retained independently.

Read contract already accepts invoice.list.series. UI validates uppercase letters,
digits or hyphen1–8 (empty removes filter), only applies on explicit form submit.
Keeps customer/status and resets cursor when series changes, uses current query
key/active response guard. Same-series apply can retry a denied read. Financial
summary stays workspace-wide and clearly says filters only affect invoice list.
No parser, calculation, DTO/RPC, SQL, permission or business-write modification.

Own series-before36:3FAIL390/768/1440 at missing control, after final fixture fixes
selected before baseline (full50rows required for cursor). Own series-after36:
19/19PASS (six series cases plus financial refresh and initial/preparation contexts).
Assertions preserve customer/status, pagination reset, ignored delayed response,
exact server query, negative permission, same-series retry, invalid input/no read,
no business commands/page errors and mobile overflow. No retries/skips.390 capture
visually reviewed: filter/apply reachable and wrapped with summary scope visible.
Not Auth/DB/cloud evidence, not complete PAR103 parity. Oier report22PASS remains
his separate selection of cases, not our19. Shared tests across runs do not sum.

Global quality and full45 speech regression on composed60d source are recorded
in issue67 once terminal. Existing285 published source stays frozen until all nine
workflows terminal; final source/tree must have its own checks. New filter browser
cases enter ordinary two-project CI inventory automatically. Existing disposable
Supabase journey remains unchanged; its source results are identified separately.

Oier CLAIM BILLING-REFRESH31 remains his own work, not silently integrated here.
Asier claims only reviewing/selecting the delivered30 delta. W5 owns packaging/
config/deploy, no hosting/SQL changes or cost. Budget0EUR, real voice/hostedNOT_RUN,
IAwritesOFF, original emission39458747653 cause/effectUNKNOWN, releaseNOT_ACCEPTED.
