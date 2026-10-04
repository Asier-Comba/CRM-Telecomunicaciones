# Dashboard v2, search and local product transport

B3 source ce8b1fd, CI282/run37214703629: 165 tests/lint/types/build PASS; PostgreSQL16 fresh/restored 102-function matrices, ACL-loss negative control and 20 independent creates/20 CAS edits for each task/meeting/opportunity PASS. Full quality FAIL solely at inherited npm audit Issue29; skipped jobs are not passes.

## B5 contracts

Types `product-dashboard-v2.ts`; `ProductServiceV1.dashboard(input)` and `.globalSearch(input)`. Existing telecom.v1 untouched.

Dashboard input: optional audience (`my` default, `workspace`, `team`), period (`month` default, `quarter`, `semester`, `year`, `all`), anchor_date (Gregorian date; default authoritative server Madrid date). workspace requires owner/admin; my allows active members/viewers. team explicitly unavailable because no canonical teams exist.

Output version `product.dashboard.v2`: snapshot_counts customers/contracts/services/lines/opportunities/tasks/meetings/renewals/permanences; period_counts customers_created/tasks_due/meetings_scheduled/renewals_due/permanences_due/opportunities_closed; 20 latest coded activities; financial=null with status unavailable. Snapshot counts are **current** and do not become historical because a period was selected. Period boundaries are Madrid dates, exclusive end. all has null boundaries. My services/lines/renewals/permanences follow contract assignment; my activities follow actor; other records use their own assignment. No unlabeled revenue/zero/growth claim.

Search input query 2–100 characters, default20/max50 results, max5 per kind. Kinds customer/contact/contract/service/line/opportunity. Literal substring matching with exact/prefix/substring ranking and stable kind/label/UUID tie-break; no regex, wildcard SQL or arbitrary sort. Safe label/status/UUID/customer UUID only. Contact phone/email and fiscal or line identifiers are absent from both match corpus and returned DTO. Invoice search is pending billing implementation. Runtime validators reject extra fields, malformed values, duplicate/oversize results and unmatched labels.

## HTTP transport

Uses the existing POST `/api/product/v1/commands` and `/api/product/v1/queries` routes from c5193dc. Closed body `{operation,input}`. Query operations: customer.editor, contact.editors, work.get, calendar.list, opportunity.stages, dashboard.get and global.search. The last two invoke the new typed service methods.

Supabase getUser and active workspace membership resolve cookie authority on the server. Body actor/workspace/role overrides are rejected; request headers do not select the tenant. Server-configured canonical origin and exact Host/Origin matching, JSON UTF-8, streaming 12288-byte limit, safe error mapping and no-store responses apply. Missing/cross-site origins fail before mutation. `PRODUCT_V1_ENABLED=true` and `PRODUCT_V1_ORIGIN` (an exact absolute HTTP(S) origin, no path/query/userinfo) are required; default is disabled. This checkpoint does not authorize production deployment or activate frontend controls. Normal customer/contact writes and contact editors now allow active members under migration 20261004163000; workspace dashboard remains explicitly owner/admin only.

## Actual platform harness

Extends the existing isolated Supabase harness and Next server without introducing a second transport. It adds real GoTrue JWT → PostgREST races: 20 simultaneous identical creates and 20 competing CAS edits per task/meeting/opportunity, one CAS winner, 19 conflicts and exactly two audit records. Checks include interval overlap, owner/member dashboard scope, unavailable team scope, safe search, foreign workspace denial, real SSR-cookie Next queries, and membership suspension while Auth still accepts the JWT.

The original Auth/JWT/PostgREST/Storage controls remain in place. GitHub CI uses the pinned official local CLI and isolated Docker stack with teardown and a safe summary. This executor has no Docker/psql; actual platform results remain pending until that CI job executes. Local validation before origin fix: 170 Node tests, lint, types and build PASS; 31 migrations and B3/B5 SQL with 104-function privilege manifest PASS in the embedded PostgreSQL harness. Native B5 and actual Supabase acceptance are not inferred from those checks. Issue29 still blocks full quality at npm audit.

## Canonical-origin correction

Actual Next production-server reproduction on loopback showed incoming Host127.0.0.1 but request.url normalized to localhost. Comparing browser Origin to that internal URL incorrectly returned403. Product transport now requires server-configured PRODUCT_V1_ORIGIN, matches both request Host and Origin exactly, and ignores forwarded-host authority. Missing/malformed configuration returns503. Tests cover the normalized internal URL, hostile Host/Origin, null/missing origin and malformed config; no wildcard or broad CSRF exception is used. Actual Supabase run7 confirmed Next403/access_denied; corrected exact-head platform acceptance is queued.

Actual Supabase run9/37217995302 on d1345e0 now PASS with379 checks, including B3/B5 real user-JWT races/revocation and SSR-cookie Next reads. CI288 native33 migrations/126-function matrix/races/density PASS. New Host hardening requires a fresh exact-head acceptance; UI activation remains pending W4/W2 review. Per-operation catalog avoids claiming unexercised lifecycle operations individually passed.
