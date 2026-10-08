import {provenanceHttpV1}from '@/lib/server/provenance-http-v1'
import {createProvenanceUserServiceV1}from '@/lib/server/provenance-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return provenanceHttpV1(request,createProvenanceUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
