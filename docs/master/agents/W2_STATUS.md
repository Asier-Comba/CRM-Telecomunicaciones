# W2 current consumer evidence

Branch: w2/product-integration-v2. Draft PR30 targets unchanged w2/product-rebuild-v1@2878687. W1 f574b0c55951e6e357e4e91059fcfe64b1410b02 is preserved by normal merge e0bad452, following the earlier488647d and42176c7 merges. Main, production, deployments and historical repository are untouched.

## Modes and authority

Synthetic preview uses only fixtures and temporary drafts. Integrated local requires explicit PRODUCT_LOCAL_INTEGRATION, PRODUCT_LOCAL_SYNTHETIC and PRODUCT_V1_ENABLED flags, a nonproduction runtime and canonical loopback Supabase/application URLs. Identity comes from real SSR-cookie getUser plus current database membership; synthetic@example.invalid identities only. Document content/private fiscal PDF needs PRODUCT_DOCUMENT_CONTENT_ENABLED. Invalid configuration displays unavailable with no fixture fallback. The central typed cookie transport reuses closed W1 parsers and keeps exact command UUID/payload plus actual editor CAS in mounted memory.

W1 catalog ui_safe flags remain false. Local consumer evidence does not grant W4 stage or production approval. All data is synthetic; integrated writes nevertheless persist in an actual disposable database.

## Executed evidence

- c4cac776, Supabase43/run37316227147:22/22 actual browser journeys PASS and568 backend checks PASS. Real owner/admin/member/viewer logins, CAS conflict, current membership revocation, persisted customer/contact/calendar/opportunity/portfolio/billing/team/document behavior, protected uploads/downloads and desktop/tablet/mobile widths were observed.
- e0bad452, Supabase45/run37317692237:801 W1 backend checks PASS after the new normal merge. UI failed before login because the merge lost ephemeral email/password fields from the synthetic browser fixture. Correction b735ec3 restores them in memory only.
- 59ba8a3 adds private frozen PDF and import management consumers, closed parser reuse, source/state gates and actual browser cases. Its lint found React ref/effect violations in two new panels. Correction42c8022 replaces render-time ref access with explicit retry state and updates state after asynchronous reads.
- 42c8022, Supabase48/run37319223501:23/23 actual browser journeys and801 W1 backend checks PASS. Existing import list/get/cancel persisted, private frozen fiscal PDF rendered and issued/paid bytes remained identical. Explicit private-PDF persistence button is not yet directly observed. The next state/deadline source checkpoint requires its own acceptance. Source availability, earlier-head positives and new parser tests do not certify the changed tree. Full npm audit remains enforced; Issue29 has five inherited high findings. No suppression or forced dependency rewrite.
- The executor lost the linked checkout's Git backing directory, then disconnected. All important checkpoints were reconstructed and preserved through GitHub; remote CI provides fresh validation. New screenshot artifacts require human visual review.

## Actual observed operation coverage

At2a021a7,70 distinct W1 operations and49 writes have positive browser evidence. The newly merged catalog contains90 operations and67 writes: BACKEND_WIRING77.8%, REAL_LOCAL_WRITES73.1%. Private PDF reference/download and import list/get/cancel now count; the explicit PDF persistence action stays excluded until observed. These measure distinct positive operations, not full parity or release readiness.

All244 parity rows retain frozen preview status and separate integrated status/evidence/limits. Integrated complete-row acceptance remains separately reviewed; next changed-head regression remains pending. Preview delivered scores remain OLD_PRODUCT_PARITY47.4%, TELECOM_SUPERSET54.8%, INTERACTION_COMPLETENESS51.6%, AI_UI52.2%. SYNTHETIC_ONLY100% of data. Visual quality is partial: automated widths/Poppler rendering exist; full old/new visual comparison and human review remain pending.

## Product families

Customers and Contact: persisted create/edit/archive/restore, primary replacement, reload and PII nonpersistence verified. New contact archive/restore consumer needs its own browser case; full collections and assignment remain partial. Imported customer facts and archived editing are gated.

Customer360:14 areas with protected company/contact and customer-bound agenda/documents/billing entry points. Full related inventory, opportunities and transversal activity are explicitly incomplete.

Calendar: bounded93-day/100-item reads with real task/meeting CAS editors. Create/complete task and create/reschedule/cancel meeting verified. Start/reopen/update/no-show plus renewal/permanence state journeys require further positive UI observations. Provider sync/drag remain unavailable.

Opportunities: canonical UUID stage catalog; manual create/edit/win/reopen/lose verified. Change-stage/archive consumers, assignment, complete inventory and new entity links remain partial.

Portfolio: manual service/line/renewal persistence and imported read-only facts verified. Parent eligibility gates, remaining contract/deadline lifecycle, general operator/plan/responsible selectors and complete inventory remain partial. Import panel actual list/get/cancel persisted; processing and quarantine upload remain blocked.

Billing: actual fiscal customer, draft/edit/explicit issue/server numbering/payment and authorized display PDF verified. Private PDF now consumes frozen candidate reference/persistence/verified attachment; its actual browser case compares identical issued/paid bytes and renders the attachment. Optional PDF failure never rolls back or repeats financial issuance. Reverse/trash/restore, issuer editing, links, FX ergonomics and charts need further work.

Team: actual list/role/suspend/resume/invite intention/cancellation verified; no invitation delivery. Owner/self/admin safeguards remain enforced by W1. Existing intent listing/roster pagination and remove journey remain partial.

Documents: actual metadata archive/restore and scoped prepare/upload/explicit finalize/private download verified. Current actor/document tickets remain authoritative. Scanner/hash attestation, inline preview, cleanup and processing imports are unavailable.

W3: typed refs/request/render/source/partiality/proposal/progress/cancel presentation handoff. Durable threads, streaming and model/provider semantics remain W3/Issue10; normal integrated sender is disabled. Inbox, automations, notifications, profile/subscription and reports retain explicit missing dependencies.

## Top10 remaining

1. Next-head acceptance for billing reverse/trash/restore, member removal and actual ticket revocation/expiry.
2. Remaining contact/calendar/opportunity/portfolio/billing/team state journeys with negative roles and stale versions.
3. Authorized paginated customer-bound collections and complete inventory.
4. Operator/plan/responsible selection and immutable ancestry-aware links.
5. Ticket expiry/revocation evidence in the product browser.
6. Financial charts/top clients and FX/fiscal-series ergonomics.
7. Inbox, automation and notification backend/consumers.
8. W3 durable thread/stream/proposal contracts.
9. All critical dialog/mobile/tablet captures and independent human visual review.
10. W4-reviewed Issue29 mitigation and release acceptance.

## Next3

1. Verify the next state/deadline checkpoint with fresh CI and actual Supabase/Auth/browser.
2. Close available state/provenance gaps with individual UI assertions, then reevaluate row acceptance from behavior.
3. Update Draft PR30 and W3 handoff with exact heads, metrics, limits and remaining blockers.

Supabase51/run37322338487 at2a021a7:29/29 actual browser groups and801 backend checks PASS. Contact archive/restore, task start/update/reopen/cancel, meeting update/complete/no-show, renewal update/resolve, customer/opportunity assignment, neutral-stage change and controlled opportunity archival now observed. Coincident weekly meeting cards are independently clickable after column layout correction. CI330 lint/types/244 tests/build and independent security/native/embedded/preview/Windows PASS; audit remains sole quality failure. Next attachment/work-priority source checkpoint requires its own fresh CI.
