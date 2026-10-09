# W4 reachable-history scanner candidate

WORK: W4. BRANCH: `w4/all-ref-secret-audit-v1`.
BASE_CONSUMED: W5 PR34 `85d3a60a7b34af4aac5465f3b30130f742e49900`.
Coordination: issue #67. Final commit and CI are bound by the PR checkpoint.

Implementation: a separate all-reference audit complements the existing PR scan.
It refreshes advertised remote heads/tags, inventories all local heads, tracking
refs, tags and HEAD, rejects shallow history and changing snapshots, then scans
full ancestry with Gitleaks 8.24.3. Official binaries are checksum pinned. Git
external diff/textconv are disabled. All subprocess output is captured privately;
only a closed aggregate report reaches public CI logs/artifacts. Raw matches,
values, paths, authors and email never reach those reports. Private local finding
metadata uses path hashes and is never uploaded. No repository suppressions,
baseline, inline allow comments or broad exceptions are consumed.

The upstream 8.24.3 Detector unconditionally adds source/.gitleaksignore even
when an explicit ignore path is supplied. The candidate scans the Git directory
and uses a separate default-only config. A synthetic deleted side-branch token
retained only by a tag tests this behavior against a deliberately suppressing
working-tree ignore/config. Source:
https://github.com/gitleaks/gitleaks/blob/v8.24.3/cmd/root.go .

Positive/negative checks cover clean history, deleted tag-only canary,
remote-tracking/second-parent inventory, shallow refusal, private-field projection,
missing scanner and public-summary exclusion. No synthetic token is committed to
this repository; the tests generate it only in disposable local repositories.

Reproduce with `W4_GITLEAKS_BIN` pointing to the verified scanner and
`node --test tests/security/all-ref-secret-scan.test.mjs`, then
`node scripts/ci/scan-all-ref-secrets.mjs`. `W4_SAFE_REPORT` is aggregate only;
`W4_PRIVATE_REPORT` is local redacted metadata and must never be uploaded.
Exit 0 means no finding within this pattern-scan scope; 2 means findings and a
blocked gate; 1 means execution/scope/report failure. Review is separate and the
scanner never certifies a live credential, absence of PII or production readiness.

UNIT_TESTS: local exact-source controls pass; final count/run recorded in PR.
NATIVE_DB: NOT_RUN (unrelated). SUPABASE_REAL: NOT_RUN (unrelated).
BROWSER: NOT_RUN (unrelated). W4_REVIEW: candidate, additional review pending.
EXTERNAL_EFFECTS: NONE beyond authorized GitHub development publication.
Limitations: unreachable/deleted refs, forks, LFS and hosted artifacts require
separate review. Default upstream rule/file exclusions remain declared limitations;
this scanner removes repository-specific suppression, not upstream rule semantics.
Public location-specific security findings are withheld for private review.

NEXT_3: collect exact CI scope/result; independently review the candidate;
prepare W5 composition on freshly inspected product source. No merge/deployment
or repository visibility/access modification is included.
# Merge-resolution coverage extension

An additional synthetic control reproduced a scanner gap: all-ref traversal alone did not show a canary introduced only in the merge commit, absent from both parents. The control failed before the correction. The scanner now requests `--diff-merges=separate` alongside full-history/all refs so every merge is compared against each parent; repeated identical finding locations are deduplicated by redacted ID. The canary is generated only in disposable test repositories and its value is never published. Eight controls replace the earlier seven-control scope; older CI remains historical until this executable source runs. No suppression or release acceptance is added.
