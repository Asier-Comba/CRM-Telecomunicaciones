import { randomUUID } from 'node:crypto'
import { runPreviewRead } from '@/lib/telecom-preview/read-pipeline'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const requestId = randomUUID()
  const reply = (status: string, answer: string) => Response.json({
    contract: 'assistant.preview-read.v1', request_id: requestId,
    responses: [{ contractVersion: 1, status, answer, grounded: false, blocks: {}, meta: { requestId, partial: false } }],
  }, { headers: { 'Cache-Control': 'no-store' } })
  const allowed = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === 'true'
  if (!allowed) return reply('POLICY_BLOCK', 'La vista sintética solo está disponible en desarrollo.')
  if (Number(request.headers.get('content-length')) > 4096) return reply('INVALID_INPUT', 'Escribe una consulta breve.')
  let body: unknown
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw) > 4096) return reply('INVALID_INPUT', 'Escribe una consulta breve.')
    body = JSON.parse(raw)
  } catch { return reply('INVALID_INPUT', 'La consulta no tiene un formato válido.') }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'text')) return reply('INVALID_INPUT', 'La consulta no tiene un formato válido.')
  const text = (body as { text?: unknown }).text
  if (typeof text !== 'string' || !text.trim() || Buffer.byteLength(text) > 500) return reply('INVALID_INPUT', 'Escribe una consulta breve.')
  return Response.json(await runPreviewRead(text, requestId), { headers: { 'Cache-Control': 'no-store' } })
}
