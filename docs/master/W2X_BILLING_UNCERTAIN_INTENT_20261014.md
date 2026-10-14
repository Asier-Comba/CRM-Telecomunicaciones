# Billing: keep pending intent until its receipt is confirmed

W2-X CLAIM6158227631, eligible base9c361c9ce7e32ba202f0c6e24aacd371c5026e04. Own branch codex/w2x-billing-uncertain-20261014; principal PR38/142 unchanged, integration requires their owner's exact ACK.

## Reproduced problem and change

After an invoice command's reply is lost, Cancel cleared its pending closure and confirmation. The real browser reproduction on the base fails because the issue dialog disappears after the ordinary cancel callback. Fiscal editors had the same close path. This loses command correlation; existing server CAS and replay controls remain intact, and this report does not claim that every action would duplicate a persisted effect.

Retain an explicit uncertain-command state until replay settles. Disable cancellation, closing and alternative billing selections/refresh/actions while unresolved; preserve the existing pending closure and UUID. Use the existing Drawer/ConfirmDialog options, show the same-action retry label and explain why closing is unavailable. Confirmation clears the guard and normal navigation/cancel resumes. No command contract, database, grant, role, primitive, provider, budget, model or resource changes.

## Evidence and limits

21 Chromium scenarios: seven operations (issue, mark paid, reverse payment, trash, restore, issuer profile, customer profile) at390/768/1440. Actual components/repository/parsers with controlled HTTP, one simulated effect before reply loss, exactly two equal command requests, single simulated revision/effect, blocked Cancel/X/Escape/filter/refresh, current readback and normal closing after confirmation. These are synthetic transport tests, not Auth/DB acceptance. 25 existing billing regression scenarios also pass (selection, context, current date, financial refresh and focus). TypeScript, lint and normal production build pass; reviewed issue confirmation at all three widths.

Preserved base cancel failure separately from fixture failures: initial draft response erroneously retained issued_at; initial customer configuration response included an extra customer_id forbidden by the parser. Those fixture attempts are not product causes. The corrected21 scenarios pass. No assertions, timeout, retry limits, parser or access controls weakened.

An additional disposable Auth/DB consumer check is prepared: billing_lost_receipt_seven_commands_same_intent_single_persisted_effect. It uses ordinary authenticated UI commands, route.fetch then reply abort, identical replay, SQL read-only checks for one revision/command/audit event, fiscal round trips and two reviewed drafts. Existing billing checks stay intact. This consumer is NOT_RUN until its own composed SHA passes; the local21 tests do not certify it.

## Handoff

Compose with the own Customer360 candidate only after all its current checks are terminal; use existing PR153 and new-SHA controls. Five HIGH remain visible, writes IA OFF, live model NOT_RUN and release NOT_ACCEPTED. Next: close the own physical billing check, preserve any failure and review its actual mobile screenshots before individual requirement reconciliation.
