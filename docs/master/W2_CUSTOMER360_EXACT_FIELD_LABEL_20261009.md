# W2 — distinguish a field label from its value

The loaded Customer360 acceptance helper located a field by looking for any exact text inside `dl > div`. A completed portability has both `dt=Completada` for its completion date and the badge `dd=Completada` for its status. The helper consequently selects two fields and its unchanged count-one assertion times out. A rejected/draft first row does not expose the collision; a previously green run does not establish its absence.

## Actual failing executions

- Canonical #38 source `c10b5cfa8f996c1aa46dc261ce63d19cfb856183`, tree `78e7e3c70d14a80b343202ca1c400c85aa99a719`; run37918784303/job113781389754 executed `4a746ccbbd8e5e6a399349ce3bda25c0e4ccc254` with identical tree. FAIL106/107.
- Case #69 source `bb8b52441a4a977cdcc350cc25d66c4dbac53fe6`, tree `cebf487de152c3df8bf8cb37fe60e6332fec113c`; run37918305039/job113779795206 executed `f0740eaa0d49484dddb48d2d4c0af94079cfecc5` with identical tree. FAIL106/107.

Both closed diagnostics identify `customer360_loaded:Portabilidades:1440:field:Completada/TIMEOUT`. The actual first row is x265/y64/w1150/h301 inside main x240/y64/w1200/h896, intersection ratio1, ten fields and four visible rows. Safe artifacts11611439026/11611791718 agree. The reviewed case failure frame in artifact11611991565 displays both completion-date label and completed-state badge. This is a selector collision after the row's ratio-one assertion already passed, not evidence for a scroll fix. Earlier6b5/caec visual failures lack this diagnostic and their original causes remain unisolated.

Both runs retain Auth200,3535+227 checks,73 migrations, history backend/API/browser/CAS/cursor/revocation, context/read-grounding and teardown PASS. Their quality runs37918784380/job113781394291 and37918305038/job113779795155 pass lint/types411+482/build66 and fail the full dependency audit with five HIGH findings. The case confirmed-create subjourney and its three complete 1440/768/390 frames passed; that scoped success does not turn the global106 into107. Case source is not consumed on that basis.

## Correction and focused reproduction

The loaded helper retains the exact-text selector and intersects it with `dt` before locating the enclosing field. Count-one, full-row ratio-one, every full-field ratio-one assertion, field counts, all four domains, all three viewport widths, screenshot calls, case names and timeout budgets remain. No product rendering, scrolling, backend, contract, migration, authorization, success response or business write changes.

A native Chromium reproduction uses actual CustomerDomainPages, Status, Badge and the complete original/updated loaded helper with React19 production. Only provider, scoped-name resolution, HTTP data and CSS are explicit synthetic adapters; no Auth/database or whole-stack acceptance claim. Original helper times out at the same Completada phase while row ratio=1, selecting two fields. The updated helper selects one definition-label field and passes the same count-one/ratio-one assertions across lines/SIM/portability/cases at1440/768/390, with zero page errors. Browser and server close in finally. Initial harness navigation to an already-selected tab caused a response-wait timeout; resetting harness tabs to no selection corrected that fixture, with no repository transport-budget change.

Exact SHA256:

- CustomerDomainPages: `5368754485f10e1124a2a6b0945d0fecf356ce2fd5633d524c54ff830bd78fa7`
- Product UI: `870774e7f675205347bdecbe74577408887517f1e2b2f74d3b6e2d55911b2da8`
- Badge: `f0d152ec764f033f5114b6d05d58ee7f518452c9fb7ddbea7fa0320de3c8ff16`
- Original helper: `c9b41b2bf69f2b19612b27e4e017a1a48f0140792d8358ef64a243213a88aef4`
- Updated helper: `fe726668f3301c7ca3682a4ce12aa0b3797fcda1fb9358b74f4362e3ec370622`

The new exact committed tree requires fresh full Supabase and quality runs. Pending evidence is not acceptance. AI business writes remain OFF; issues29/10, independent W4, persistent Windows installation, premium/commercial and live semantic acceptance remain open. No production, main merge, force push or W3/W5 owner changes.
