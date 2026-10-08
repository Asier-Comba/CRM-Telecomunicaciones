# W3 → W2 AI product v2, checkpoint B

Source base c632f0a. New branch w3/ai-product-v2 stacks on w2/product-integration-v2; PR9 remains isolated Draft.

Stable today: existing AssistantResponse v1 unchanged. New provider-neutral interface `src/assistant/providers/ai-provider.ts`; Responses server factory `src/lib/server/ai-provider-v2.ts`. Do not render plan_delta as a user answer or interactive action. It is unvalidated internal planning text; only validated final responses may contain UI blocks.

Modern local read libraries: `product-capabilities-v2.ts`, `product-read-plan-v2.ts`, `product-read-executor-v2.ts`, authorized factory `assistant-product-readers-v2.ts`. 30 current collection/report operations; no direct DB reads in semantic core. Server host supplies fresh current-cookie authority and an opaque-reference resolver with resource reauthorization. No browser/model-created actor or workspace binding. No route wired yet. `runProductReadTurnV2` connects the semantic provider to this executor; `composeProductResponseV2` emits source-backed tables with human labels. It accepts only in-process runtime-issued evidence; persisted evidence needs revalidation, not fabricated proof.

Billing: `prepareInvoiceProposalV2` returns review/clarify/forbidden/unavailable/invalid_intent. Review contains backend-normalized billing.v1 proposal with saved:false, requiresReview:true and issueRequiresSeparateConfirmation:true. W2 can render/edit it using existing billing draft UI; no persistence/issue shortcut. Unknown tax/date/currency/series requires explicit input. Monetary truth remains backend calculateBillingV1.

Machine inventory: docs/master/ai/W3_AI_CAPABILITY_REGISTRY_V2.json pins220 W1 operations at182283f; only30 have current minimized local read schemas. Others use false schemas and disabled gates. W2 current base consumed8c93d4c, so latest equipment/location families are not silently available.

Do not change raw CRM schema or W1 migrations for this handoff. Assistant-only threads/durable implementation is next W3 checkpoint; backend commands/domain services remain your authority. Issue10 stays OPEN; confirm/draft execution remains blocked pending native and W4 proof.
# Checkpoint C — application conversations / streaming

Stable candidate contract: `docs/master/ai/W3_CONVERSATIONS_UI_CONTRACT_V2.md`; policy: `docs/master/ai/AI_PRODUCT_POLICY_V2.md`. Draft PR31. New current-cookie thread lifecycle and read-turn SSE routes remain behind all synthetic loopback flags plus AI_PRODUCT_V2_ENABLED. Thread UUID is history identity, never CRM authority. Historical message pages are marked historical:true and currently store generic answer text; factual tables remain ephemeral validated reads. No persisted selected context yet. UIv1 unchanged.

Forward assistant-only SQL, RLS/ownership/atomic lifecycle and native CI fixture are versioned.812 unit tests plus embedded DB fixture/types/lint/build PASS locally. Native C CI pending; no business durability acceptance. Issue10 stays open; no action, sends or production enablement. Live16-case planner command reports NOT_RUN when provider is absent. W4 review requested for these new candidates.

## Checkpoint D: normal W2 merge and history boundary candidate

W2_BASE:4de7cad45c4005b7903dbe97502febfff457541f, normal remote merge PR32 ffdca160. Original history migration unchanged; new forward migration closes raw table/column/sequence privileges. Sole authenticated closed RPC now performs explicit current identity, locked active workspace/membership and actor/workspace predicates; SECURITY DEFINER owner bypasses RLS and is documented for W4 review. Generic raw-denial acceptance stays intact. Canonical bootstrap manifest includes all72 migrations.

