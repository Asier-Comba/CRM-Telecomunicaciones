import{serviceLocationHttpV1}from '@/lib/server/service-location-http-v1'
import{createServiceLocationUserServiceV1}from '@/lib/server/service-location-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return serviceLocationHttpV1(request,createServiceLocationUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
