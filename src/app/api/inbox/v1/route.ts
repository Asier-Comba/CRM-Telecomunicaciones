import {inboxHttpV1}from '@/lib/server/inbox-http-v1'
import {createInboxUserServiceV1}from '@/lib/server/inbox-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return inboxHttpV1(request,createInboxUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
