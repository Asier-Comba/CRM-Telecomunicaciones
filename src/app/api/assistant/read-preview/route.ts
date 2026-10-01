import { randomUUID } from 'node:crypto'
import { runPreviewRead } from '@/lib/telecom-preview/read-pipeline'
import { readPreviewText } from '@/lib/telecom-preview/request'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const requestId = randomUUID()
  const reply = (status: string, answer: string) => Response.json({
    contract: 'assistant.preview-read.v1', request_id: requestId,
    responses: [{ contractVersion: 1, status, answer, grounded: false, blocks: {}, meta: { requestId, partial: false } }],
  }, { headers: { 'Cache-Control': 'no-store' } })
  const allowed = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === 'true'
  if (!allowed) return reply('POLICY_BLOCK', 'La vista sintética solo está disponible en desarrollo.')
  const text = await readPreviewText(request)
  if (text === null) return reply('INVALID_INPUT', 'Escribe una consulta breve con formato válido.')
  return Response.json(await runPreviewRead(text, requestId), { headers: { 'Cache-Control': 'no-store' } })
}
