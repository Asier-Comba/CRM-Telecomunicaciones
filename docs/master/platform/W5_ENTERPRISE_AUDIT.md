# W5 enterprise platform audit

Base W2: `7ab6f56f10fc65aa7212ed5dfbdeacea8901756a`, fetched at execution on 2026-10-08.
Fresh branch: `w5/enterprise-bootstrap-v2`. Historical W5 is reference only.

Reuse the real-local acceptance runner, canonical migrations, private Storage policies,
function privilege matrix, native PostgreSQL fresh/restore and embedded SQL tests.
Historical platform documentation is dated evidence, not current staging proof.
No W3 source has been consumed. PR31 `e79b0cc1c4980b5034628406cb6cd857438bdec6`
still reports durable worker/native acceptance gaps; do not assume a deployable worker.

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
