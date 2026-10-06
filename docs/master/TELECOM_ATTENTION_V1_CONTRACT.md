# Deterministic telecom attention v1

Candidate operation `telecom.attention`, POST `/api/telecom/attention/v1`. Owner/admin/member/viewer safe reads; SSR cookie, current active membership and default-off Product v1 flag/origin/no-store policies. No AI registration or new writes.

| Kind | Qualifying facts | Reason |
|---|---|---|
| renewal | Open target at most 30 Madrid calendar days ahead; historical overdue retained in requested window | renewal_overdue / renewal_upcoming |
| permanence | Administrative open, ending today through day30 | permanence_ending |
| case | Four active states, high/urgent priority or overdue due_on | case_urgent / case_overdue |
| task | Pending/in_progress, actual due_at earlier than statement time | task_overdue |
| meeting | Scheduled, future starts_at through day30 | meeting_upcoming |
| opportunity | Open, no nonblank next_action and no linked pending/in_progress task or future scheduled meeting | opportunity_missing_next_action |
| portability | Latest attempt per line, draft/requested/scheduled/in_progress/rejected | portability_pending / portability_blocked |

A stored follow-up date alone is not a next action. Superseded rejection is not displayed as a current blocker. All states are current domain facts; no provider truth inferred.

Required window_from/window_to canonical dates2000..2100, inclusive difference <=366 days. Optional customer_id, owner_user_id, kind, limit1..100(default50). Customer lookup preserves tenant hiding. A row includes only kind/id/customer_id/owner_user_id/sort_on/due_on/status/reason_code/priority. No names, notes, titles, identifiers or provider payloads.

Stable keyset ordered by (sort_on, ASCII kind, UUID). Cursor requires after_sort_on/after_kind/after_id plus fallback_on; all-or-none. Undated urgent cases and opportunities retain due_on null; fallback_on is a pinned Madrid date (maximum seven-day cursor age) used only for ordering. Carry all cursor fields verbatim. Every family applies filters/cursor before fetching at most limit+1; merged result contains <=limit rows. Current-state pagination is not an immutable historical snapshot: facts changing between requests can legitimately change eligibility.

Forward migration64 adds two functions, closed validator private, query authenticated-only. No table CRUD. Native fresh and logical restore, embedded fixture, real Supabase Auth/JWT/PostgREST/application transport plus seven families/pagination/next-action suppression/privacy and valid-JWT revocation required before acceptance. Seven Node tests validate boundary and DTO semantics. Reconstructed from canonical source after execution workspace disconnected; prior combined local tests are supplementary, not exact source proof. Exact acceptance pending publication.
