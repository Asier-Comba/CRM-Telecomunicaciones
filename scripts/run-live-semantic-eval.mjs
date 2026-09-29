import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runLiveSemanticEval } from '../dist/src/assistant/live-semantic-eval.js'
import { SPANISH_INTEGRATION_CORPUS } from '../dist/src/assistant/spanish-integration-corpus.js'

// A reviewed local provider module owns model identity, credentials and fixed
// provider endpoint. The planner/output cannot choose or configure that module.
const modulePath = process.env.W3_EVAL_PROVIDER_MODULE
if (!modulePath || !isAbsolute(modulePath)) {
  console.error('LIVE_EVAL_NOT_RUN: configure W3_EVAL_PROVIDER_MODULE with an absolute reviewed live-provider module path; credentials stay inside that module/environment.')
  process.exit(2)
}
try {
  const provider = await import(pathToFileURL(modulePath))
  if (provider.contract !== 'assistant.live-provider.v1' || provider.candidate?.mode !== 'llm' || typeof provider.candidate.generate !== 'function') throw new Error('invalid_provider')
  const report = await runLiveSemanticEval(provider.candidate, SPANISH_INTEGRATION_CORPUS)
  console.log(JSON.stringify({ protocol: 'assistant.semantic-eval.v1', evidence: 'live_provider', ...report }, null, 2))
  if (report.records.some(r => r.status !== 'scored') || Object.values(report.metrics).some(m => m.failedOrUnscored)) process.exitCode = 1
} catch {
  console.error('LIVE_EVAL_FAILED: safe provider/configuration failure; no raw provider detail logged.')
  process.exitCode = 2
}
