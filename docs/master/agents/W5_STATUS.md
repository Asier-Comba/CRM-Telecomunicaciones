# W5 platform checkpoint

VERIFIED: 2026-09-28 UTC
BRANCH: w5/backend-platform-v1, based on W2 8de57dc2f84634156655f6c79047d545bbb86a6c
HEAD: storage checkpoint 26c296a589dc41b0015876e4498acd6db1f24098; durable schema checkpoint pending
PR: #18 draft, stacked against w2/backend-takeover-v1
CI: #202 PASS at storage checkpoint; durable schema head pending; local lint/typecheck, 117 bootstrap tests, audit (0 high), build pass
POSTGRES: native PostgreSQL unavailable in this runner; embedded PGlite zero-to-head 22 migrations and domain/server-read fixtures pass
SUPABASE_LOCAL: not exercised
SUPABASE_REMOTE: untouched
DB_READS: all 14 published operations wired to DB-backed scoped readers; dashboard personal/workspace populated, team unavailable until a team authority model exists; personal renewals/permanences reported unavailable because they lack personal attribution
RLS: active membership/workspace checked in contract RPCs; embedded tenant denial probes pass; native RLS pending
STORAGE: private document and ZIP quarantine buckets versioned; document SELECT policy tied to active metadata/membership; no direct client writes; real Storage API untested
DURABILITY: confirmation/operation/outbox tables, binding FKs, unique keys, forced RLS and recovery indexes drafted; W3 transaction adapter, audit/result storage and native process evidence absent; writes disabled
BACKUP: synthetic PGlite snapshot/restore test only; native encrypted backup and Storage restore pending
PORTABILITY: versioned local config and guarded synthetic A/B seed; Storage stub exercises SQL policy only; no local Supabase Auth/PostgREST/Storage API evidence
BLOCKERS: native PostgreSQL and Supabase local runtime absent; platform review W4 pending; no real customer data authorized
NEXT 3: native PostgreSQL/Supabase Auth and Storage test; W3 durable DB adapter; encrypted native backup and object recovery

Portfolio readers use forward-only migrations with service-only grants, active membership
checks, bounded keyset pages and redacted references. The existing read service
runtime parser rejects malformed projections. The SQL fixture covers basic scope,
shape and negative actor checks. This checkpoint is not staging approval.

ZIP quarantine: the private `telecom-import-quarantine` bucket has no client
policies or extraction/upload route. The future server workflow must verify
extension, magic bytes, archive structure, entry count, compressed and expanded
limits, path traversal/symlinks, nesting, malware disposition and isolated
encrypted processing before moving any approved object. No ZIP or real customer
data is accepted in this checkpoint.
