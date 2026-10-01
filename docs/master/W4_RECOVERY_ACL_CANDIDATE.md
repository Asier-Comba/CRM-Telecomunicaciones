# W4 ACL recovery candidate — owner review pending

Reconstructed after scratch rollback; this is not recovered original file content.
Parent PR19: `a917bbb41ef8192344dc49737cd78fd52fe29649`. Issue22 stays open.

Pattern A preserves dump ACLs (`--no-owner`, no `--no-acl`) inside the existing
disposable PostgreSQL16 cluster with pre-existing required roles. The checked
manifest covers all 62 application functions; fresh/restored metadata compares
effective function grants, raw table/sequence grants, RLS/Storage policies, schema
usage, default privileges and role flags. Actual calls under anon/authenticated
must deny all14 server READ RPCs; service-role positive, foreign ID/actor/workspace,
removed/suspended membership and suspended workspace controls run on both DBs.
The deliberate `--no-acl` negative restore must fail the gate and reproduce the
historical anonymous synthetic-reader attack. No tenant contents are logged.

Local evidence is PGlite and metadata-validator tests only. Native PostgreSQL16
dump/checksum/new-database restore and role matrix require candidate CI. Neither
PGlite nor native CI proves Supabase Auth/PostgREST/Storage APIs or commercial DR.
No migration/grant/auth implementation changes. For a different owner/environment
role model, reviewed role/owner/default-privilege mapping is required before
exposure; never use this transient unencrypted synthetic dump for production.

W2/W5: review exact candidate native CI, the role model and manifest before
integration. W3: durable adapter/process evidence is still absent (Issue10).
CAN_STAGE=NO. CAN_PRODUCE=NO. No production restore or assistant writes.
