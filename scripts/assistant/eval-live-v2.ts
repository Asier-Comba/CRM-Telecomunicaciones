import { readFile } from 'node:fs/promises'
import { OpenAiResponsesProvider } from '../../src/assistant/providers/openai-responses.ts'
import { productPlannerCatalogV2 } from '../../src/assistant/product-capabilities-v2.ts'
import { PRODUCT_READ_PLAN_JSON_SCHEMA_V2, parseProductReadPlanV2 } from '../../src/assistant/product-read-plan-v2.ts'
import { ASSISTANT_POLICY_V2 } from '../../src/assistant/product-read-turn-v2.ts'
import { boundedProviderTurnV2 } from '../../src/assistant/providers/bounded-turn-v2.ts'
import { scoreReadPlanV2, type ReadPlanExpectationV2 } from '../../src/assistant/evaluation/plan-score-v2.ts'

/** Explicit live planner evaluation over authored synthetic prompts. Never calls
 * a CRM tool or persists model JSON/prompt/trace. No-key is NOT_RUN, not PASS. */
const rows = (await readFile(new URL('../../evals/assistant/product-v2.jsonl', import.meta.url), 'utf8')).trim().split('\n').map(line => JSON.parse(line) as ReadPlanExpectationV2)
const provider = new OpenAiResponsesProvider({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL, projectId: process.env.OPENAI_PROJECT_ID })
if (provider.status !== 'ready' || !process.argv.includes('--live')) {
  console.log(JSON.stringify({ contract: 'assistant.eval.v2', status: 'NOT_RUN', reason: provider.status !== 'ready' ? 'provider_not_configured' : 'explicit_live_flag_required', scenarios: rows.length, policy: ASSISTANT_POLICY_V2.version, liveModelEvidence: false }))
} else {
  const context = JSON.stringify({ calendar: { date: '2026-10-06', timezone: 'Europe/Madrid' }, references: [],
    capabilities: productPlannerCatalogV2() })
  const measurements = []
  for (const row of rows) {
    const response = await boundedProviderTurnV2(provider, { instructions: ASSISTANT_POLICY_V2.instruction, userText: row.text, context,
      schemaName: 'assistant_read_plan_v2', schema: PRODUCT_READ_PLAN_JSON_SCHEMA_V2, maxOutputTokens: 4096 })
    const plan = response.ok ? parseProductReadPlanV2(response.value, []) : null
    measurements.push({ id: row.id, ...scoreReadPlanV2(plan, row),
      failureCode: response.ok ? null : response.code, inputTokens: response.ok ? response.usage.inputTokens : null,
      outputTokens: response.ok ? response.usage.outputTokens : null, durationMs: response.ok ? response.durationMs : null })
  }
  console.log(JSON.stringify({ contract: 'assistant.eval.v2', status: 'RUN', policy: ASSISTANT_POLICY_V2.version, model: process.env.OPENAI_MODEL || 'gpt-6.1-sol', liveModelEvidence: true,
    dataset: 'authored_synthetic', crmCalls: 0, groundedness: 'NOT_MEASURED', actionSuccess: 'NOT_MEASURED', cost: 'NOT_ESTIMATED_NO_PRICING_POLICY', measurements }))
  if (measurements.some(m => !m.validPlan || !m.capabilityCorrect || !m.argumentCorrect)) process.exitCode = 1
}
