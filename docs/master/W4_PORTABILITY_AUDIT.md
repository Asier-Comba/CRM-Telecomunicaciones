# W4 portability audit — 2026-09-27 UTC

Reviewed canonical6b0e30e7444de57100e4d983b3564a0c3b336b2c; domain PR15 remains e65f1e8. W2 backend takeover not yet observed at review. No Supabase account/project was contacted.

| Required signal | Current result | Evidence / limit |
|---|---|---|
| CAN_RECREATE_DB | YES for accepted identity scope; NO for complete CRM/platform | Four migrations apply verbatim in independent disposable PostgreSQL.29 relations+1RPC still classified missing for application domain; PR15 is separate/unaccepted |
| CAN_RECREATE_RLS | YES for versioned identity; PARTIAL overall | Membership/role/functions/policies/indexes/triggers in SQL; W4 actual A/B/suspension/removal/rollback probes pass. JWT/PostgREST/Storage/service principals not exercised |
| CAN_RECREATE_STORAGE | NO | No bucket declaration, Storage policy or object recovery manifest in canonical Supabase directory |
| AUTH_CONFIG_REPRODUCIBILITY | PARTIAL | auth.users/auth.uid fixture and app environment contract exist; real provider config, redirect allowlist, SMTP/OAuth/rate limits/MFA/session policy not captured as deployable config |
| MANUAL_PLATFORM_STATE | UNKNOWN | No authenticated platform inventory; cannot claim dashboard configuration exported. Require safe metadata export without credentials |
| HARDCODED_PROJECT_DEPENDENCIES | No hardcoded project URL found in scoped scan; broader review pending | Tracked src/supabase/scripts/.env.example scan for hosted Supabase project refs; no matches. This is not proof of portability of all external integration behavior |

Scope matters: CAN_INTEGRATE YES does not promise a recreated production Supabase project. The accepted base can support composition while W2 versions domain/config/platform assets.

## Environment and data

Environment example declares empty per-environment Supabase URL/publishable/service-role entries and server-only integration variables. It contains stale descriptions of removed optional routes/default-on demo modules; W2 should reconcile the contract to actual supported features before staging. No personal project/account ownership is required by versioned identity SQL.

No tracked seed file or supabase/config.toml observed. Existing UI/mock/eval files contain non-reserved email domains; this is not proof of real personal data, but also not certification of synthetic seed hygiene. No Arizan text matches found in scoped tracked source scan. Do not reuse mock records as a seed without reserved .invalid/example domains and independently verified fabricated identifiers. No email/phone/name values are reproduced in this audit.

W2 acceptance: provide versioned synthetic seed and manifest; no real customer data; recreate a disposable project with migrations, RLS, functions/triggers/indexes, private bucket config/policies and safe environment-name contract. Record remaining manual platform settings explicitly. Replace ownership via new environment secret bindings and provider config, not code edits to embedded account IDs. Interactive platform login is performed by the human; never paste access tokens/passwords into GitHub/chat/logs/screenshots.

Native PostgreSQL, Supabase local, remote DEV, PostgREST, Auth and Storage each require their own execution evidence. None is inferred from PGlite.
