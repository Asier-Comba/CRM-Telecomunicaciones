import type { AiProvider } from './providers/ai-provider.ts'
import type { ConversationServiceV2 } from './conversation-service-v2.ts'
import type { ConversationInputV2 } from './conversation-contract-v2.ts'
import type { ProductReadDependenciesV2 } from './product-read-executor-v2.ts'
import { runProductReadTurnV2 } from './product-read-turn-v2.ts'
import { composeProductResponseV2 } from './product-response-v2.ts'
export function assistantCalendarV2(now: Date, timezone = 'Europe/Madrid') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (key: string) => parts.find(p => p.type === key)!.value
  return { date: `${get('year')}-${get('month')}-${get('day')}`, timezone }
}
/** Called only after non-replay turn reservation. Cancellation/late DB conflict
 * prevents interactive final emission. Historical persistence contains only the
 * bounded generic answer; current factual blocks remain ephemeral validated DTOs. */
export async function executeApplicationReadTurnV2(input: ConversationInputV2, deps: ProductReadDependenciesV2,
  provider: AiProvider, conversations: ConversationServiceV2, signal: AbortSignal,
  emit: (type: 'started' | 'final' | 'cancelled' | 'failed', data: unknown) => void,
  calendar = assistantCalendarV2(new Date())) {
  emit('started', { contract: 'assistant.stream.v2', turnId: input.turn_id })
  try {
    const result = await runProductReadTurnV2(input.text, String(input.turn_id), provider, deps, calendar, signal)
    if (signal.aborted) {
      await conversations.execute('turn.finish', { id: input.id, turn_id: input.turn_id, status: 'cancelled' })
      emit('cancelled', { turnId: input.turn_id }); return
    }
    const response = composeProductResponseV2(result.execution ?? { status: 'unavailable', evidence: [] }, String(input.turn_id))
    const finished = await conversations.execute('turn.finish', { id: input.id, turn_id: input.turn_id, status: 'completed', answer: response.answer })
    if (!finished.ok) { emit('failed', { turnId: input.turn_id, error: finished.error }); return }
    if (signal.aborted) { emit('cancelled', { turnId: input.turn_id }); return }
    emit('final', { contract: 'assistant.stream.v2', turnId: input.turn_id, response, telemetry: result.telemetry })
  } catch {
    await conversations.execute('turn.finish', { id: input.id, turn_id: input.turn_id, status: 'failed', failure_code: 'unavailable' })
    emit('failed', { turnId: input.turn_id, error: 'unavailable' })
  } finally { provider.cancel() }
}
