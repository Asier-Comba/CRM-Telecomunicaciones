# OpenAI: server-only contract with controlled cost (W5 proposal, 22/10/2026)

Status: **PROPOSAL for Asier Work / W3 and W4. Nothing enabled.**
- AI writes OFF (issue #10).
- 0 EUR policy: no paid calls without a specific budget authorization.
- The key's value is never read or printed.

## Verified baseline (source `f9aa469b` + W5, read-only)

| Fact | Evidence |
|---|---|
| Key exists | Repository Actions secret `OPENAI_API_KEY` (2026-10-13). No environment, Dependabot or Codespaces secret |
| Injected into | Nothing. No workflow references it, and it is not a Netlify site or team variable |
| Runtime call sites | `src/assistant/providers/openai-responses.ts` (`OpenAiResponsesProvider`, v2, measured usage, strict output parsing); `src/lib/agents/{nowlabs-main-agent,whatsapp-agent}.ts`; `planner/{semantic-planner,response-synthesizer,shadow-hook}.ts` |
| Reachable from hosted routes | **None**: no file under `src/app` imports these agents or the v2 provider; only `__evals__` do |
| Gating | Presence of `OPENAI_API_KEY` alone (e.g. `nowlabs-main-agent.ts:2348`, `whatsapp-agent.ts:187`); v2 route gated by `AI_PRODUCT_V2_ENABLED` |
| Budget ledger | `scripts/assistant/eval-budget-ledger-v1.mjs`: SQLite, evaluation only (1.50 USD total / 0.50 USD per batch, in micro-USD), refuses `NODE_ENV=production`. **No runtime ledger** |
| Kill switch | None for runtime calls |

**Consequence:** configuring the key in Netlify today would not spend by itself, because nothing reachable calls it. But the first route that imports an agent would spend **without a budget, a ledger or a kill switch**. So the key must stay **unbound** until the contract below is implemented and reviewed.

## Contract `ai-provider-status.v1` (server-only, never sent to the browser with values)

| Field | Meaning | Source of truth |
|---|---|---|
| `provider_available` | Key bound server-side **and** health check passed (no paid call; e.g. a models-list request or a cached result) | Server env + health check |
| `budget_authorized` | A written, unexpired budget authorization exists (global and per tenant, in currency units) | Versioned policy file approved by the owner (same pattern as `staging-deploy-policy.json`) |
| `model_selected` | Exact model id from configuration (`OPENAI_MODEL` / `OPENAI_ASSISTANT_MODEL`), checked against an allowlist | Config |
| `usage_metered` | Every call reserves a maximum cost before the request and settles measured tokens after it, in a durable, transactional, concurrency-safe ledger (Postgres in Supabase, not SQLite) | Ledger |
| `kill_switch` | One flag that refuses new calls immediately in every instance (DB row read per request, or env plus redeploy), testable | DB / config |
| `health` | `ok` / `degraded` / `down` from the last check, without provider text | Health route |
| `blocked_reason` | First failing condition: `NOT_CONFIGURED`, `BUDGET_NOT_AUTHORIZED`, `BUDGET_EXHAUSTED`, `KILL_SWITCH`, `PROVIDER_DOWN`, `MODEL_NOT_ALLOWED` | Derived |

Enabling requires **all** of: `provider_available && budget_authorized && usage_metered && !kill_switch && health==='ok'`. Otherwise the assistant degrades to its deterministic fallback and shows that it is degraded. It never retries in a loop.

## Required before binding the key (owners)

1. **W3 / Asier Work:** route every runtime call through one gateway that reserves, calls and settles. Remove the presence-only gating in `nowlabs-main-agent` and `whatsapp-agent`, or keep those modules unreachable. Enforce token, call and tool limits per request and per tenant.
2. **W1:** Postgres ledger migration (forward-only), RLS deny-all, SECURITY DEFINER reserve/settle with search_path pinned, and a unique call reference for idempotent retries.
3. **W5:** bind the key server-only (Netlify `functions`/`runtime` scopes, secret, never `NEXT_PUBLIC_`, never in `builds`); add a browser-bundle canary for the key class (the existing `browser-secret-check` already lists `OPENAI_API_KEY`); keep CI workflows free of this secret; add a cost and kill-switch smoke test that makes no paid call.
4. **W4:** independent review of the gateway, the ledger and the kill switch.
5. **Owner:** written budget (global, per tenant, expiry date). Under the current 0 EUR policy, `budget_authorized=false` and the provider stays `NOT_CONFIGURED`.

The cost per query is measured from settled ledger rows, not estimated.
