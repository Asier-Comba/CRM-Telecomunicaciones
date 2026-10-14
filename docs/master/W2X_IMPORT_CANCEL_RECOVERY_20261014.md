# Existing import job cancellation recovery

W2-X CLAIM6160054871, own branch codex/w2x-import-cancel-recovery-20261014, reused checkout/dependencies. The original UI reproduced Cancel removing the pending UUID after a simulated committed importjob.cancel lost its response. The processing adapter remains blocked; this change does not import or apply any rows.

Unknown transport/internal outcomes keep the exact cancellation intention and refuse Cancel/X/Escape. Retry uses the same command/document version. Confirmed conflict or access denial disables blind confirmation and allows dismissal and current record consultation. Existing receipt/readback and blocked-processing copy remain. No backend/RPC/policy/provider/core/W5 or shared primitive changes.

Five browser controls pass: same-command recovery at390/768/1440 plus conflict and denied-response dismissal without another command. Three synthetic recovery views were inspected. Build66 and lint pass on the corrected state implementation. An initial lint failure rejected reading a pending ref during render; it is preserved, and an explicit uncertainty state now records the outcome instead. Post-fix five-control run and build/lint are independent evidence for the final code.

The existing importjob_list_get_cancel_processing_blocked physical consumer preserves all normal list/detail/cancel/status/reload and processing-blocked assertions; its ordinary cancel now deliberately loses a committed response and checks exact replay, blocked dismissal and one version/audit increment. No new acceptance count. Actual Auth/DB consumer is NOT_RUN for this source; no inheritance from previous composition sources.

Publish and checkpoint independently, then consume with document cleanup/state and individual PAR200 metadata through existing PR153 only after every B1B run/check is terminal and its evidence is closed. No new PR/cancellation/force push/principal38/142 writes. FiveHIGH, IA writesOFF, modelNOT_RUN/API0, W4 independent, issue10OPEN and releaseNOT_ACCEPTED remain.
