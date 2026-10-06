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
