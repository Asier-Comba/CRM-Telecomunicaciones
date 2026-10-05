import {sensitiveHttpV1}from '@/lib/server/sensitive-http-v1'
import {createSensitiveUserServiceV1}from '@/lib/server/sensitive-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return sensitiveHttpV1(request,createSensitiveUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
