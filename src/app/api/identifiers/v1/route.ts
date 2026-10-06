import {identifiersHttpV1}from '@/lib/server/identifiers-http-v1'
import {createIdentifierUserServiceV1}from '@/lib/server/identifiers-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return identifiersHttpV1(request,createIdentifierUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
