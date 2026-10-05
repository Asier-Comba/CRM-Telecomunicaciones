import {importJobHttpV1}from '@/lib/server/importjob-http-v1'
import {createImportJobUserServiceV1}from '@/lib/server/importjob-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return importJobHttpV1(request,createImportJobUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
