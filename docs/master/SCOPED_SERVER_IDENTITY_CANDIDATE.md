# Scoped server identity — candidate, no grant changes

Current 14 telecom server readers explicitly take an actor/workspace pair, run the
DB membership/status guard and have EXECUTE only for service_role. The repository
accepts an injected RPC client; this is not implemented credential provisioning.
PR25 proved checks with actual service-role RPC calls, not a scoped credential.

| Option | Supported mechanism / evidence | Decision |
|---|---|---|
| User JWT | Supabase Auth + PostgREST verified sub/role; canonical identity RPC derives `auth.uid()`; local candidate exercises own/foreign/forged-actor/revoked reads | Preferred for suitable identity projections; not an automatic replacement for 14 server readers |
| Custom Postgres role | Native role permissions; PostgREST role claim requires authenticator membership and trusted signing | Viable mechanism, NOT provisioned/tested as scoped service identity. No BYPASSRLS/raw access/role membership granted here |
| Current service_role | Global privileged API identity; each reader reauthorizes an explicit actor/workspace | Temporary server-only quarantine; scoped/revocable replacement remains Issue12 |

Never simply grant the current actor-parameter functions to authenticated: a caller
could supply another active actor. Any future user-context reader wrapper must derive
the actor from verified `auth.uid()`, preserve DTO minimization, authorize workspace
at every call and review browser accessibility. Service-to-service/background jobs
also need an explicit tenant-bound server principal and immediate DB revocation.

Compromise of global service_role has broad project blast radius and can select
arbitrary valid actor/tenant pairs; its DB scope guard does not constrain a compromised
credential. Do not expose it to browsers, models, logs or generic caller-selected API
operations. Literal client graph gate and the existing private bundle canary remain.
JWT replay before expiry still requires live membership/workspace reauthorization.
Rotate compromised machine credentials; validate old-token/key denial separately.
User membership revoke is not global-key revoke. Short TTL is not a revoke registry.

A custom-role candidate must have EXECUTE only approved wrappers, no raw tables,
no BYPASSRLS, bounded tenant/actor binding, live principal-status/epoch checks,
server-only injection, independent rotation/revoke custody and A/B/revocation/race
proof. Custom JWT minting introduces signing-key power and is not a free least-
privilege win. Test the exact hosted gateway/platform support before adoption.
No custom role or signing capability was created in this iteration.

Local identity-read proof is intentionally narrow. No server-reader factory migration,
background-principal provisioning or full assistant durability acceptance is asserted.
W2/W5 must select/review the path; W3 writes stay OFF under Issue10.

Official mechanisms checked 2026-10-01:
- https://supabase.com/docs/guides/database/postgres/roles
- https://supabase.com/docs/guides/auth/jwts
- https://postgrest.org/en/stable/references/auth.html
