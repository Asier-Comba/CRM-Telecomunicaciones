# Independent dependency-audit proposal — 22 October 2026

Claim: issue67/6338947335. Separate review branch
`codex/ci-independent-dependency-audit-20261022`, based on commercial candidate
`f9aa469bec768ad73572a2f462f1f1505e6791a5`.
This is NOT adopted into PR175, not a second final product, and not an exception.
W4/W5 review is required before integrating these shared CI paths.

## Problem and behavior

The commercial candidate's own CI39765853341/job119780985996 passes672bootstrap,
827assistant, lint, types and44route build, then fails `npm audit` with5HIGH.
W5's deploy eligibility needs to distinguish that audit failure from a functional
test failure; an exception for the whole combined job would obscure either.
No exception or deployment is requested/approved by this proposal.

`node-quality-gate.sh` retains installation and every lint/type/test/build command
and exit propagation. The three existing npm/pnpm/yarn audit commands move
unchanged into `node-dependency-audit.sh`, which installs from the frozen lockfile
and fails on audit or installation failure. CI adds the independent mandatory
`Dependency audit (HIGH and CRITICAL)` job on the same workflow checkout/runtime.
There is no dependency on quality, no conditional job bypass, no continue-on-error,
no omit-dev/production-only option, no lower severity, waiver or dependency change.
Both jobs remain required to make the workflow successful. Non-Node project
detection remains the existing rule; malformed detection/install still fails.

Existing `Critical Playwright` still depends on quality with its local-only
environment and production guard unchanged. It may now run when functional
quality passes and audit fails; this provides test evidence, not release acceptance.
Dependency Review, secret scans, other checks and platform policy are unchanged.
W5 must explicitly review/update its job matcher/policy before any consumption;
we do not edit `deploy-eligibility`, staging policy or W5-22A files.

## Verification

Before extraction, a synthetic HIGH audit exit9 makes the otherwise successful
functional pipeline exit9 after all4functional steps. Original trace retained.
After extraction, `test-node-gate-separation.sh` passes36command assertions across
npm/pnpm/yarn: independent audit failure, exact HIGH threshold/arguments, ordered
functional commands, propagation of functional failure, independent audit success,
installation failure propagation and zero package commands after failed install.
No dependencies are downloaded and no live audit/provisioning occurs in this test.
The fixture's package commands are explicitly synthetic.

The same test rejects5mutations in an isolated scratch repository: audit
continue-on-error, job conditional bypass, dependency on quality, removed job and
HIGH→CRITICAL threshold weakening.36assertions and5mutation rejections PASS;
all shell syntax PASS. Existing guardrails exit0 with a pre-existing multiline
checkout-count diagnostic on Git Bash; this output is retained, not corrected or
treated as proof of the broken comparison. Linux CI remains necessary.
The mutation wrapper initially inherited the deliberately failing child's exit1;
its final harness explicitly returns0 after all5rejections. Both attempts retained.

No application/SQL/contract/permissions change: no repeated whole-product browser
or database suite is claimed. Candidate175 tests are NOT transferred to this
proposal. Its own remote SHA/tree/PR and CI status will be recorded in issue67.
Linux workflow execution and independent W4 review are pending at preparation.
No workflow on the commercial candidate is cancelled or rerun.

## Handoff and limits

W4: verify mandatory audit coverage and fail-closed behavior separately from
functional quality. W5: review exact new job identity and deny consumption until
policy and independent acceptance agree; no broad job waiver or automatic approval.
Integrator: only selectively adopt after review and fresh-source controls.
Budget0EUR; no new infrastructure, provider, main merge or deployment.
Commercial candidate remains PR175/f9aa until an explicitly reviewed successor.
RELEASE_NOT_ACCEPTED, business AI writesOFF, Issue10open, StorageOFF.

Next3: W4/W5 review this proposal; W1 decide QA38 receipt/durable recovery;
W5 qualify an authorized synthetic commercial window on the exact product SHA.
