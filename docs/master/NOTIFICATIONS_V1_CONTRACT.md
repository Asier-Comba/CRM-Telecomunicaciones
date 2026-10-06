# Personal notifications v1

Current acceptance: c2a7390867d941a33b17509b3f4014f8356bb0c1, real run37361774116 (1,298 checks), native/quality37361774252 (53 migrations/247 privilege entries/243 Node tests). [Authoritative closure](W1_PRODUCT_CLOSURE_20261005.md) records the limits. Human backend only; UI_SAFE=false pending W2/W4.


Default-off POST /api/notifications/v1, PRODUCT_V1_ENABLED plus exact PRODUCT_V1_ORIGIN, current SSR membership; UI_SAFE=false. owner/admin/member only. No browser-selected recipient, arbitrary URLs, raw task titles/PII or external delivery. Private forced-RLS center and notifications, no raw grants.

notification.list {limit1..100/default20,after_id UUID ascending optional}; notification.unread_count {}. Both return center version (initial0) and only self-recipient/currently authorized targets. DTO {id,kind,title,safe fixed summary,target:{kind,id},created_at,read_at}; target currently task/customer, W2 maps descriptor to route. No source key/body/recipient data in DTO. Viewer and suspended JWT denied; reassigned tasks disappear for prior commercial assignee.

notification.refresh {command_id,expected_version}: explicit deterministic bounded scan of current user's assigned pending/in_progress overdue tasks. Deadline/target identity is the source event; unique workspace/recipient/kind/source key prevents spam on refresh or retry. Uses actual database time; no invented periodic scheduler or push delivery. At most100 new events per call; receipt has_more explicitly requests continuation. No automatic notification on clock passage without calling refresh. Initial generation supports task overdue only; other event families require registered, independently tested adapters.

notification.mark_read {command_id,id,expected_version}; notification.mark_all_read {command_id,expected_version}. CAS is personal center version, never shared read state. mark_all_read is an explicitly bounded100-item batch and reports has_more; repeat with returned version until false. Receipts {contract_version:notifications.v1,operation,command_id,version,affected,has_more}. Refresh increments once per emitted event plus command; mark commands increment once. HMAC replay returns same receipt; changed replay/stale version409. Product audit commits atomically and excludes content. no-store;4KiB closed envelope.

Validation at the recorded accepted source: native/embedded fresh/restored fixtures and real acceptance of all five operations, twenty identical refresh requests, no duplicate event, recipient/tenant/viewer/revoked-JWT denial, CAS/changed replay and target reauthorization. Native independent processes test twenty retries, same-source emits with one effect, and distinct CAS writers with one winner.

No AI registrations. W3 needs an explicit minimized-read privacy adapter; human writes require future durable Issue10 confirmation.
