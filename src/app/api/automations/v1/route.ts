import {automationsHttpV1}from '@/lib/server/automations-http-v1'
import {createAutomationUserServiceV1}from '@/lib/server/automations-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return automationsHttpV1(request,createAutomationUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
