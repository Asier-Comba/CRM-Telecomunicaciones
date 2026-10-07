# Conversation / read-turn v2 handoff — candidate checkpoint C

Base: W2 `c632f0a`; latest observed W2 `2febd90` remains unmerged. Draft PR31 targets W2. PR9 untouched. No W2 telecom-domain SQL is duplicated.

Forward migration `20261006221429_assistant_conversations_v2.sql` creates three forced-RLS user-owned tables: conversations, read turns and messages. Composite ownership foreign keys, immutable identity column privileges, closed status constraints and triggers protect the lifecycle. Forward fix `20261006224734_assistant_history_rpc_only.sql` closes all raw table/sequence privileges, including column UPDATE grants. The sole closed history RPC uses SECURITY DEFINER with empty search_path and PUBLIC/anon/service_role EXECUTE revoked. Its owner can bypass RLS; explicit auth.uid(), active workspace/membership locks and actor/workspace predicates are therefore mandatory authority checks, not assumptions about RLS. Forced RLS remains defense in depth. No browser service-role client is used. Application services re-resolve authority before/after every awaited repository call.

| POST boundary | Operation | Closed input |
|---|---|---|
| `/api/assistant/v2/threads` | thread.list | optional limit1..50, after_id |
| same | thread.create | server/client request UUID id, title1..120 |
| same | thread.get | id |
| same | thread.rename | id, expected_version, title |
| same | thread.archive | id, expected_version |
| same | message.page | id, optional limit1..50, after_sequence |
| same | turn.cancel | id, turn_id |
| `/api/assistant/v2/turn` | turn.read | id, turn_id, text<=4000chars/8000bytes |

Envelope: `{operation,input}` only. Cookie auth; body/model cannot select actor/workspace. Bearer and x-workspace-id headers are denied. Same canonical Host/Origin, JSON UTF8, no content encoding, streamed12288byte cap,5s body deadline, no-store/nosniff. Production/remote DB gates are closed; existing W2 synthetic loopback flags plus AI_PRODUCT_V2_ENABLED are mandatory.

`ConversationResultV2` is a closed discriminated contract: assistant.thread.v2 record; assistant.threads.v2 items/next_id; assistant.messages.v2 items/next_sequence/historical:true; assistant.turn.v2 id/status/replay. Message pagination uses immutable insertion ordinal, never UUID chronology. Pages preserve partiality via cursor. Thread listing uses stable UUID order; archived threads stay retrievable by owner and retain history. Archive cancels running read turns atomically; no delete/purge operation exists.

Read lifecycle: running -> completed/cancelled/failed. Turn UUID and exact original text are bound to owner/workspace/conversation. Replay returns existing state and MUST NOT start generation again. Concurrent second turn conflicts. Finished turns cannot revive. Member version changes prevent old completion even after reactivation. Read-only abandoned generations expire after90s; a new read start can close an expired running turn as failed/unavailable. No business action is retried by this mechanism.

SSE contract assistant.stream.v2 emits started, then final/cancelled/failed. Final contains `ProductAssistantResponseV2` plus safe token/latency telemetry. Current implementation streams lifecycle, not raw token/plan deltas. Response tables are ephemeral validated facts; historical storage currently contains only generic answer text. Cancellation stops provider/next reads; a concurrent DB cancellation/conflict suppresses final factual blocks. Committed history is retained if response delivery is lost. SDK-independent logical await deadlines and provider deadlines fail safely; repository timeout never proves rollback.

UI must render labels/content as text. Historical messages are explicitly untrusted past display, never grounded current facts or input authority. No model URL, action block, provider trace, reasoning or raw tool JSON is persisted. Direct authenticated DML is denied. A user can still author their own historical display through the closed RPC; history is never a proof of CRM state or action approval.

Current evidence:389 bootstrap +458 assistant deterministic tests PASS on the merged W2 source. Fresh72-migration PGlite ownership/raw-denial/atomicity/full privilege fixture PASS, explicitly embedded. Native and real Supabase acceptance for this forward fix remain pending; the previous C checkpoint failed raw-history access and bootstrap inventory. The actual Auth/PostgREST/application-cookie lifecycle harness is versioned without claiming an unexecuted PASS. CI uses a separate loopback development process because assistant production transport remains denied. This is NOT native20-worker business durability acceptance. No local PostgreSQL/docker binaries available. Issue10 remains open.

Pending: persisted selected context/revocation triggers, rich historical factual snapshots, modern entity lookup, remaining minimized read families, invoice UI route, real command/audit/outbox adapter and independent W4 review. W2 can consume these versioned structures behind local gates without breaking UIv1. W4 review requested for cookie scope, RLS/grants, cancellation/replay and storage minimization.
