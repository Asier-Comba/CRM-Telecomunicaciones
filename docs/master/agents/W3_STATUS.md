# W3 status — iteration 7.0 product integration

BRANCH: `w3/telecom-readonly-integration-v1`, based exactly on W2
`a917bbb41ef8192344dc49737cd78fd52fe29649`.

PRODUCT: reviewed W3 telecom READ slice imported without mutation/durable runtime.
Active Dashboard, Clientes, Customer 360, Oportunidades, Calendario and Assistant
surfaces are telecom-specific and consume reserved synthetic fixtures. Inherited
billing, inbox, automation and property paths are outside active preview navigation.

SAFETY: demo access requires the explicit demo feature flag; the preview assistant
route additionally refuses production. No contact/tax values, real Arizan data,
external sends, assistant writes or raw database access. Cross-workspace text is
closed with `POLICY_BLOCK`.

EVIDENCE: 125/125 Node tests, lint, typecheck and production build PASS. Local HTTP
smoke returned 200 for seven primary routes. Browser E2E is versioned but page
execution is pending: Playwright Chromium was absent and its official download
returned a truncated zero-byte archive in this environment.

GATES: `USER_CAN_TEST_SYNTHETIC_PREVIEW=NO`; `CAN_STAGE=NO`; `CAN_PRODUCE=NO`.
PR9 remains the isolated assistant foundation. Issue10 remains open. Assistant
mutations and the W2 durable adapter remain disabled/absent.

NEXT 3: run preview E2E with installed Chromium; replace the deterministic fixture
planner with an approved provider module through `telecom-read-turn`; obtain W4
independent review before any broader integration claim.
