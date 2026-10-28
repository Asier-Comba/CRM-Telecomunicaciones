# D2A presentation checkpoint — 2026-10-28

This branch is based on #202 c17d8666dd39435112ac9e1745f496add68147c0. Its real global metadata acceptance remains bound to that source: run40720188927/job122928653044 PASS117. D2 is not implemented or accepted. CLAIMs #67:6474820272 and6475198570 cover the independent component/fixture/tests/workflow only.

`FolderNavigation.tsx` is a child of a client boundary. It accepts a bounded view and callbacks; it does not fetch, persist, create folders, classify documents or grant access. It is not imported by the `/documents` route or the accepted global consumer. Its local state controls only mobile disclosure. The ordinary nested disclosure navigation uses native buttons/Tab/Space/Enter, mobile Escape and focus return; it does not claim the ARIA treeview keyboard contract. Selection, expansion and loaded children belong to the caller. A current-role or scope mismatch withdraws labels and controls; this presentation behavior is not Auth/RLS proof. Unavailable/denied/loading/partial states do not claim a complete empty set. A locked caller disables action callbacks.

The fixture is visibly labelled **presentación controlada, sin persistencia**; its evidence scope is CONTROLLED_PRESENTATION_ONLY. It updates supplied presentation props for interaction checks, without storing folder records, localStorage or network calls. Existing default/library fixture modes retain their defaults. No backend DTO/API/RPC or migration is introduced.

| Check | Result | Scope |
| --- | --- | --- |
| `d2a-navigation-01-20261028` | 9 PASS / 2 FAIL | Initial ambiguous `status` selectors also matched the fixture's output element; retained unchanged evidence |
| `d2a-navigation-02-20261028` | 11 PASS | Named status regions and exact assertions; source typing fixed, no timeout/retry relaxation |
| `d2a-navigation-final-20261028` | 11 PASS | Final component with visible selected-folder styling; 390/768/1440, keyboard, scope/role retirement, bounded text, branch failure, lock and paging |
| `d2a-fixture-regression-01-20261028` | 5 PASS | Existing late-response/Next-alert oracle checks, because fixture entry changed |
| Typecheck / targeted lint | PASS | Local source; production build also passed with unconfigured public environment, not a deployable image |
| Hosted / real folder persistence / folder RLS | NOT_RUN | No D2 implementation or ownership agreement |

The first typecheck also failed on union narrowing and a readonly test assignment; the corrected source passes. The failed attempts are not backend failures and do not replace the historical D1 failures. Four final synthetic captures are retained locally; separate GitHub CI retains source/tree and synthetic evidence without running Supabase, Docker or real Auth. Its status must be read from the exact run, not inferred here. No real D1 suite is repeated for this presentation change.

W4 and W5 reviewed proposal a8e498cc2f3a520dd9c455c04603a72e986c3d85/tree ef5690fbe77dadaf9826b7cfe5bbaf6104c386e7 favorably within the invariant delta: shared classification/archive serialization, entire-subtree depth and explicit v3 dispatch/revision-bound cursors. They explicitly did not approve D2, ownership or implementation. All17 expected physical D2 cases remain NOT_RUN. W1's human-designated backend chat has received the contract request; no response/ACK is observable. Name normalization/limits/archive policy and implementation ownership remain unresolved. The old D1 delegation does not cover D2 SQL.

Next3: obtain W1 contract/ownership agreement; independently review this exact presentation source; then add a failing real persistence/tenant/concurrency acceptance before an authorized minimal backend and caller integration. Until then do not attach this component to live product data or claim functional folders. Byte/Storage/#179 and hosted gates stay closed.
