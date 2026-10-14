# Cartera altas: preserve confirmed current-read recovery

W2-X CLAIM6159519903 continues the own branch after publishedec5238cac41f11ad864b8878c651fe5944a0990e. Base9c361 remains eligible. This unit is separate from PortfolioEditor recovery and from original startup/card failures.

PortfolioCreate already retained confirmed.current when onSaved's ordinary read failed, but allowed drawer closing and lost the visible recovery. Original Chromium service-create reproduction fails because ordinary X callback removes the dialog after a confirmed simulated receipt and failed current read. Reuse Drawer.closeDisabled for busy/uncertain/receiptConfirmed and guard closing; copy identifies a registered alta awaiting its current read. Existing command/receipt logic, dates, parent validation and operators are unchanged. Confirmed retry only reads; uncertain retry keeps the same UUID. No across-route/restart durability or backend mutation change.

18 browser cases: service, line and renewal creation, uncertain reply or confirmed receipt/read failure at390/768/1440. X/Escape/input changes protected, exact replay or one command/read-only recovery, one simulated effect and ordinary persisted-card readback. Three previous reference-close regressions pass, types/lint/build66 pass and recovery reviewed at all three widths. Synthetic transport, not Auth/DB acceptance.

The existing disposable portfolio_confirmed_create_read_failure_retry_never_repeats_command retains every assertion and now also checks disabled X, ordinary callback and Escape preserve the registered service before its read-only retry. Its new-source strengthened physical scope is NOT_RUN; earlier37a5 or active1DD PASS is not inherited. No RPC/schema/roles/resource/provider/W3/W5 changes or new PR.

Next: publish source/checkpoint and compose only after current1DD full checks are terminal; preserve original failures, run strengthened physical controls on the new source. FiveHIGH, writesOFF, modelNOT_RUN, independent W4/staging/full23, issue10OPEN and releaseNOT_ACCEPTED remain.
