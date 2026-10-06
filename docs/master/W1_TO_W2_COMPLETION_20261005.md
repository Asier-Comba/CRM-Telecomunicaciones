# W1 → W2 exact product handoff — 2026-10-05

Exact-source TEL5-00 functional evidence: `3ebed3ff993c38cd74d60d8e3c6e4f3ed28af56c`; real Supabase run37370409567 PASS1298/129observed; native run37370409687/job111977630518 PASS54migrations/247privileges/fresh/restore;244Node/lint/types/build PASS; local actual private-canary scan47bundles PASS. Official browser CI cancelled twice, retry requested: not a PASS or fully-green workflow. Issue29 remains unsuppressed. [Exact evidence](W1_TEL5_00_EXACT_HEAD_EVIDENCE.md). Earlier source references below are historical. No new TEL5 operations are claimed by this documentation checkpoint.

Accepted backend source c2a7390867d941a33b17509b3f4014f8356bb0c1; real Supabase 37361774116 / 1298 checks; native/quality 37361774252. 129/129 operations individually observed: 91 writes and 38 reads. All ui_safe:false; W2/W4 own visual/interaction review. W1 changed no frontend or W2 branch files.

Use [product-capabilities.json](contracts/product-capabilities.json) for exact operation/RPC, role, input/output type, transport, CAS and replay. Keep trusted cookie getUser/Auth user JWT, current active membership, canonical workspace binding, exact Origin/Host, bounded closed DTOs and no-store private responses. Writes use command_id unchanged across retry/recovery, expected_version where required; changed payload or stale CAS conflicts. A valid JWT does not imply current membership. Never use browser service_role, caller role/actor, raw tables or fabricated success.

| UI family | Backend contract | Rendering / review boundary |
|---|---|---|
| Inbox | INBOX_V1_CONTRACT.md / inbox.v1 | Internal only; assigned member vs owner/admin; viewer denied. Closed/reopened/archived states and self unread marker; no provider send indicator. |
| Automations | AUTOMATIONS_V1_CONTRACT.md / automations.v1 | Registered event/action selection only; disabled/edit/enable boundary, actual terminal effect/failed/skipped codes. No invented scheduler/retry/provider status. |
| Notifications | NOTIFICATIONS_V1_CONTRACT.md / notifications.v1 | Self center, bounded has_more and actual overdue refresh; safe target navigation; respect opt-out. |
| Preferences/business profile | SETTINGS_V1_CONTRACT.md / settings.v1 | Own nonsecurity preferences distinct from owner/admin workspace business profile and protected fiscal issuer. Private current PNG/JPEG logo, truthful integration availability. |
| Reveal | SENSITIVE_V1_CONTRACT.md / sensitive.v1 | Human explicit requested fields only; contact owner/admin/member vs fiscal owner/admin; no generic AI/state cache; audit failure means no reveal. |
| Imports | IMPORT_STAGING_V1_CONTRACT.md | Status/list/cancel available; processing blocked. Disposable encrypted fixture is not a production upload/validate/apply UI flow. CSV preview and XLSX unavailability must be truthful. |
| Team/origin | TEAM_ORIGIN_V1_CONTRACT.md | 7-day invitation expiry/reissue without mail/Auth grant. New proof vs declared/unverified legacy; no old source relabeling. |
| Documents | DOCUMENT_INTEGRITY_CLEANUP_V1_CONTRACT.md | Normal request/upload/finalize/download all six targets; maintenance additionally default-off. SHA256 only server-observed proof; scan_status:not_scanned, no green clean badge. Cleanup only expired pending lease, active artifact retained. |

The service document HTTP400 was a backend defect corrected in forward migration 20261005164500_document_target_ancestry_serialization.sql. Normal document has exactly one target; the private helper resolves same-workspace customer ancestry only for coded activity. This also fixes contract/line/service_case/opportunity and avoids weakening target/audit/RLS constraints. Actual service hash and cleanup are positive. Concurrent content witnesses serialize before shared manifest locks; 20 replay tests must remain intact.

Existing bounded native-currency dashboard/billing aggregates and CSV derived from authorized DTOs are retained; advanced history reports remain unavailable. Text/audio parser remains W2-owned. Deadlines use canonical resolve/dismiss/cancel plus new record with history; supersede is unavailable. Keep global versus self assignment scopes and unavailable roles explicit.

[Current closure](W1_PRODUCT_CLOSURE_20261005.md) supersedes historical 90/90 and 80-operation status prose. Exact executable evidence is separate from a later documentation checkpoint. W2's live parity/browser/visual evidence must be recorded against its own head after consuming this source, never inherited from W1.
