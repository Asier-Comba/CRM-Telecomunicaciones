import { assistantLocalAllowedV2, assistantReplyV2, readAssistantEnvelopeV2, ASSISTANT_HTTP_HEADERS_V2 } from '@/assistant/application-http-v2'
import { createAssistantConversationServicesV2 } from '@/lib/server/assistant-conversations-v2'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** User-owned history only. Turn start/finish are internal orchestration calls. */
export async function POST(request: Request) {
  try {
  if (!assistantLocalAllowedV2()) return assistantReplyV2('unavailable', 503)
  const envelope = await readAssistantEnvelopeV2(request, process.env.PRODUCT_V1_ORIGIN)
  if (envelope instanceof Response) return envelope
  if (!['thread.list', 'thread.create', 'thread.get', 'thread.rename', 'thread.archive', 'message.page', 'turn.cancel'].includes(envelope.operation)) return assistantReplyV2('validation', 400)
  const service = await createAssistantConversationServicesV2()
  if (!service) return assistantReplyV2('unavailable', 503)
  if (envelope.operation === 'turn.cancel') {
    const input = envelope.input
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).sort().join(',') !== 'id,turn_id') return assistantReplyV2('validation', 400)
    const result = await service.conversations.execute('turn.finish', { ...input, status: 'cancelled' })
    const statuses = { validation: 400, access_denied: 403, access_changed: 409, conflict: 409, unavailable: 503 }
    return Response.json(result, { status: result.ok ? 200 : statuses[result.error], headers: ASSISTANT_HTTP_HEADERS_V2 })
  }
  const result = await service.conversations.execute(envelope.operation, envelope.input)
  const statuses = { validation: 400, access_denied: 403, access_changed: 409, conflict: 409, unavailable: 503 }
  return Response.json(result, { status: result.ok ? 200 : statuses[result.error], headers: ASSISTANT_HTTP_HEADERS_V2 })
  } catch { return assistantReplyV2('unavailable', 503) }
}
