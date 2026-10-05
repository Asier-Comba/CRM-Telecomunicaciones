# Personal notifications v1

Current acceptance: c2a7390867d941a33b17509b3f4014f8356bb0c1, real run37361774116 (1,298 checks), native/quality37361774252 (53 migrations/247 privilege entries/243 Node tests). [Authoritative closure](W1_PRODUCT_CLOSURE_20261005.md) records the limits. Human backend only; UI_SAFE=false pending W2/W4.


Default-off POST /api/notifications/v1, PRODUCT_V1_ENABLED plus exact PRODUCT_V1_ORIGIN, current SSR membership; UI_SAFE=false. owner/admin/member only. No browser-selected recipient, arbitrary URLs, raw task titles/PII or external delivery. Private forced-RLS center and notifications, no raw grants.

notification.list {limit1..100/default20,after_id UUID ascending optional}; notification.unread_count {}. Both return center version (initial0) and only self-recipient/currently authorized targets. DTO {id,kind,title,safe fixed summary,target:{kind,id},created_at,read_at}; target currently task/customer, W2 maps descriptor to route. No source key/body/recipient data in DTO. Viewer and suspended JWT denied; reassigned tasks disappear for prior commercial assignee.

notification.refresh {command_id,expected_version}: explicit deterministic bounded scan of current user's assigned pending/in_progress overdue tasks. Deadline/target identity is the source event; unique workspace/recipient/kind/source key prevents spam on refresh or retry. Uses actual database time; no invented periodic scheduler or push delivery. At most100 new events per call; receipt has_more explicitly requests continuation. No automatic notification on clock passage without calling refresh. Initial generation supports task overdue only; other event families require registered, independently tested adapters.

notification.mark_read {command_id,id,expected_version}; notification.mark_all_read {command_id,expected_version}. CAS is personal center version, never shared read state. mark_all_read is an explicitly bounded100-item batch and reports has_more; repeat with returned version until false. Receipts {contract_version:notifications.v1,operation,command_id,version,affected,has_more}. Refresh increments once per emitted event plus command; mark commands increment once. HMAC replay returns same receipt; changed replay/stale version409. Product audit commits atomically and excludes content. no-store;4KiB closed envelope.

Coverage:46 migrations213 privileges;219 Node tests/lint/types/build and embedded fresh/restored fixtures (record exact outcomes). Actual acceptance5 individual operations,20 identical refresh requests, no duplicate task event, tenant/recipient/viewer/revokedJWT/CAS/changed replay and target reauthorization. Native independent processes test20 command retries,20 same source emits one effect,20 distinct center CAS one winner. Real acceptance pending until published exact SHA passes.

Inbox accepted separately at950d07e/run37345253259:925 real checks,13 individual operations; native204 privileges and216 Node/lint/types/build PASS, audit Issue29 fails. Total103 previously proven plus5 notification candidates=108. No AI registrations; W3 minimized reads only after explicit privacy review; human writes FUTURE_AI_ACTION_CANDIDATE/Issue10.
