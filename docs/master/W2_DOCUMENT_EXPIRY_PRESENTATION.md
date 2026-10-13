# W2 — Document upload expiry presentation

Owner: W2 document UI. Base: PR #44 source `8961a03d342795d63993987d557f091e3261bff7`, whose corrected document consumer is still awaiting its full real integration result when this change is prepared. Do not inherit acceptance from another source.

## Observed problem and resulting behavior

The actual prepared-upload capture on the previous document candidate displays a raw ISO expiry (`work/document-9683-screenshots.zip`, failed preparation frame). The UI now uses the existing product date formatter: Spanish calendar date and time, explicitly labelled as Madrid time. The `time` element retains the exact server expiry in `dateTime`. After successful finalization the UI removes the pending-intent expiry, because the document is no longer pending; both original journeys also require its absence after the real finalization receipt. This changes presentation only; upload intent lifetime, HTTP/RPC contracts, file bytes, CAS, idempotency and permission checks are unchanged. No expiry is extended or calculated by the browser.

Both existing upload journeys check the displayed expiry against an independent `Intl.DateTimeFormat` calculation from the actual parsed command receipt and require the exact original `datetime` attribute. The original 107 journeys, HTTP receipt checks, Storage byte checks, ticket expiration/revocation and SQL/reload persistence checks remain. No mock, timeout increase, retry or new parallel stack is added.

## Validation gates

Windows changed-file ESLint, types and script syntax: PASS. Existing document transport/contract/service tests: **5/5 PASS**, zero skips. A fresh complete Supabase Auth/PostgREST/Storage/browser run and quality job are required for this exact source. Local full-stack startup remains blocked by Windows memory (2.69 GiB free on 15.7 GiB total at preparation); Docker remains stopped. Full dependency audit stays blocked by #29, independent W4 approval and physical AI business durability remain pending #10. AI writes stay disabled. No W4/W5 infrastructure or production change.

Next: collect the corrected base's full integration evidence; require this source's whole 107/107 gate; review its small diff before consuming it into the W2/W3 composition and recording exact source/run/tree evidence.
