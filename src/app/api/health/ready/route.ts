import {productReadinessV1} from '@/lib/server/product-readiness-v1'
export const dynamic = 'force-dynamic'
export async function GET() {
  // Readiness never returns endpoints, keys, tenants, errors or provider bodies.
  const ready = await productReadinessV1(process.env)
  return Response.json({status: ready ? 'ready' : 'not_ready'}, {status: ready ? 200 : 503, headers: {'Cache-Control': 'no-store'}})
}
