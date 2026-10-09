import { assistantLocalAllowedV2, assistantReplyV2, readAssistantEnvelopeV2, ASSISTANT_HTTP_HEADERS_V2 } from '@/assistant/application-http-v2'
import { parseConversationInputV2 } from '@/assistant/conversation-contract-v2'
import { createAssistantConversationServicesV2 } from '@/lib/server/assistant-conversations-v2'
import { createAssistantProductReadersV2 } from '@/lib/server/assistant-product-readers-v2'
import { createAiProviderV2 } from '@/lib/server/ai-provider-v2'
import { executeApplicationReadTurnV2, assistantCalendarV2 } from '@/assistant/application-turn-v2'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Local synthetic DB only. Streaming lifecycle never exposes unvalidated model
 * plan deltas. No action blocks or mutation capability is registered here. */
export async function POST(request: Request) {
  try {
  if (!assistantLocalAllowedV2()) return assistantReplyV2('unavailable', 503)
  const envelope = await readAssistantEnvelopeV2(request, process.env.PRODUCT_V1_ORIGIN)
  if (envelope instanceof Response) return envelope
  if (envelope.operation !== 'turn.read') return assistantReplyV2('validation', 400)
  const input = parseConversationInputV2('turn.start', envelope.input)
  if (!input) return assistantReplyV2('validation', 400)
  const services = await createAssistantConversationServicesV2(), readers = await createAssistantProductReadersV2()
  if (!services || !readers) return assistantReplyV2('unavailable', 503)
  if (!await services.authority()) return assistantReplyV2('access_denied', 403)
  const provider = createAiProviderV2()
  if (!provider || provider.status !== 'ready') return assistantReplyV2('not_configured', 503)
  const reserved = await services.conversations.execute('turn.start', input)
  if (!reserved.ok) return assistantReplyV2(reserved.error, reserved.error === 'conflict' ? 409 : 503)
  if (reserved.data.contract !== 'assistant.turn.v2' || reserved.data.replay) return assistantReplyV2('turn_already_started', 409)
  const controller = new AbortController()
  const signal = AbortSignal.any([request.signal, controller.signal, AbortSignal.timeout(75000)])
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(sink) {
      let writable = true
      const emit = (type: string, data: unknown) => { if (writable) try { sink.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)) } catch { writable = false; controller.abort() } }
      try {
        await executeApplicationReadTurnV2(input, {
          readers, authority: services.authority, offeredHandles: [], resolveReference: async () => null, now: () => new Date(),
        }, provider, services.conversations, signal, emit, assistantCalendarV2(new Date(), process.env.ASSISTANT_TIMEZONE || 'Europe/Madrid'))
      } catch {
        await services.conversations.execute('turn.finish', { id: input.id, turn_id: input.turn_id, status: 'failed', failure_code: 'unavailable' })
        emit('failed', { turnId: input.turn_id, error: 'unavailable' })
      } finally { provider.cancel(); if (writable) { try { sink.close() } catch {} } }
    },
    cancel() { controller.abort(); provider.cancel() },
  })
  return new Response(stream, { headers: { ...ASSISTANT_HTTP_HEADERS_V2, 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Accel-Buffering': 'no' } })
  } catch { return assistantReplyV2('unavailable', 503) }
}
