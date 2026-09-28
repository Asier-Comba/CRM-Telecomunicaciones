# W5 platform checkpoint

VERIFIED: 2026-09-28 UTC
BRANCH: w5/backend-platform-v1, based on W2 8de57dc2f84634156655f6c79047d545bbb86a6c
HEAD: native PostgreSQL 16 restore checkpoint b19ac8265fb9f4fc5e1bdbc513be0e16c0d0fe7c; platform handoff pending
PR: #18 draft, stacked against w2/backend-takeover-v1
CI: #214 native PostgreSQL, embedded DB, migration policy, baseline and secret scan PASS; lint/types/tests/build was still running when recorded; Dependency Review skipped until repository owner enables Dependency Graph and DEPENDENCY_REVIEW_ENABLED=true
POSTGRES: CI #214 PostgreSQL 16 native zero-to-head and synthetic pg_dump/pg_restore PASS (24 migrations); embedded PGlite 24 migrations pass
SUPABASE_LOCAL: not exercised
SUPABASE_REMOTE: untouched
DB_READS: all 14 published operations wired to DB-backed scoped readers; dashboard personal/workspace populated, team unavailable until a team authority model exists; personal renewals/permanences reported unavailable because they lack personal attribution
RLS: active membership/workspace checked in contract RPCs; embedded and native synthetic scope/denial fixtures pass
STORAGE: private document and ZIP quarantine buckets versioned; document SELECT requires active owner/admin plus active metadata, ordinary member denied; no direct client writes; real Storage API untested
DURABILITY: confirmation/operation/outbox tables, binding FKs, unique keys, forced RLS and recovery indexes drafted; W3 transaction adapter, audit/result storage and native process evidence absent; writes disabled
BACKUP: synthetic PGlite and isolated native pg_dump/pg_restore CI drills passed; encryption, offsite, Auth, Storage object and complete recovery pending
PORTABILITY: versioned local config/guarded synthetic A/B seed and platform environment matrix; Storage stub exercises SQL policy only; no local Supabase Auth/PostgREST/Storage API evidence
BLOCKERS: Supabase local runtime absent; platform review W4 pending; no real customer data authorized
NEXT 3: Supabase Auth and Storage API integration test; W3 durable DB adapter; encrypted offsite backup and full object recovery

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
