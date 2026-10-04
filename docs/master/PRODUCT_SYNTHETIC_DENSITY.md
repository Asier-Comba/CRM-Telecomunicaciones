# Product synthetic operational density

`supabase/seeds/synthetic_product.sql` is deterministic and transactional. It requires an explicitly isolated test database with `app.environment=test`; repeated installation rejects rather than mutating existing records. All identities use reserved `example.invalid` addresses. Fiscal identifiers, phone numbers, passwords and line identifiers are absent. UUIDs derive from fixed synthetic namespace strings. Dates are fixed in September–November 2026.

Two tenants hold 25 companies (24 in A, one foreign sentinel in B), 50 contacts, four users (two commercial members plus the A owner, and B owner), six operators/plans/immutable revisions, 50 contracts/services/renewals/permanences, 400 lines, 100 opportunities including open/won/lost, 150 tasks including pending/in-progress/completed/cancelled, 75 meetings including scheduled/completed, and 25 coded activities. These are setup facts, not fabricated command audit records or billing revenue.

The density fixture runs the authenticated product reads: exact A workspace and assignment counts, bounded search with five per kind, absence of sensitive search fields, foreign tenant rejection and all 312 calendar entries through 45 small cursor pages without omissions/duplicates. The seed is rolled back in regression harnesses to preserve existing recovery sentinel counts. The standalone seed commits for a disposable demo database only; it does not create login passwords or an app login session.

Native PostgreSQL CI retains JSON EXPLAIN ANALYZE/BUFFERS for due-task and line/service queries against this density. Plans are observations at this fixture size, not a production performance SLA. No speculative indexes are added. Embedded 31-migration fresh/restored assertions pass. Native density execution remains pending its checkpoint CI.

Billing draft/issued/paid/overdue and document/inbox/notification density await their product implementations and acceptance; this operational seed does not claim those sections complete. Current handoff uses existing product.v1 routes; UI enablement remains W2-owned.
