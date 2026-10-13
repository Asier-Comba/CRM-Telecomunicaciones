# W2 Cartera startup: distinguish headers from script completion

Source F736 Supabase run38438800755 failed106/107 at
`layout:portfolio:1440:exact_reference:current_request`. Auth, history, grounding
and teardown passed. Its screenshot shows the access gate. Closed observations
report `before_effect`, zero current auth reads and five successful Next script
headers, with no observed page errors. The complete startup cause is UNKNOWN.

Those headers do not prove complete script delivery. The passive observer now
also counts tracked `requestfinished` events and scripts whose completion remains
unobserved. Duplicate, untracked and successor-document events cannot add proof.
No script bytes, URLs, headers, private errors or identities enter the report.
The observer starts no requests and changes no assertion, timeout or permission.

Two parent-negative tests verify this additional measurement; all nine existing
and new observer tests pass after correction. They are synthetic event tests,
not browser startup evidence or a fix for the original failure. A new source's
physical acceptance must supply the actual measurements. Old evidence remains
header-only, with body completion NOT_RECORDED rather than fabricated zero.

The source retains request6150211191's exact caller portability correction.
It requires complete new own controls; no results are inherited from F736 or
DA03. Full23 remains NOT_RUN, business AI writes OFF, release NOT_ACCEPTED.
