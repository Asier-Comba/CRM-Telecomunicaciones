# Opportunities: preserve pending and confirmed recovery

W2-X CLAIM6159050259 continues the own branch codex/w2x-document-upload-uncertain-20261014 after publishedab190eb918b74ca4b7346813ea3c22e445a599bd. Base9c361 remains eligible; document and Agenda source snapshots/bundles retain their exact scope. No dependency or checkout duplication.

## Reproduction and change

OpportunityEditor retained an uncertain command or confirmed receipt but permitted closing the drawer. Archive cancellation also cleared the pending command after reply loss. The corrected original Chromium create reproduction fails because ordinary close removes the dialog after the simulated effect. Initial fixture failures (query URL rejected by the fixture server and missing global.search response for CustomerSelect) are preserved separately from that causal reproduction.

Reuse Drawer.closeDisabled and ConfirmDialog.cancelDisabled for busy, uncertain or confirmed recovery. Guard callbacks, explain pending/known-save states and label same-action archive retry. Existing pending.receipt logic remains: confirmed recovery only reads the current opportunity; uncertain recovery repeats the identical UUID/input. Normal closing resumes when recovery completes. No across-route/restart durability, pipeline-stage rewrite, SQL/RPC/RLS/role/contract/product-link/provider change.

## Verification

15 Chromium cases: create/update uncertain, create/update confirmed then failed current read, archive uncertain, each at390/768/1440. Protected X/Escape/Cancel and fields, exact replay or one write plus read-only retry, one simulated effect. Nine existing pipeline catalogue/query/selection regressions pass. Types/lint/build66 and secret scan pass; confirmed recovery visually reviewed at three widths. Synthetic transport only, no Auth/DB certification.

Prepared physical check opportunity_uncertain_create_archive_confirmed_update_read_only_recovery: ordinary customer selection and product commands, lost create/archive reply after route.fetch200, confirmed update with only its following current read failed, exact replay/read-only recovery, single command/audit/version, customer linkage, cancelled final state and normal fresh detail. NOT_RUN until its composed source executes.

## Next and limits

PR153@37a5 is functionally qualified in its own scope:1430 internal/538 preview/native85/build66/112Auth+teardown PASS, fiveHIGHFAIL. This later independent source has no inherited physical PASS. Compose all Docs/Agenda/Opportunity deltas only after every current source check is terminal; run new source controls. Original DD76496/13 causeUNKNOWN remains despite37a5PASS, with W5 retrospective response6158916484. Principal consumption ACK/W4/staging/full23/live model remain pending, writesOFF, issue10OPEN and releaseNOT_ACCEPTED.
