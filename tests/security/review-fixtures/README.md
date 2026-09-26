# Branch-specific W4 reproduction artifacts

These are review probes, excluded from baseline self-tests. A green test may assert the presence of a defect. Do not report these as security acceptance tests.

Use disposable worktrees at the recorded exact commits; never copy them to production or unreviewed branches.

- PR15 e65f1e802fbcb63f9a1636689b85eb2aa135c592: place `pr15-adversarial.test.mjs` at `tests/bootstrap/w4-pr15-adversarial.test.mjs`; run `npm test` (80 official +4 probes). Relative imports intentionally target that tree.
- W2 db8ab41c4e8740aecacc17750ae0bcfaef5d31b5: place `w2-adversarial-audit.test.ts` at `docs/master/contracts/w4-adversarial-audit.test.ts`; execute with the branch's TypeScript test runner (179 official +7 probes).
- W3 c6e869e75632ed4b2590cb5ac2285b3698749ed2: `git apply --check` then apply `w3-adversarial.patch` in its disposable tree; run the branch tests (62 official +5 probes). No push to W3.
- `pr15-import-adversarial.sql`: optional injection into the domain SQL harness, guarded by synthetic test environment. NOT reached on current PR15 because its official SQL script fails first. The probe tests privileged insert invariants, not browser access.

Convert vulnerable assertions into rejection/secure-state expectations when the owner supplies fixes; rerun original positive controls. Preserve original fixtures as historical evidence if superseded.
