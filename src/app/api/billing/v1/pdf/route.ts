import { billingPdfHttpV1 } from '@/lib/server/billing-pdf-http-v1'
import { createBillingUserServiceV1 } from '@/lib/server/billing-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){
 if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})
 return billingPdfHttpV1(request,createBillingUserServiceV1,process.env.PRODUCT_V1_ORIGIN)
}
