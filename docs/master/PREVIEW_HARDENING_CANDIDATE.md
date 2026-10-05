# W4 preview candidate — review pending

Base: PR21 `e374cedd43331e4da6bf74b768c548ed08c62d92`.
Original synthetic preview remains accepted for local testing. This change requires W3 review; no staging/production authorization.

- Node24 launcher: explicit install, loopback, port collision, path spaces, readiness and child shutdown. Windows job exercises the actual OS; browser auto-open is optional.
- Request boundary: incremental 4096-byte body cap; 500 UTF-8-byte text; cancellation on overflow/error; only `text` accepted. No caller authority.
- Browser boundary: existing W3 closed UI validator plus exact envelope, request binding, bounded network bytes and writes/confirmation OFF.
- Local Linux evidence: fresh npm ci; 132/132 tests; lint/types/build; production preview closure; launcher in directory with spaces and cleanup PASS.
- Local Playwright: API cases 2/2 PASS; desktop/mobile browser launch unavailable (Chromium executable missing). Candidate CI must provide browser and Windows evidence; local results do not imply browser acceptance.

W3: inspect parser/client validator and launcher, then review exact candidate CI SHA. W2: use the closed reply boundary for this synthetic surface only. W5: no provider, DB, storage or durability changes here. W1: accepted application base unchanged.

USER_CAN_TEST=YES (original accepted local synthetic preview).
LOCAL_SYNTHETIC_ONLY=YES. Candidate integration=PENDING_OWNER_REVIEW. CAN_STAGE=NO. CAN_PRODUCE=NO.
