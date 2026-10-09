# W2 — Invoice states in the product language

Owner: W2 shared status presentation and billing browser consumer. Base: accepted mobile-history source `c2b3f01efd0d4f67309d29c7776c9e732f7d9a16`, PR #45. No backend or W3 contract changes.

## Actual observed issue

Artifact11585353128 of real Supabase run37858184829/job113587337893 (107/107) includes `billing-lower-390.png`: invoice badges expose raw `paid` and `issued` codes. Existing filters already use Spanish labels. The shared status formatter now translates issued/paid/trashed to Emitida/Cobrada/Papelera. Paid uses the existing successful badge appearance; overdue uses the existing warning appearance. Visible text carries the meaning independent of color. Status values, calculations, currency separation, HTTP/RPC data and allowed transitions are unchanged.

The original real draft/issue/PDF/payment journey checks the Spanish selected-invoice states and list badges after actual emission/payment. It also records paid-invoice captures at1440/768/390 after scrolling the selected detail into view and preserves the authorized/private frozen-PDF byte checks and SQL persistence. The original reverse-payment/trash/restore journey requires its Spanish paper-bin state. All107 journeys remain; no fixtures replace real Auth/PostgREST/Storage, no budget changes or retries are introduced.

## Validation

Windows changed-file ESLint, types and browser syntax: PASS. The actual existing SQL invoice-list contract includes each state unless an explicit status filter is supplied, so list assertions preserve the ordinary UI's query. No redundant mapping unit test is added. Complete quality and Supabase/history/UI acceptance are required on this exact source; a previously green base is not this change's acceptance. Local heavy stack/build remains resource-blocked; Docker remains stopped. Full audit5HIGH remains enforced by #29. #10/independent W4 still block AI business writes, which remain disabled. No main, production or W4/W5 infrastructure change.

Next three: collect quality/107 gates on the exact source; review actual three-width captures and remaining product gaps; review and consume into W2/W3 only with a new composition gate and exact-source ledger.
