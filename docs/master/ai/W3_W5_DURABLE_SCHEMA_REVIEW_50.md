# W3 review of W5 durable foundation

Target: `3370dc1f1517523e1fd9c3e77ae73552293ab59c`, PR18.
Source: `supabase/migrations/20260927183000_assistant_durable_foundation.sql`.
Scope: static contract mapping, no SQL execution or independent security acceptance.
W5 requested this review on PR9 before implementing the adapter. Findings posted
immediately on PR18; W5 owns SQL fixes and W4 independently validates them.

## Concrete incompatibility

`reconciliation.ts` emits exactly `effect_absence_verified_retryable` or
`effect_absence_verified_terminal` when verifier proves absence. The SQL operation
failure_code constraint permits only temporary_unavailable, validation, conflict,
access_revoked and internal_safe. Neither real reconciliation outcome is admitted.
W5 must add the actual registered durable domain codes through its forward change;
do not silently map verified absence into unrelated telecom read errors.

`assistant_operations.lease_expires_at` also permits null while
`DurableIdempotencyRecord.leaseExpiresAt` requires a timestamp. The adapter must
persist and return an authoritative timestamp for every operation record, including
reserved, or propose a reviewed versioned port change. A timestamp generated on
each lookup is not durable lease state. Reserved itself never authorizes an effect.

Portable probe: `node scripts/check-durable-schema-compatibility.mjs <exact-SHA>`.
Exit1 reports these source mismatches, not a broken W3 unit suite. Exit2 means
source shape changed/unavailable and requires manual review. It deliberately
parses only this known DDL shape; it is not a general SQL validator. Evidence JSON
is `W3_W5_DURABLE_SCHEMA_EVIDENCE_50.json`. No native DB test is claimed.

## Aligned foundation concepts

Separate confirmation/operation IDs; unique confirmation association per workspace;
full confirmation binding FK including digest algorithm; workspace/capability/key
reservation uniqueness; same-workspace full-binding operation/outbox FK and one
outbox per operation; exact state enums/digest identifier; issued expiry <=5min;
safe integer bounds; inert grants/forced RLS and recovery indexes.

## Expected pending implementation, not newly claimed exploits

This DDL intentionally has no active transaction adapter: transition validity,
binding immutability, CAS/auth/lease fencing still need transactional enforcement.
Registered dispatcher+command catalog, safe result/schema version, immutable audit
intent and delivery outbox are absent. Outbox worker/receipt/failure text currently
has no admission bounds; add validated mapping before those fields reach W3.
The actor FK references auth.users: this is user-only persistence, not proof of a
service-principal model. Never synthesize an auth.users identity for a worker.

No writes are enabled. The schema foundation does not implement the required
ReconciliationPersistence/DurableDatabasePort or native process driver. W3 will
consume the exact adapter checkpoint when published; W4 alone accepts durability.
