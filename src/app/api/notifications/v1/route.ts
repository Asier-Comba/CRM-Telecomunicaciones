import {notificationsHttpV1}from '@/lib/server/notifications-http-v1'
import {createNotificationUserServiceV1}from '@/lib/server/notifications-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return notificationsHttpV1(request,createNotificationUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
