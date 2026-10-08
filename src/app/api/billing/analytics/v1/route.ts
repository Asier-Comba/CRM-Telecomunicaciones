import{billingAnalyticsHttpV1}from '@/lib/server/billing-analytics-http-v1'
import{createBillingAnalyticsUserServiceV1}from '@/lib/server/billing-analytics-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return billingAnalyticsHttpV1(request,createBillingAnalyticsUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
