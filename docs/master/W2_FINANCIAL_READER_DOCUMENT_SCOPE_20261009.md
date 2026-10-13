# W2 — Financial acceptance read belongs to the current document

Owner: W2 browser acceptance harness. Base canonical PR38 `d6d7cbb6c32a671ff228017fb736984bdea8e67e`, tree `beec7fffaa7212f1b965aff4599506a285869508`.

## Actual evidence and uncertainty

Own original run37929913690/job113817820638 executed that exact d6 and passed107. A subsequent canonical run37933829500/job113830819477 executed merge `d4cb97dc5aeae21f154c3b208aca1b8464739dc1` with the same exact tree and failed106/107 at `billing_financial_currency_comparison_scoped_period`; Auth200/3535+227/73/history/grounding/teardown passed. Both results are retained. Safe/product artifacts11618203065/11618102976 were downloaded; the actual failure screenshot was reviewed. It shows the current synthetic customer ready and current EUR figures148.72/147.72/1.00/0.00, without a visible alert. All44 observed financial-summary response statuses are200. The closed report says ACTION_FAILED with no specific substep or safe error tag. It does not establish an arithmetic, authorization, backend or response-lifetime root cause.

The existing group installs `waitForResponse(invoice.financial_summary,month)` before navigating from a page that can still have pending reads of the same operation. It then waits for the selected customer's separately held current response before calling `.json()` on the earlier captured response. The predicate has no document scope. An old-document financial response can therefore satisfy the waiter and lose its Chromium body resource after navigation.

A native Chromium loopback reproduction proves that mechanism: an actual pending financial-summary POST from the old document responds200 and satisfies the waiter; navigating before reading its body produces BODY_RESOURCE_UNAVAILABLE. Starting from `about:blank` before installing the waiter instead captures the actual fresh document's response200 and body. No Auth/database, successful product DTO substitution or original-CI-cause attribution is claimed. This is a measured possible mechanism, not proof of the original closed ACTION_FAILED's precise exception.

## Guard and verification

The group now leaves the old document for `about:blank` before registering the unchanged financial response predicate and navigating to the actual billing route. Previous component effects and old requests are removed before the current reader is registered. The actual current customer response is still held, its draft/proposal controls remain disabled until the authorized name arrives, and all previous amount/currency/category/date/period checks remain unchanged. The test adds safe phase labels for the fresh document, held/current customer, current summary headers/body and amount/period checks. A body-resource failure receives the closed tag FINANCIAL_READER_BODY_UNAVAILABLE; no raw messages, profiles, amounts or response payloads are added to diagnostics.

All1935 previous main browser actions/assertions and107 named declarations across70 baseline helpers remain in order. The added document navigation does not expand assertion, page, transport or job time budgets. Production source, API contracts, arithmetic, roles, CAS,73 migrations, private PDF and assistant capabilities remain unchanged. No successful response or database value is mocked. Syntax/diff, exact-source quality, whole107 with actual Auth/database/Storage/history and teardown are required before consumption. A fresh run must be reported separately; passing it cannot retroactively identify the original exception or erase106.

Fiscal81 and mobile82 remain separate sources pending their own gates. Authorized invoice-relations work is paused in its isolated local checkout while this stability guard is validated. Audit5HIGH/Issue29 stays enforced; Issue10/W4/Windows persistent/live semantic AI/commercial gates remain open and assistant business writes stay OFF. Main, production and W5 owner branches remain untouched.

Next three: publish and run this exact diagnostic/guard source; inspect any precise new failure or its final107 report; compose only independently accepted product units and rerun the exact combined tree.
