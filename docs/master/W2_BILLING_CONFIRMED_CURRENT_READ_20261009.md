# W2 — Recover the current invoice after a committed change

Owner: W2 billing consumer. Base: canonical PR38 source `4f63db2c598999c6003afe2bdb9174118cd15055`, tree `66b436a622ccac9f02e0d76a4273e4021856d7bb`. That combined source has its own pending acceptance; this unit requires a separate exact-source run. No acceptance is inherited.

## Reproduced behavior

The existing `IntegratedBilling.runPending` clears the pending command, closes the editor, displays success and then calls `loadInvoice`. That reader catches failures internally, clears the selected invoice and returns normally. A successful draft receipt followed by an unavailable `invoice.get` therefore leaves a success message, an error and no direct recovery action. The write has committed; another write is unnecessary.

A native Chromium reproduction loads the actual production React19 billing parent, `InvoiceEditor`, form/model/integration/calculation modules and the actual repository constructor, billing, billingCommand and post methods. Actual billing command/query/result parsers validate loopback requests and closed `{ok,receipt}` / `{ok,data}` envelopes. The original source performs one synthetic in-memory creation and one unavailable read, closes the editor and has no read recovery. The probe uses an explicit synthetic HTTP server, company/provider/presentation adapters and no Auth or database. It is a component reproduction, not Supabase acceptance.

## Resulting behavior

After a validated invoice receipt, the consumer retains receipt and immutable customer context in mounted memory. It reads the actual invoice before closing the draft editor, refreshing financial/list queries or displaying the final success message. A failed read keeps the reviewed form locked and exposes **Consultar factura registrada**. Emission/payment/trash/restore failures use the same read recovery outside the draft editor; the committed transition's confirmation is closed. The recovery sends only `invoice.get`, without replaying the mutation or reserving another number.

Confirmation requires the actual id and customer, a version at least as recent as the receipt, and matching state and number when the version is equal. A committed fiscal number must match at later versions too. Legitimate newer versions are displayed as current, with an explicit message. The API's existing closed DTO validators remain the first boundary; these comparisons guard the post-command context. No fiscal payload, receipt or form is persisted in browser storage or a URL.

Before receipt delivery, existing transport-uncertain retry preserves the frozen command id and input. Backend numbering, totals, CAS, roles, membership rechecks, replay, snapshots and private PDF flows remain unchanged. There are no new APIs, migrations, provider effects or assistant capabilities.

## Verification

Seven native component cases cover the old failure, create/update/issue read recovery, foreign customer refusal, equal-version wrong status refusal, legitimate newer edits, stale update reads and changed issued-number refusal. Lifecycle cases commit three different human operations to one in-memory invoice and recover with six reads, or seven when refusing a mismatched read. No recovery creates another invoice, updates again or emits again; zero page errors. Native reproduction original parent hash: `c72f7d526db26aeae79c14e909cc3e54a356c25e04dacdc3e25ab6c072af61a3`. Exact updated hash and measurements are recorded separately before publication.

The existing real billing arithmetic/replay group retains all61 original page actions/assertions. All107 named declarations across69 existing helpers remain unchanged. Its appended actual Supabase/browser journey exercises a real lost creation delivery and exact replay, one real database invoice, three unavailable post-commit reads (create, edit, issue), read-only recovery, current id/customer/version/totals, unchanged issued number and no extra write. Only failure transport is injected; no successful receipt/read, numbering, totals or database is replaced. Nine fresh screenshots cover draft recovery, emission recovery and current issued detail at1440/768/390; the target action/detail must be wholly visible. Fresh screenshots require actual review after the exact-source run.

Local lint, types, syntax and complete Supabase/Auth/Storage/history/browser107 gates must be recorded on the exact committed source. Full npm audit remains enforced with the five high findings in Issue29. Issue10 and independent W4 continue to block assistant business writes. Windows persistent installation, live semantic AI and commercial acceptance remain separate pending gates. W3/W4/W5 owner branches, main and production remain untouched.

Next three: collect this exact source's quality and107 evidence; review its fresh three-width billing captures; consume into the canonical product only with an additional whole-composition gate and exact-source handoff.
