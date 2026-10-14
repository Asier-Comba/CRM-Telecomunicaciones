# Cartera: preserve recovery after a confirmed save

W2-X CLAIM6158397297; eligible own base9c361c9ce7e32ba202f0c6e24aacd371c5026e04. Branch codex/w2x-portfolio-receipt-close-20261014. This unit does not diagnose the historical Cartera startup failures, including DD764's newly closed96PASS13FAIL acceptance.

## Problem and behavior

PortfolioEditor already preserves confirmed.current when its onSaved current read fails. Its drawer allowed closing after that failure, and the nested confirmation allowed cancellation, discarding the visible recovery context. The original Chromium reproduction fails because ordinary Cancel removes the confirmation after the persisted-receipt simulation and failed read.

Use existing Drawer.closeDisabled and ConfirmDialog.cancelDisabled to protect busy, uncertain and confirmed-receipt recovery. The same confirmation retries the exact pending command when uncertain; after a confirmed receipt it requests the existing read recovery. Copy makes the distinction clear. The existing receipt and dispatch logic are unchanged: a confirmed retry does not issue a second command. Normal closing resumes after readback. No SQL/RPC/contracts/permissions/provider/resource changes; no navigation-across-reload durability claim.

## Verification

Six real Chromium/component/repository/parser scenarios: uncertain response or confirmed receipt followed by failed current read, at390/768/1440. Original Cancel failure retained. Corrected confirmation/drawer Cancel/X/Escape remain blocked, exact command replay is preserved when uncertain, known receipts recover with one command, fresh card data appears and normal closing works afterwards. These use controlled HTTP and do not prove Auth/DB persistence.18 existing Cartera regressions also pass, preserving reference-close, selection-race, sequencing and startup negative behavior. TypeScript/lint and normal production build pass. Recovery confirmation reviewed at three widths.

Additional disposable Auth/DB consumer prepared inside the existing portfolio receipt consumer: portfolio_confirmed_edit_read_failure_keeps_context_and_only_read_retry. It changes a normally created synthetic service label through ordinary authenticated UI, fails only the following current read, checks protected closing and read-only recovery, then independently verifies one version/command/audit event. This check is NOT_RUN until its own composed SHA's physical control completes; parent and synthetic results are not inherited.

## Coordination and next step

Deliver through existing PR153 after composition and its own controls; no principal38/142 write without exact owner ACK. DD764's first render timeout still has unknown full cause and independent W5 diagnosis request6158449023. Keep every original failure, five HIGH, IA writesOFF, live modelNOT_RUN and releaseNOT_ACCEPTED. Next: resolve that first failure without weaker controls, compose the separate billing and Cartera deliveries, then run and review the new physical consumers on their exact SHA.
