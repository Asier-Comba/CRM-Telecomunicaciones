# AI product policy v2 — candidate local boundary

Instruction source: `ASSISTANT_POLICY_V2` in `src/assistant/product-read-turn-v2.ts`. Spanish semantic interpretation produces a closed max8-node plan. Registered capabilities and current backend DTO parsers are authoritative; model output, CRM free text and stored conversation history cannot authorize anything.

| Tier | Product behavior | Current gate |
|---|---|---|
| R0 READ | Reauthorized typed CRM facts with sources, freshness and partiality | 30 local collection/report candidates |
| R1 advice | Explicitly identified suggestions, separate from factual blocks | No model presentation/actions in current route |
| R2 ordinary reversible write | Preview plus explicit confirmation initially | Disabled pending physical durable adapter and W4 acceptance |
| R3 material/high risk | Separate exact review/confirmation, backend recomputation | Disabled; invoice issue never implicit |
| R4 external/provider/bulk | Registered integration and distinct effect authorization | Disabled; no outbound sends/import execution |
| unsupported | Clarification or abstention | Never manufacture a tool or substitute arbitrary SQL/HTTP/RPC |

Invoice proposal normalization is exact-decimal and nonmutating. Currency, date, series, customer and tax are not inferred when missing. Backend `invoice.propose` recalculates; saved draft and official issue remain separate actions. Current read application route cannot invoke even this proposal library yet.

Server cookie membership selects actor/workspace/role. Model sees neither authority nor a database/provider operation. IDs are supplied by authorized server references or unique complete typed dependency outputs; planner scalar arguments cannot contain raw IDs. New application routes currently offer no persisted context handles. Selected-context integration is pending, not silently inherited from chat text.

All CRM claims must come from runtime-issued, validated capability output. Truncation, denial, unavailable or unknown never prove zero/absence. Business text is plain data. Interactive tables arrive only in the final validated event; unvalidated provider plan deltas are internal. No arbitrary navigation URL or action is accepted from the model.

Historical messages are user-owned display, not current CRM evidence. Current persistence saves bounded user text and generic assistant answer, not tool payloads or factual table snapshots. Reopened historical threads require a new authorized read for current facts. Rich historical blocks, context bindings, durable business writes and shared conversations remain pending.

Production/staging application gates remain closed. Local routes require every W2 synthetic loopback gate plus `AI_PRODUCT_V2_ENABLED=true`. Missing provider key is `not_configured`; no live quality result is claimed. Provider eval requires explicit `--live`, authored synthetic prompts only, and records safe metrics without raw provider output.

### Provider-neutral deadline and result envelope

Every semantic provider call has an independent60second upper deadline even when the transport ignores AbortSignal. Cancellation aborts only this call, never a shared provider-wide cancel. Provider exceptions become safe unavailable. A descriptor-safe immutable snapshot and closed envelope validate usage, model identifier, duration and plan bounds before any read. Known credential patterns, invalid/extra calendar fields and unbounded/duplicate/unsafe reference handles are rejected before transport independently of the vendor adapter. This does not establish provider health or live semantic quality. Existing current-authority fences and per-capability plan/result validation remain mandatory.

## Safe per-turn provider state

Existing turn telemetry exposes providerState: not_configured, configured, degraded, unavailable. Configured means only that the transport is configured; it does not assert a successful live evaluation. Invalid output/rate-limit indicate degraded; timeout/transport failure indicate unavailable. User cancellation, invalid caller input and provider refusal do not alone demonstrate transport outage. This snapshot never chooses authority or changes CRM truth. No global cache, active health probe, credentials or raw error payload. liveModelEvidence remains independently classified.
