import{serviceCommercialHttpV1}from '@/lib/server/telecom-service-commercial-http-v1'
import{createServiceCommercialUserServiceV1}from '@/lib/server/telecom-service-commercial-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return serviceCommercialHttpV1(request,createServiceCommercialUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
