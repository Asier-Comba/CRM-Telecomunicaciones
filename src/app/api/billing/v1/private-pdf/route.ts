import {billingArtifactHttpV1}from '@/lib/server/billing-artifact-http-v1'
import {createBillingArtifactUserServiceV1}from '@/lib/server/billing-artifact-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){
 if(process.env.PRODUCT_V1_ENABLED!=='true'||process.env.PRODUCT_DOCUMENT_CONTENT_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})
 return billingArtifactHttpV1(request,createBillingArtifactUserServiceV1,process.env.PRODUCT_V1_ORIGIN)
}
