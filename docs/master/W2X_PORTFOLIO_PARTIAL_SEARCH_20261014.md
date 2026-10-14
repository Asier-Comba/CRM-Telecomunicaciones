# Cartera: retain individually authorized search results

W2-X CLAIM6158524273 continues the own branch codex/w2x-portfolio-receipt-close-20261014 after publishedb1d93a0e0693f522ee6249dea71710ee6f8ba708; eligible base9c361 remains its ancestor. Existing receipt-close evidence and bundle remain frozen at their source.

## Reproduction and behavior

Two search candidates can be valid search references while one current detail is denied or unavailable. IntegratedPortfolio used Promise.all, so the rejected detail discarded the other valid, individually authorized result. The original Chromium card assertion fails on one valid contract plus one denied contract.

Settle detail reads individually, render only fulfilled repository-validated DTOs and preserve the current search epoch. Failed assets never become cards or expose their error bodies. A separate partial-result notice remains visible after opening and closing a valid card; new searches reset it. A later response from an earlier search cannot alter either current results or their partiality.

This is an independently reproduced product defect. DD764's first physical rendering timeout has two observed successful search/expected-contract DTOs, but the other candidate's full behavior is still unknown. This unit does not establish that original run's complete cause, rewrite its96PASS13FAIL, or convert downstream missing fixtures into independent diagnoses.

## Verification

12 new browser cases: one denial, one unavailable detail, all denied, and an earlier held search overtaken by a successful later search, at390/768/1440. Valid-only cards, denied-card/body absence, current detail open/close, persistent partial notice, no commands, no overflow and settled late response checked. Complete Cartera scope36 cases (including receipt recovery and18 previous reference/selection/startup/sequencing controls) passes on this source, plus types/lint/build/secret scan. Synthetic HTTP only; no Auth/DB inference. Initial fixture attempts using an unscoped alert locator also matched the unrelated import-permission negative; those failures remain separate. The first partial implementation also cleared its notice when opening a valid card; separate state fixes that observed behavior.

Prepared physical check portfolio_bounded_search_partial_denial_keeps_authorized_contract uses an ordinary authenticated search and current valid detail, refuses another candidate solely in the browser test, checks no refused card and no commands. NOT_RUN until its exact composed source executes. No role/RLS/grant/query contract/database/resource changes.

Next: compose the separately published billing, receipt-close and partial-search code on the own candidate, preserve all failures, measure its new-SHA physical consumers and request principal consumption only with exact evidence and owner ACK. Five HIGH, writesOFF, modelNOT_RUN and releaseNOT_ACCEPTED remain.
