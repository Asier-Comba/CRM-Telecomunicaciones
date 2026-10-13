# Rejected access checks return to the existing controlled login error

AuthGate launched checkAccess without observing rejection. An exception during
getUser, getSession or the profile chain left the component at Verificando acceso
and emitted an unhandled promise rejection, with no navigation. Native browser
reproduction uses the actual unchanged f8e711 AuthGate and production React19,
an in-memory auth client and router: valid identity renders synthetic protected
content; missing identity redirects to /login; thrown synthetic getUser exception
leaves the spinner, one rejection, zero redirects. ComponentSHA256 before:
f45eeef8e24455841a1e3f04ab6245140013ae9f5a866b3f4d9226522cf5a81c.
No real Auth session, cookies, membership, SQL or server cause is established by
the native fixture.

The effect now catches rejected checks while mounted, clears any previous local
allowance and redirects to /login?error=access_check. The existing login page
already explains this controlled error. Original exception details are neither
serialized nor logged. Unmounted effects perform no state update or redirect.
Authenticated getUser success and ordinary missing-user denial are unchanged.
No token/cache/demo fallback, retry, new request, time budget, permission grant,
membership bypass, sign-out, SQL/RLS, dependency or provider change is introduced.

Native production React after the fix verifies the same three cases: one identity
read each, zero unhandled rejections; valid identity renders the same content,
missing identity redirects /login, thrown identity failure redirects to the
closed access_check route without protected content. ComponentSHA256 after:
d12f9355e090fc1f64e07f85c400e6c5ec1c415a03288f0f307c27b641631e26.
Five component-effect regressions execute the actual transpiled AuthGate with
controlled dependencies: rejection clears earlier allowance without retry or
private details; late rejection after disposal is inert; verified success still
requires getUser; missing client/user and an error result never grant integrated
content; non-integrated session/profile exceptions fail closed in production
even with the development force flag present. They are component lifecycle tests,
not real JWT revocation or current workspace authority proof.

Observed103 attempt1 sourcef8e711d47cd22f9403e60719fff20349c88579ad/executed
7a50e0e70ddee41282b77571da11d06ca579b241/tree
05ee586dd1114d883021a3d9346e2e341c990110 retains Supabase37981798580/
job113993896737 FAILURE106/107, action
layout:portfolio:768:exact_reference:current_request TIMEOUT. Actual failed frame
contains only Verificando acceso, before portfolio.get. Auth73/backend3535+227/
history/grounding/Storage/teardown pass, zero browser errors and no server category.
This differs from the reproduced rejection path's unhandled rejection, so the
original server/client stall cause remains unknown. One unchanged-source repeat
job114004947233 is separate evidence; no claimed fix or replacement of attempt1.

Official Supabase getUser documentation and current changelog were inspected
9October2026. getUser remains the server-validated identity check:
https://supabase.com/docs/reference/javascript/auth-getuser
https://supabase.com/changelog.md
Current Next16.3.8 bundled debugging guide was read before editing. No SDK API or
version change is required. Candidate must close its own complete107/Auth/history/
grounding/Storage/teardown, quality and fresh visual review before canonical
adoption; accepted9cf or102 evidence is not inherited.

Issue10 physical adapter/dispatcher/native races/crashes/restart and independent
W4, issue29 fiveHIGH, persistent Windows, live semantics and commercial acceptance
remain open. Business AI writes OFF; main/production/VPS/providers/W4W5 unchanged.
