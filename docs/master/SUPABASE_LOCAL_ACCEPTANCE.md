# Supabase local acceptance candidate

Parent: W2 platform `a917bbb41ef8192344dc49737cd78fd52fe29649`.
No PR23/PR24 composition; no migrations or product UI changed.

CLI pinned `2.119.0`; official setup action pinned v3.0.1 SHA. Dedicated disposable
GitHub Linux job uses tracked config and all migrations. Local Work has no Docker.
This is actual Supabase local, separate from PGlite and native-PG-only tests.
Current checkpoint proves stack startup only when CI passes; HTTP acceptance is
explicitly pending until the Auth/JWT/PostgREST/Storage runner executes.

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
