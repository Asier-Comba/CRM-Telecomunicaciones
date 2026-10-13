import { readFile } from 'node:fs/promises'
import { OpenAiResponsesProvider } from '../../src/assistant/providers/openai-responses.ts'
import { ASSISTANT_POLICY_V2 } from '../../src/assistant/product-read-turn-v2.ts'
import { type ReadPlanExpectationV2 } from '../../src/assistant/evaluation/plan-score-v2.ts'

/** Explicit live planner evaluation over authored synthetic prompts. Never calls
 * a CRM tool or persists model JSON/prompt/trace. No-key is NOT_RUN, not PASS. */
const rows = (await readFile(new URL('../../evals/assistant/product-v2.jsonl', import.meta.url), 'utf8')).trim().split('\n').map(line => JSON.parse(line) as ReadPlanExpectationV2)
const provider = new OpenAiResponsesProvider({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL, projectId: process.env.OPENAI_PROJECT_ID })
if (provider.status !== 'ready' || !process.argv.includes('--live')) {
  console.log(JSON.stringify({ contract: 'assistant.eval.v2', status: 'NOT_RUN', reason: provider.status !== 'ready' ? 'provider_not_configured' : 'explicit_live_flag_required', scenarios: rows.length, policy: ASSISTANT_POLICY_V2.version, liveModelEvidence: false }))
} else {
  // A configured key and --live are not a spend authorization. The previous
  // path called every row with unknown cost; a quote-only tenant budget cannot
  // bound that expenditure. Keep the authored bank and scoring contracts, but
  // admit no provider request until a durable shared reservation/settlement
  // controller and bounded diagnostic sample are actually wired here. There
  // is deliberately no environment flag that can waive these missing controls.
  console.log(JSON.stringify({ contract: 'assistant.eval.v2', status: 'NOT_RUN', reason: 'durable_shared_budget_controller_not_installed',
    scenarios: rows.length, policy: ASSISTANT_POLICY_V2.version, liveModelEvidence: false, providerRequests: 0,
    sharedLimitMicrousd: 1500000, firstBatchLimitMicrousd: 500000, budgetEnforcement: 'NOT_IMPLEMENTED',
    groundedness: 'NOT_MEASURED', actionSuccess: 'NOT_MEASURED', cost: 'NOT_INCURRED' }))
  process.exitCode = 2
}
