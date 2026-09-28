# Platform environment contract (draft)

Local `supabase/config.toml` versions Auth URL, private buckets and limits.
Hosted DEV, staging and production each need a separate project, database,
Storage and secret bindings. Do not copy secrets across them. No hosted project
has been inventoried or changed by W5.

| Setting | Local | Hosted decision / gate |
| --- | --- | --- |
| Project URL and publishable key | Local CLI output | Per-environment public binding; never use a different product's project |
| Service-role credential | Server only | Separate environment secret; narrow RPC adapter and rotation plan; never browser/model |
| Cursor encryption key | Server-only 32-byte key | Unique per environment; rotate with bounded token lifetime |
| Auth URL/redirect allowlist | Loopback callback | Explicit exact origins/callbacks; separately verify production domain ownership |
| Auth sessions/MFA/rate limits | Local defaults only | Inventory provider config and agree policy before commercial launch |
| SMTP sender/domain | Local mail catcher | Verified domain, secret-managed SMTP/API credential, delivery and bounce tests |
| OAuth provider | Disabled unless configured | Per-environment client ID/secret and exact callback allowlist |
| Storage | Private document + closed ZIP quarantine | Real API/JWT tests, object recovery and scanning flow before customer files |
| Integration and AI keys | Unset by default | Per-environment scoped identity, rotation, owner and audit |
| Backup encryption key | None in test | External KMS/secret manager, never committed or reused between environments |

Only the public URL/publishable key may use `NEXT_PUBLIC_`. Hosted settings
cannot be inferred from local TOML; export a redacted config inventory and
compare it before promotion. No real customer imports or files are authorized.

An environment handover needs two independent administrators, source control
access, a fresh secret binding, DNS/domain ownership verification, a restore
exercise, and a documented rotation/revocation path. RPO/RTO and retention are
human policy decisions tracked in `BACKUP_DR.md`.

Current gaps: no local Supabase CLI/Auth/PostgREST/Storage API run, no hosted
inventory, no native PostgreSQL backup, no mail deliverability evidence, and
no executable scoped service principal. These block staging/commercial claims.
