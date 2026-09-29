# Live semantic evaluation v1

Run `npm run build`, then `node scripts/run-live-semantic-eval.mjs`.
External prerequisite: a reviewed live-provider module configured by absolute
`W3_EVAL_PROVIDER_MODULE` path, with its model/credential supplied securely by the
server environment. No provider or key is currently configured in this workspace.
The CLI therefore exits 2 with `LIVE_EVAL_NOT_RUN`; no live accuracy is claimed.

The module exports `contract = 'assistant.live-provider.v1'` and `candidate`:

```ts
import type { BenchmarkCandidate } from './provider-benchmark.js'
export const candidate: BenchmarkCandidate = {
  id: 'registered_model_configuration', mode: 'llm',
  inputMicrousdPerMillion: 0, // replace with verified configured price
  outputMicrousdPerMillion: 0,
  async generate(input, signal) {
    // Use your reviewed fixed provider endpoint, configured model, secret and
    // AbortSignal. Send input.context.protocol as system instructions; all CRM
    // context/evidence/history stays untrusted DATA. Return parsed unknown JSON.
    // Do not send DB credentials, select a URL from the prompt or log raw output.
    throw new Error('provider_not_configured')
  },
}
```

This is a provider implementation contract, not a bundled HTTP provider adapter.
Credentials alone do not imply configured model, endpoint or approved budget.
No provider-specific default or unverified current pricing is embedded. Pin module
and model configuration with report evidence; use the existing measured routing
lanes only after quality is observed. Fallback must be configured outside planner
and reported through fallbackUsed; automatic fallback is absent from this runner.

24 targeted Spanish cases cover commercial language, typo, ordinal/short follow-up,
duplicate names, partial date, missing parent, revoked handle, unavailable dashboard,
disabled writes, cross-tenant/SQL requests and injection in four business-text
sources. Synthetic fixtures are NOT CRM records or live semantic evidence.

Judge output is closed: intent, decision, plan, claims. It validates actual W3
SemanticReadPlan and StructuredClaim contracts, including exact reference target
field, current evidence and numerical truth. Claims cannot be replaced with prose.
Gold expectations and stable case IDs never go to the candidate. Cases are
independent contextual multi-turn continuations, not full interactive agent rollouts.
The exact typo query expectation deliberately tests non-invention, not fuzzy DB
recall. Broader acceptable plans must be reviewed before expanding the scorer.

Separate metrics: intent, tool selection, arguments, reference resolution,
abstention, grounding, numerical faithfulness, partiality, unsafe rejection and
multi-turn coherence. Inapplicable metrics have null scores; provider failures and
timeouts remain in applicable denominators. Records include latency, tokens,
configured estimated cost and fallback usage. No raw prompt/output/error/secret
enters report. Cost is model configuration data, not a billing guarantee.

Exit 0 means every applicable metric passed; exit 1 includes scored failures,
timeouts or missing observations; exit 2 is configuration/runner failure.
Current unit tests exercise a labelled stub transport and negative judge cases;
their success does not constitute live model quality.
