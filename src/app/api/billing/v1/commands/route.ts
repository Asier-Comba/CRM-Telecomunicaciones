import { billingHttpV1 } from '@/lib/server/billing-http-v1'
import { createBillingUserServiceV1 } from '@/lib/server/billing-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){
 if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})
 return billingHttpV1(request,'commands',createBillingUserServiceV1)
}
