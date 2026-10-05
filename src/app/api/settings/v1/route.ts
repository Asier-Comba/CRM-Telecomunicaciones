import {settingsHttpV1}from '@/lib/server/settings-http-v1'
import {createSettingsUserServiceV1}from '@/lib/server/settings-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return settingsHttpV1(request,createSettingsUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
