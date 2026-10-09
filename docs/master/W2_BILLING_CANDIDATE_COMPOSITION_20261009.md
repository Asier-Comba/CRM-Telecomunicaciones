# W2 — Billing candidate composition

Owner: W2 integrated billing and browser acceptance. Canonical PR #38 remains `d6d7cbb6c32a671ff228017fb736984bdea8e67e` until this candidate obtains its own complete gate. Its original SUCCESS 107/107 and subsequent FAIL 106/107 on the same tree are both retained.

## Exact sources and merge decisions

This candidate starts from PR #87 source `f23964eb9b8390190e09c2d4dee2ca12b56be379`, which includes PR #86 `b11cc7ba880b1a056756f68cf705ed72d2776eff`, fiscal/diagnostic PR #81 `41d4f30a0ea6e03bdb96e6fb0076ca5eab1d579a` and financial guard PR #83 `9427ee908d2e52d09715ed21a0c28c3c347d49ab`. These dependencies are candidate inputs, not inherited acceptance.

Normal merges add mobile PR #82 source `21787b8449b626cefd4947a135d2f52a0eeda766` and authorized invoice relations PR #84 source `817c041afd730f250c6b2233e693f527267245cd`. No other Work branch is modified or adopted.

The two merge conflicts are resolved explicitly. `IntegratedBilling` retains the mobile `InvoiceRows`, the sticky fiscal-reload state and `FiscalEditor` reload props, and enables authorized relations in `InvoiceEditor`. The arithmetic helper imports both new helpers and preserves its original actions/assertions. Its order is **confirmed invoice recovery → complete mobile rows → authorized relations**. The mobile helper needs the selected issued invoice; the relation helper subsequently creates a separate reviewed draft. The main acceptance retains the current-request contact synchronization, document guard and closed timing diagnostics.

## Local verification

- AST comparison with d6 preserves all 1935 main browser actions/assertions, all 61 arithmetic actions/assertions and all 107 named checks across 70 baseline helpers. Two main actions are added by the diagnostic/read dependencies; no old assertion is removed.
- Actual current React components, repository transport and closed parsers with explicitly synthetic memory HTTP/SQL adapters: fiscal helper PASS (six commands, four writes, two CAS refusals, two failed reads, final issuer/customer versions 3/3); mobile helper PASS (zero commands, five invoice reads); relation helper PASS (one create, 14 collection reads, one invoice read, real Drawer/control and compiled CSS). All have zero page errors. These checks do not establish Auth/database or visual acceptance.
- The seven existing receipt-recovery cases and the exact confirmed-read helper pass on the composed parent/editor. Creation, update and issuance recover using reads; foreign customer, stale version, wrong status and changed issued number are refused. No duplicate records or numbering is introduced.
- Exact-source lint, types and syntax results must be recorded in the checkpoint. Backend/runtime, assistant, migrations, package manifests and lockfile are unchanged from d6.

## Full acceptance required

The candidate's own real-local run must complete all 107 checks, Auth/PostgREST/Storage, persisted history, permissions/revocation, grounding, teardown and artifact upload with workflow SUCCESS. The bounded total deadline is 35 minutes; individual limits are unchanged. Review fresh fiscal, invoice-recovery, complete-row and relation screenshots at 1440/768/390. Relation controls and verified labels must clear the sticky drawer header. Native or partial captures are not accepted outputs.

Earlier failures and cancellations remain evidence: fiscal B1 105/107, 197 106/107; guard and both mobile attempts cancelled without a final report; contact b11 cancelled with 94 completed PASS; relation 428 has an actual final 107/107 and teardown PASS but workflow CANCELLED and incomplete desktop/tablet visual review. That result does not accredit this tree or the current 817 follow-up.

CI issue #29 remains an enforced 5-HIGH dependency failure. The separate Windows bootstrap run rejects five inherited private-file tests because the host does not satisfy POSIX permissions; no tests or permission guards are disabled. Independent W4, issue #10 business durability, live semantic AI, persistent Windows and commercial acceptance remain pending. AI business writes are OFF. Production, main, VPS, DNS, providers and W5 infrastructure remain untouched.

Next three: publish this isolated candidate and obtain its own exact-tree gate; inspect the final report and all fresh target captures; consume only a fully accredited tree into canonical development and hand the exact executed SHA/tree to W5.
