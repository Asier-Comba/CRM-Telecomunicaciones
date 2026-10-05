# Inbox v1 — internal conversations

Current acceptance: c2a7390867d941a33b17509b3f4014f8356bb0c1, real run37361774116 (1,298 checks), native/quality37361774252 (53 migrations/247 privilege entries/243 Node tests). [Authoritative closure](W1_PRODUCT_CLOSURE_20261005.md) records the limits. Human backend only; UI_SAFE=false pending W2/W4.


Accepted internal backend, default off, UI_SAFE=false; exact current evidence is recorded below. POST /api/inbox/v1 uses PRODUCT_V1_ENABLED and exact PRODUCT_V1_ORIGIN, current SSR getUser/workspace membership. Internal manual notes only; provider not_configured, external send and webhook unregistered.

Owner/admin read all workspace conversations; member reads and uses assigned conversations, may create self-assigned conversations; viewer denied. Only owner/admin assign or change customer/contact linkage. Assignee must be active owner/admin/member in current workspace; customer/contact must be active and contact belongs to linked customer. Read and replay reauthorize current access; reassignment removes member body and receipt access.

Reads: inbox.list metadata (limit1..100/default20, UUID after_id ascending, status open/closed/archived defaultopen); inbox.get_thread (id, limit1..50/default20, after_seq ascending, bounded private bodies); inbox.unread_summary self-readable nonarchived count. Timestamps are authoritative UTC DTO values. Body never enters audit/search/logs/telemetry; no raw provider payload.

Commands: conversation.create_internal {command_id,assigned_user_id,customer_id,body}; message.add_internal_note {command_id,id,expected_version,body}; conversation.assign adds assigned_user_id; conversation.link_customer adds customer_id,contact_id; conversation.close/reopen/archive/restore/mark_read/mark_unread use command_id,id,expected_version. All fields closed; body trimmed1..2000codepoints; unknown fields rejected. Command UUID is HMAC-bound to immutable intent. Create version1; all other conversation changes CAS conversation version. Mark-read/unread CAS self marker version (initial0), increment marker only, never change global conversation version. Archive preserves prior open/closed status; restore recovers it. Add-note/close require open, reopen requires closed, restore requires archived. Product audit and effects commit together.

Receipts {contract_version:inbox.v1,operation,command_id,id,version,status}. Read markers return read/unread; conversation receipts return open/closed/archived. No content in receipt. no-store, bounded12KiB envelope, SSR-derived authority, safe coded errors. Unassigned conversation is owner/admin-only.

Validation at the recorded accepted source: native fresh/logical restore, immutable body/audit rollback/role/CAS fixtures and real disposable acceptance of all 13 operations, twenty distinct CAS appends and twenty marker replays, changed intent, foreign scope, revoked JWT and assignment removal.

W3: future explicit bounded conversation-summary capability may reuse authorized get_thread; no blanket AI access. Normal writes are FUTURE_AI_ACTION_CANDIDATE only, Issue10 confirmation required, no assistant registration. W2 consumes exact parsers and server versions; does not infer external delivery or release readiness.
