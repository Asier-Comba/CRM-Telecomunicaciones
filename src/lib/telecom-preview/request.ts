const encoder = new TextEncoder()

/** Read at most4096 raw bytes; reject/cancel before copying an oversized chunk. */
export async function readPreviewText(request: Request): Promise<string | null> {
  const declared = request.headers.get('content-length')
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > 4096)) return null
  if (!request.body || request.body.locked) return null
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  let reads = 0
  try {
    while (true) {
      if (++reads > 8192) throw new Error('invalid_body')
      const { done, value } = await reader.read()
      if (done) break
      if (!(value instanceof Uint8Array) || size + value.byteLength > 4096) throw new Error('invalid_body')
      size += value.byteLength
      chunks.push(value.slice())
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    const body: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'text')) return null
    const text = (body as { text?: unknown }).text
    return typeof text === 'string' && text.trim() && encoder.encode(text).byteLength <= 500 ? text : null
  } catch {
    // Do not await a hostile stream's potentially unbounded cancellation promise.
    void reader.cancel().catch(() => {})
    return null
  } finally { reader.releaseLock() }
}
