import { productHttpV1 } from '@/lib/server/product-http-v1'
import { createProductUserServicesV1 } from '@/lib/server/product-user-factory-v1'
export const runtime = 'nodejs'
export async function POST(request: Request) {
 if(process.env.PRODUCT_V1_ENABLED !== 'true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})
 return productHttpV1(request,'queries',createProductUserServicesV1)
}
