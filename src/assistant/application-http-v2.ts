import { integratedLocalAllowed } from '../features/product/integration/mode.ts'
import { isClosedObjectV1 } from '../lib/server/product-work-runtime-v1.ts'
export const ASSISTANT_HTTP_HEADERS_V2 = Object.freeze({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
export function assistantLocalAllowedV2(env: NodeJS.ProcessEnv = process.env): boolean { return env.AI_PRODUCT_V2_ENABLED === 'true' && integratedLocalAllowed(env) }
export function assistantReplyV2(error: string, status: number): Response { return Response.json({ ok: false, error }, { status, headers: ASSISTANT_HTTP_HEADERS_V2 }) }
/** Bounded, strict same-origin envelope. Explicit loopback deployment gate is
 * separate. Slow bodies expire and hostile cancellation promises aren't awaited. */
export async function readAssistantEnvelopeV2(request: Request, origin: string | undefined): Promise<Response | { operation: string; input: unknown }> {
  if (request.method !== 'POST') return assistantReplyV2('validation', 405)
  try {
    if (!origin) return assistantReplyV2('unavailable', 503)
    const canonical = new URL(origin)
    if (canonical.origin !== origin || !['http:', 'https:'].includes(canonical.protocol) || canonical.username || canonical.password) return assistantReplyV2('unavailable', 503)
    if (request.headers.get('host') !== canonical.host || request.headers.get('origin') !== origin || request.headers.has('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin' || request.headers.has('authorization') || request.headers.has('x-workspace-id')) return assistantReplyV2('access_denied', 403)
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '') || ![null, 'identity'].includes(request.headers.get('content-encoding'))) return assistantReplyV2('validation', 415)
    const length = request.headers.get('content-length')
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > 12288)) return assistantReplyV2('validation', 413)
    if (!request.body || request.body.locked) return assistantReplyV2('validation', 400)
    const reader = request.body.getReader(), chunks: Uint8Array[] = []
    let size = 0, reads = 0, timer: ReturnType<typeof setTimeout> | undefined
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 5000); timer.unref?.() })
    try {
      while (true) {
        const chunk = await Promise.race([reader.read(), deadline])
        if (chunk.done) break
        if (++reads > 12288 || request.signal.aborted || size + chunk.value.byteLength > 12288) throw new Error('bounds')
        size += chunk.value.byteLength; chunks.push(chunk.value.slice())
      }
      const bytes = new Uint8Array(size); let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
      const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
      if (!isClosedObjectV1(value) || Object.keys(value).sort().join(',') !== 'input,operation' || typeof value.operation !== 'string' || value.operation.length > 40) return assistantReplyV2('validation', 400)
      return { operation: value.operation, input: value.input }
    } catch {
      void reader.cancel().catch(() => {})
      return assistantReplyV2('validation', 400)
    } finally { clearTimeout(timer); reader.releaseLock() }
  } catch { return assistantReplyV2('unavailable', 503) }
}
