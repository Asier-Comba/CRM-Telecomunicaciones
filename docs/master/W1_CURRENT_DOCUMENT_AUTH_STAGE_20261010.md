# Current-document access diagnostics — 2026-10-10

PR113 source `afb4de472fa27a88600caaca6cbe4f901959f5c2`, executed
`cee56072ce8014dec8f3be1e68d99ba54a93ffe2`, tree
`5a73b21f94b4e52878da05c5eaaec155acfcc6f7` failed its own whole-product
run38004901162/job114071322553 at106/107, portfolio desktop current request.
The admin integrated journey passed that attempt. Its frozen failure remains
unaccepted and is not retried or consumed in canonical38@158.

The one failure screenshot actually viewed shows `Verificando acceso...`.
Current-document observation recorded0 auth-user GET requests, with navigation
completed. This cannot distinguish SSR before hydration from a pending SDK
call. An in-process probe of the installed SDK with synchronous callback and
`void` identity read did not reproduce a deadlock. Neither observation
establishes the original root cause or authorization.

This unit adds only closed DOM lifecycle markers to AuthGate and one ordinary
current-document DOM observation to the existing portfolio check. The marker
distinguishes `before_effect`, `legacy_checking`, `user_pending`,
`user_returned`, `client_unavailable`, and `access_error`. The observer returns
`not_present`, `document_changed`, or `unavailable` where applicable. Unknown
values and evaluation exceptions are discarded. No body, cookie, token, user,
membership, URL, or exception text is retained in the report. A lifecycle
marker is diagnostic evidence, never authentication or authorization proof.

The existing request/response/typed-DTO checks, API/RLS/CAS, `getUser`, redirects,
read and command counts, timeout budgets and retry policy remain unchanged.
The diagnostic observer adds no HTTP request and does not grant content.
Disposed components cannot write lifecycle markers or grant a late identity.

Verification includes the existing auth rejection and portfolio correlation
regressions, three closed-marker negative tests, and six desktop/mobile
Playwright cases using the actual component with production React, SSR and
hydration over loopback HTTP. Those fixtures use memory identity results and
do not prove real Auth/DB, full-app Windows installation, or the original
failure cause. Own CI/native/whole-product/visual acceptance is pending.

Canonical38@158 and accepted isolated110/112/109/114 remain unchanged. This
diagnostic candidate includes unaccepted113 ancestry and requires its own
complete acceptance before composition. Audit5HIGH/#29, physical durability
23/W4/#22, live model, persistent Windows and commercial release stay open;
AI business writes stay OFF.
