# W5 platform checkpoint

VERIFIED: 2026-09-28 UTC
BRANCH: w5/backend-platform-v1, based on W2 8de57dc2f84634156655f6c79047d545bbb86a6c
HEAD: pending first checkpoint publication
PR: pending draft stacked PR against w2/backend-takeover-v1
CI: pending; local lint/typecheck, 114 bootstrap tests, audit (0 high), build baseline pass
POSTGRES: native PostgreSQL unavailable in this runner; embedded PGlite zero-to-head 15 migrations and domain/server-read fixtures pass
SUPABASE_LOCAL: not exercised
SUPABASE_REMOTE: untouched
DB_READS: customer.search/get/summary and contract.list/get implemented; nine published READs still unavailable
RLS: active membership/workspace checked in contract RPCs; embedded tenant denial probes pass; native RLS pending
STORAGE: not implemented
DURABILITY: W3 PostgreSQL adapter not implemented; assistant writes disabled
BACKUP: no tested commercial backup/restore
PORTABILITY: no local Supabase Auth/PostgREST/Storage evidence
BLOCKERS: native PostgreSQL and Supabase local runtime absent; platform review W4 pending; no real customer data authorized
NEXT 3: complete portfolio readers; run native PostgreSQL scope tests; publish reproducible config/seed and recovery drill

Contract readers use a forward-only migration with service-only grants, active membership
checks, bounded keyset pages and redacted references. The existing read service
runtime parser rejects malformed projections. The SQL fixture covers basic scope,
shape and negative actor checks. This checkpoint is not staging approval.
