import {simHttpV1}from '@/lib/server/sim-http-v1'
import {createSimUserServiceV1}from '@/lib/server/sim-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return simHttpV1(request,createSimUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
