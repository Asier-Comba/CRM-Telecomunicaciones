# Supabase local acceptance candidate

Parent: W2 platform `a917bbb41ef8192344dc49737cd78fd52fe29649`.
No PR23/PR24 composition; no migrations or product UI changed.

CLI pinned `2.119.0`; official setup action pinned v3.0.1 SHA. Dedicated disposable
GitHub Linux job uses tracked config and all migrations. Local Work has no Docker.
This is actual Supabase local, separate from PGlite and native-PG-only tests.
Stack checkpoint `a514a5f` executed dedicated workflow run36883236864: CLI2.119.0,
real PostgreSQL15.19, all25 migrations and teardown PASS. HTTP acceptance is
explicitly pending until the next Auth/JWT/PostgREST/Storage runner executes.

HTTP runner creates10 real Auth users and sessions (no fake auth.uid), verifies
JWT identity via Auth and database RPC, and tests core identity projections,
server-only raw relations, all14 privileged readers, A/B, multi-membership and
profile preference mismatch. Actual private Storage setup uses harmless text
bytes under permitted MIME labels; no real document/archive or extraction.
Owner/admin positive, member/viewer/foreign/anon deny, listing/existence,
orphan/metadata archive, upload/delete/move/copy and quarantine are exercised.
Revocation reuses the same still-valid JWT after formerly authorized admins lose
membership/access. Service-role calls are labeled privileged RPC evidence, never
user RLS. Signed capabilities, scoped service principals, hosted APIs/SMTP/MFA and
commercial recovery remain separate unmet gates.

Raw CLI output, credentials, JWTs, passwords and provider payloads never enter
logs/artifacts. Only bounded stage/errors, versions/images, config hash, migration
head and safe test summary are retained. Stack teardown affects only this fresh
CI project. No hosted token/link, real data, emails, assistant writes or deployment.

CLI flags/release verified from official sources:
- https://supabase.com/docs/reference/cli/supabase-start
- https://supabase.com/docs/reference/cli/supabase-status
- https://github.com/supabase/cli/releases/tag/v2.119.0
- https://github.com/supabase/setup-cli/tree/45a513f8c64c0bc8e0e3dfe572b5c95be85f6359

Issue12 remains open; CAN_STAGE=NO; CAN_PRODUCE=NO. Owner review required.
