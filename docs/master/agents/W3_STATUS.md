# W3 AI product v2 — checkpoint C, 2026-10-06

Branch: `w3/ai-product-v2`, Draft PR31 against W2, base `c632f0ad936b0d24e77fe77144666a23753a762f`. Latest fetched W2 `2febd90` unmerged (import-only changes). PR9 remains Draft at dc19ce6, untouched. Source inventory: W1 `182283f` / accepted `e9d8bcf`; W2 consumed `8c93d4c`, not newer location/equipment families. Last published B `01507917f2f8e48a9e910690883e4e333f51c245`.

Implemented: deliberate hardened runtime port; provider-neutral server OpenAI Responses adapter (strict JSON, store:false, cancellation, bounded body, safe usage/errors);30 current collection/report read capability candidates; closed8-node semantic DAG; existing authorized server-service adapters; revocation/actor/workspace/epoch fences; deterministic source-backed UI v2 alongside unchanged UI v1; exact-decimal nonmutating invoice.propose review flow.220-operation machine inventory records unregistered operations as denied schemas and disabled gates.

Checkpoint C adds actual PostgreSQL user-owned conversation/read-turn/message persistence, transactional lifecycle RPC, forced RLS/ownership, version/replay/expiry/cancellation guards, minimized history, same-origin bounded local application routes and final-only validated SSE. Deadline-bounded core/repository awaits, closed capability enum and portable native process runner startup. No stored reference or business action path is enabled.

Validation:354 bootstrap +458 assistant deterministic tests PASS (812 total); final typecheck/build PASS; lint0errors/1existing W2 warning. PGlite67-migration conversation RLS/atomicity/full function-privilege fixture PASS. Native fixture wired to fresh+restore CI, pending remote C. B remote7successful/2skipped; aggregate lint/types/tests/build failed only at5HIGH npm audit notices in Issue29, unsuppressed. Historical414 tests are included in assistant total. Live eval command `npm run eval:assistant:v2 -- --live`:16 authored prompts, current NOT_RUN/provider_not_configured. Native PostgreSQL/docker absent locally; no20-worker business durability proof.

AI_FOUNDATION_COMPLETE: NO (context bindings, rich historical blocks, remaining minimized families and product UI wiring pending).
DURABLE_CANDIDATE_COMPLETE: NO (physical adapter/dispatcher/native process tests pending).
W4_DURABLE_ACCEPTANCE: PENDING. Issue10 OPEN. LIVE_MODEL_EVAL: NOT_RUN / missing server provider configuration. No key requested. No assistant mutation enablement, live sends, main merge or production.

Persisted contracts: ai/W3_V2_PORTING_MAP.md, ai/W3_AI_CAPABILITY_REGISTRY_V2.json, ai/AI_PRODUCT_POLICY_V2.md, ai/W3_CONVERSATIONS_UI_CONTRACT_V2.md, W3_HANDOFF_W2_AI_PRODUCT_V2.md. Generic durable contract/native process-v2 specification retained without claiming business-effect implementation. W2/W4 handoff via PR31/30/9 and Issue10; no hidden dependency.

Next: real scoped persisted context, broader minimized authorized readers, durable action adapter/original audit+delivery outbox, registered command dispatcher and independent20-worker acceptance. Existing W2 backend/domain remains authoritative. Re-read W2/W4 live before each integration checkpoint. No assistant writes, sends, main merge, VPS or production changes.

Publishing through authenticated GitHub browser because CLI HTTPS push has no credentials. No authorization bypass.
