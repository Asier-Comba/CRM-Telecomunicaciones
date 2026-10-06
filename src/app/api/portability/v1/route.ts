import {portabilityHttpV1}from '@/lib/server/portability-http-v1'
import {createPortabilityUserServiceV1}from '@/lib/server/portability-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return portabilityHttpV1(request,createPortabilityUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
