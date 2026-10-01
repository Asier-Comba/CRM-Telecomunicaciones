# Infrastructure portability

Operational contract; no hosted environment or company domain is accepted here.
The Supabase-local candidate validates only a disposable local platform.

| State | Git recreates | Remaining provider/environment work |
|---|---|---|
| Database | Ordered canonical migrations, constraints, triggers | Provision approved project/version; migrate validated tenant data |
| RLS/grants | Canonical SQL and acceptance harness | Verify actual API roles/default grants; PR24 independent adoption |
| Auth config | Local site URL/redirect allowlist; actual local Auth tests | Hosted redirect allowlist, session/password/MFA policy, custom SMTP/OAuth |
| Auth users | Synthetic users through Auth admin API in tests | Approved identity migration; signing keys/provider settings are separate |
| Storage config | Private buckets, MIME/size limits, metadata/object RLS | Migrate object bytes, reconcile metadata, verify downloads and revocation |
| Functions | Tracked SQL; server reader contracts | Provision narrowly scoped server principals; hosted function configuration |
| Code/config | Pinned lockfiles, CI, local config hash and migration head | VPS/reverse proxy/TLS/domains/n8n inventory and approved deployment |
| Secrets | Names/classes and injection boundaries | Company-controlled secret manager; actual values never enter Git |
| Provider-only state | Inventory requirement | Organization/admins, billing/recovery ownership, network, backup, SMTP/OAuth |

Tracked local configuration: API enabled/max100 rows; DB15; automatic seeding OFF;
Auth loopback site URL and exact callback; Storage private documents/quarantine,
10MiB and MIME allowlists. Omitted signup/session/email/password settings depend on
pinned CLI/service defaults; production must specify and verify its own approved
policy. Local development mail/basic login is not SMTP/MFA acceptance.

Environment boundary: DEV uses synthetic/disposable resources; STAGING has its
own project, accounts, credentials, data and release smoke; PROD has distinct
company ownership, least privilege and approved recovery. No QA seeds, destructive
tests, mutation evaluations or experimental migrations may target PROD.

New company project procedure:
1. Approve organization, two named admins/2FA, region/version, retention and owners.
2. Create an empty environment; inventory provider state and assign secret owners.
3. Apply reviewed config/migrations once; independently verify migration head,
   grants/RLS/API and nonproduction Auth/Storage acceptance before exposure.
4. Configure environment-specific Auth URLs, SMTP/OAuth, networks and secrets.
5. Migrate approved tenant data with FK/integrity checks; migrate Auth identities
   using supported provider tooling and separate key/session/reset planning.
6. Recover Storage object bytes separately; checksum and reconcile object/metadata
   bindings, orphans, private buckets, tenant reads and revoked-user access.
7. Run exact-release smoke, privileged principal review and recovery privilege
   matrix; obtain W4 staging acceptance before any real data or production move.
8. Roll back application/config to reviewed release; restore only into a new,
   unexposed environment, verify grants/RLS/objects, then approve traffic switch.
   Do not silently reverse destructive migrations or restore into live production.

Portability scan: no hosted Supabase ref/URL/password or developer absolute path
found in scanned active source/config. Two inherited calendar comments contain
personal-email examples; inspection found examples only, not an execution or
authorization dependency. No new calendar security finding is asserted.
`profiles.workspace_id` is UX preference; membership/status and server context
authorize access. Raw RLS union for a legitimate multi-member differs from a
server reader's explicitly selected and reauthorized tenant scope.

Global service-role bypasses RLS. It must stay server-only; this candidate proves
RPC actor/membership checks, not credential-scoped principal provisioning. Prefer
authenticated-JWT access to permitted projections where viable; server-only
readers require a separately reviewed scoped/revocable principal path.

Current unknowns: hosted configuration/accounts, SMTP/MFA, VPS/n8n, remote data,
signing/provider secrets, encrypted/offsite DB/object/Auth/config recovery.
An individual's existing Supabase can only be an approved temporary DEV resource;
it is never an architectural dependency or accepted STAGING/PROD environment.
