import {caseHttpV1}from '@/lib/server/case-http-v1'
import {createCaseUserServiceV1}from '@/lib/server/case-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return caseHttpV1(request,createCaseUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
