# W5 enterprise platform audit

Base W2: `7ab6f56f10fc65aa7212ed5dfbdeacea8901756a`, fetched at execution on 2026-10-08.
Fresh branch: `w5/enterprise-bootstrap-v2`. Historical W5 is reference only.

Reuse the real-local acceptance runner, canonical migrations, private Storage policies,
function privilege matrix, native PostgreSQL fresh/restore and embedded SQL tests.
Historical platform documentation is dated evidence, not current staging proof.
No W3 source has been consumed. Latest observed W3 is
`db5d9defbe06ce7b7543df78823c4ab15a38f80b`; no accepted durable-worker deployment
contract was available. Do not assume a deployable worker.
Latest observed W2 is `782c8fc8fd011afce1a49ca761eea46cc9c7a3bd` (documentation
checkpoint); its published product source is `692ba6fcc3c78ba3b57a2d8fbc2b8b82317b4b7c`.
W5 does not manually merge an unaccepted product completion candidate. PR CI tests
the recorded merge with current W2; evidence records both source and merge SHA.

Product integration currently explicitly rejects production and hosted origins in
`src/features/product/integration/mode.ts`. W5 does not change that W2 boundary.
An image can be packaged, but staging/product activation requires W2's accepted
hosted runtime. The repository's default branch is W4, not a production release.

Executor: Windows Node22.20.0; declared application toolchain Node24. Docker client
exists but its Linux engine is unavailable. Real Supabase/recovery runs must use
the isolated CI runner. Never relabel embedded tests as real Supabase.

New scope: complete environment name inventory and validators; company config
contract; encrypted byte+metadata Storage recovery; fresh reconstruction and drift;
deployment package; preflight/promotion contracts; onboarding and incident runbooks.
Keep account creation, billing, MFA, DNS authority, credentials, W4 and real staging
as explicit external gates. No production mutations or provider effects authorized.

The closing source audit detected newly published Next advisories. The official
Next 16.3.8 maintenance patch is applied; the original architecture and product
activation boundaries remain intact. The independent braces advisory remains
unsuppressed. The locked CycloneDX dependency inventory includes 497 components
across supported optional platforms and development tooling; the actual Linux
runtime image is separately scanned in CI. Neither inventory is a live release.
