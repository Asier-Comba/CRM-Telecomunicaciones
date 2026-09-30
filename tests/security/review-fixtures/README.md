# Branch-specific W4 reproduction artifacts

These are review probes, excluded from baseline self-tests. A green test may assert the presence of a defect. Do not report these as security acceptance tests.

Use disposable worktrees at the recorded exact commits; never copy them to production or unreviewed branches.

- PR15 e65f1e802fbcb63f9a1636689b85eb2aa135c592: place `pr15-adversarial.test.mjs` at `tests/bootstrap/w4-pr15-adversarial.test.mjs`; run `npm test` (80 official +4 probes). Relative imports intentionally target that tree.
- W2 db8ab41c4e8740aecacc17750ae0bcfaef5d31b5: place `w2-adversarial-audit.test.ts` at `docs/master/contracts/w4-adversarial-audit.test.ts`; execute with the branch's TypeScript test runner (179 official +7 probes).
- W3 c6e869e75632ed4b2590cb5ac2285b3698749ed2: `git apply --check` then apply `w3-adversarial.patch` in its disposable tree; run the branch tests (62 official +5 probes). No push to W3.
- `pr15-import-adversarial.sql`: optional injection into the domain SQL harness, guarded by synthetic test environment. NOT reached on current PR15 because its official SQL script fails first. The probe tests privileged insert invariants, not browser access.

Convert vulnerable assertions into rejection/secure-state expectations when the owner supplies fixes; rerun original positive controls. Preserve original fixtures as historical evidence if superseded.

## Latest delta

Iteration4.2: w3-reconciliation-v42.test.ts belongs in W3@489eed2/test/ (384 official+12 independent cases); all pass, including an explicitly labelled still-vulnerable audit-loss reproduction. domain-read-v42.test.mjs belongs in PR15@e65f1e8/tests/bootstrap/; it asserts secure behavior and currently has3 PASS/11 FAIL. import-initialization-v42.sql also asserts secure initialization, not vulnerable behavior. These are excluded from W4 baseline green self-tests. Use them as owner-fix acceptance probes.

- W3@91b4b3e: use w3-v1-adversarial.patch instead of old patch;173 official+6 W4 probes. Reflection test now expects rejection marker; new verifier-data probe demonstrates missing capability-specific result schema.
- pr14-onboarding-candidate.patch and pr15-trigger-candidate.patch are diagnostic edits ONLY for disposable worktrees. They demonstrate minimal fixes, not deployable migration history. W1 should ship forward migrations. Candidate identity and full domain SQL pass after these edits.
- pr15-import-standalone.sql reproduces initial completed/fabricated counters against UNMODIFIED e65f1e8, independent of trigger failures in the larger fixture. Run it as the SQL argument to the embedded runner. Its PASS means the defect exists, not secure acceptance. Trusted/privileged insert invariant only; browser access remains denied.

### Atomic runtime seam at W3 515e0d4

`w3-atomic-seam-v42.patch` appends six W4 tests to the official reconciliation suite. Apply only in a disposable checkout of515e0d439e705ecc9c9c13140ed14b4d8f565246, then run lint/typecheck/test/build.397 tests pass (391 official+6 W4). This confirms the revised atomic persistence interface and reference-model behavior, not native transaction/durability/outbox delivery. See W4_ITERATION_4_2.md for exact scope.

### PR17 forward-trigger acceptance

At4fb8619, inject `shared-trigger-v42.sql` as the THIRD runner argument after official `supabase/tests/telecom-domain-rls.sql`: four positive record-shape updates and four denied workspace rewrites PASS. The full official domain SQL also passes.
`import-initialization-v42.sql` is standalone: use as SECOND runner argument in a separate disposable invocation. It creates its own identities, so do not inject it into the official domain fixture. At4fb8619 it still reports three unmet initialization cases.

### PR17 iteration5 acceptance

At8de57dc, `import-initialization-v42.sql` accepts SQLSTATE55000 as the intended creation denial and passes6/6. `domain-read-v42.test.mjs` uses the current authorizer contract and passes14/14. Inject `telecom-reader-v5.sql` after `supabase/tests/telecom-server-read-rpc.sql`; it independently denies service-role reads for suspended member/workspace and denies anonymous execution. Evidence is PGlite/Node, not Supabase Auth/PostgREST.

### Iteration6 exact preview/platform evidence

At PR21 e374cedd / C2 a917bbb (identical migration tree), `durable-c2-v6.sql` injects into the seeded official durable fixture: both absence codes round-trip, persisted lease stable, NULL denied. `storage-policy-v6.sql` injects into domain fixture: owner/admin own linked only; member/foreign/orphan/quarantine/suspended/archive/anon denied. Evidence is PGlite SQL, not service APIs.

`restore-acl-v6.sql` is explicitly a VULNERABILITY MODEL: pristine anonymous RPC denied, then simulated lost REVOKE permits anonymous actor impersonation. PASS means reproduction, NOT secure/native restore acceptance. Issue22 tracks the actual native post-restore ACL regression.

Loopback HTTP and semantic probes are in scripts/security/review-preview-http.mjs and review-preview-semantic.mjs; see W4_ITERATION_6.md. Never run against hosted infrastructure.
