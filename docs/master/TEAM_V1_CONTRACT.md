# team.v1 protected internal management

Normal USERJWT; workspace selected by server cookie/session and active membership.
Owner/admin only. POST /api/team/v1/commands and /queries require canonical Host,
Origin and same-origin Fetch Metadata, bounded JSON and the default-off PRODUCT_V1_ENABLED
flag plus PRODUCT_V1_ORIGIN. No service-role or assistant principal is used.

| Operation | Input | Effect |
| --- | --- | --- |
| member.list | limit 1..100, after_id optional | UUID-ordered membership id/user_id/role/status/version only |
| member.invite_intent | command_id, normalized email, role admin/member/viewer | Protected pending intent; no email, Auth user or membership created |
| member.cancel_invite | command_id, id, expected_version | Pending intent becomes cancelled |
| member.role_change | command_id, membership id, expected_version, role | Active membership role change |
| member.suspend | command_id, membership id, expected_version | Active membership becomes suspended |
| member.resume | command_id, membership id, expected_version | Suspended membership becomes active |
| member.remove | command_id, membership id, expected_version | Membership becomes removed; retained identity/audit |

Owner rows and the caller's own membership cannot be changed. Admins cannot
manage admin rows, grant admin, or create/cancel admin invitation intents. Only
owners may grant or manage admin. The surface cannot grant owner or mutate Auth.
Removed membership is terminal here; invitation acceptance/re-onboarding is OPEN.
This preserves at least one owner by forbidding all owner mutation in these commands.

Version is authored by SQL, including direct privileged membership status changes.
CAS requires the exact current version; each committed update increments once.
Same actor/workspace/command_id with identical canonical input returns one receipt;
changed input conflicts. Active scope and role authority are checked before replay.
The shared product HMAC command ledger and coded audit commit atomically with state.
Audits contain operation/id/version, not email or roster blobs. Intent email remains
in a private forced-RLS table without raw public/anon/authenticated/service-role grants.

Removal/suspension invalidates ordinary CRM commands with a still-valid Auth JWT.
No mail/provider action, invitation acceptance, Auth admin endpoint, assistant
registration or UI change exists. Candidate UI enablement still requires W4/W2 review.

Local verification: SQL owner/admin/member/anon/service-role/foreign controls,
CAS/replay/changed replay, version increments, protected owner and audit cut rollback.
Actual acceptance adds 20 same-intent replays, 20 distinct roster CAS attempts,
valid-JWT product replay revocation, official SSR-cookie Next reads and internal intents.
Its result must be read from the published checkpoint CI; local PGlite is not Supabase.
