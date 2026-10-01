import { validateAssistantResponse, type AssistantResponse } from '../../assistant/ui-contract.ts'
import { containsHighConfidenceSecret } from '../../assistant/schema.ts'

export type PreviewReply = { contract: 'assistant.preview-read.v1'; request_id: string; responses: AssistantResponse[] }
const maxBytes = 256 * 1024

/** Minimal transport wrapper; W3 remains the single UI response contract. */
export function parsePreviewReply(value: unknown): PreviewReply | null {
  try {
    // W3's descriptor scanner rejects accessors/cycles/exotic objects safely.
    if (containsHighConfidenceSecret(value)) return null
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return null
    const descriptors = Object.getOwnPropertyDescriptors(value)
    if (Object.keys(descriptors).sort().join(',') !== 'contract,request_id,responses' || Object.values(descriptors).some(d => !('value' in d))) return null
    const body = value as Record<string, unknown>
    if (body.contract !== 'assistant.preview-read.v1' || typeof body.request_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id)) return null
    if (!Array.isArray(body.responses) || body.responses.length < 1 || body.responses.length > 16) return null
    // This function accepts parsed JSON transport values, never class instances.
    if (JSON.stringify(body).length > maxBytes) return null
    const responses = body.responses.map(response => validateAssistantResponse(response))
    if (responses.some(response => !response || response.meta.requestId !== body.request_id || response.blocks.confirmation !== undefined)) return null
    if (responses.some(response => Object.values(response!.blocks).some(block => !block))) return null
    return { contract: 'assistant.preview-read.v1', request_id: body.request_id, responses: responses as AssistantResponse[] }
  } catch { return null }
}

/** Bound network transport before JSON parsing, then reuse W3's deep validator. */
export async function readPreviewReply(response: Response): Promise<PreviewReply | null> {
  if (!response.ok || !response.body || response.body.locked) return null
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (size + value.byteLength > maxBytes) throw new Error('invalid_reply')
      size += value.byteLength
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    return parsePreviewReply(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
  } catch { void reader.cancel().catch(() => {}); return null }
  finally { reader.releaseLock() }
}