THREAD_ROUTES/UI contract unchanged: POST /api/assistant/v2/threads and /turn, bounded cookie/Origin contract and final-only validated SSE. Actual Auth/PostgREST + cookie thread lifecycle harness added; remote PASS pending. Local389+458=847 tests and72-migration PGlite PASS. READY_TO_CONSUME:NO until D Supabase/native evidence is observed. No general W2 UX or domain duplication. Shared files:bootstrap manifest, privilege matrix, additive CI paths and disposable run-stack/history harness. No production transport exception.

## Checkpoint F: consume NO, W2 stable sync

W2 `7ab6f56f10fc65aa7212ed5dfbdeacea8901756a` consumed by normal isolated PR33 merge `19009526af680c521d69f66c77c94509e21b3ebd`. Local391 bootstrap +464 assistant =855 PASS; final types/build PASS; lint0errors/1inherited warning; embedded73-migration fixture PASS; strict metadata negative tests11 PASS. W3_READY_FOR_W2_READ:NO; ACTION_CANDIDATE:NO.

E real Supabase `37691512988/job113032625825` proves raw history401/403/403 and actual Auth/PostgREST/cookie lifecycle, replay, ownership and valid-JWT revocation PASS. Overall run failed at W2 browser warmup: W3 history dev process occupied W2's existing3109 port. F starts/stops that process inside the assistant history callback before W2's unchanged browser journey; no W2 checks/gates changed. Native E passes fresh296-function matrix then rejects restore metadata equality. Added allowlisted metadata diagnosis and column ACL equality coverage; strict checker unchanged, restore acceptance remains pending. Provider-neutral abort/deadline/result validation is pure and vendor-independent. No feature-schema expansion before relevant gates. Issue10 OPEN, no registered business write dispatcher or native20-process evidence yet.

## Checkpoint G — no hidden integration dependency

W2_BASE remains7ab6f56 via normal PR33; W3_READY_FOR_W2_READ:NO and ACTION_CANDIDATE:NO. No route/UI-block/schema changes. Semantic30-read catalogue has Spanish descriptions and explicit current-scope policies;220-operation registry retains190 disabled candidates.40 authored synthetic evals, exact full-plan scoring, NOT_RUN live provider. G local862 Node +73-migration embedded +11 strict metadata tests PASS, types/build/lint as W3_STATUS.

F native restore rejection was caused by uppercase S foreign-server fallback in the snapshot, not actual missing sequence privileges. G corrects to lowercase s, compares real implicit/explicit default ACLs, and retains the unchanged strict equality/no-acl negative gates. Native actual rerun pending. F full Supabase still running; prior E actual raw/auth/cookie checks passed but full run failed on dev-port collision, which F manages by teardown. Consume only after explicit readiness with exact completed evidence. Real database restart added to portable acceptance, still NOT_RUN without physical driver. Issue10 OPEN/W4 independent pending; no writes/sends/main/prod.

G follow-up: final SSE telemetry adds providerState enum not_configured/configured/degraded/unavailable; configuration/transport observation only, not authority/live-model acceptance. Same closed final response blocks and source semantics. Disposable run-stack emits static phase markers and identifies W2 browser stage; no W2 assertions modified. W2 PR30 latest69/79 candidate failures are acknowledged; next current-read/fixture checkpoint will be merged normally. Read/action readiness remains NO until exact completed gates.

F exact completed result:Supabase37693038612/job113038023975 FAILURE19m1s, failed_stage:http_acceptance, error:W2_UI_FAILED_JOURNEYS, teardown:PASS. Both assistant_history PASS_ACTUAL_AUTH_POSTGREST_SCOPE_REPLAY_CAS_REVOCATION and assistant_history_application_api PASS_ACTUAL_COOKIE_THREAD_LIFECYCLE observed. The dev-port warmup defect is no longer the failure. Ten W2 journey failures observed, starting portfolio_manual_service_line_renewal_source TIMEOUT, also calendar/portfolio/import/opportunity/mobile/document/equipment/shell groups; consistent with W2's current independent7ab diagnosis, without claiming causality for every group. W2 owns reference-load/fixture repairs. No full green/readiness claim. G+H publication can proceed now without cancelling F.
