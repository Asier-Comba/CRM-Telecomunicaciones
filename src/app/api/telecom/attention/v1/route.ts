import{telecomAttentionHttpV1}from '@/lib/server/telecom-attention-http-v1'
import{createTelecomAttentionUserServiceV1}from '@/lib/server/telecom-attention-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return telecomAttentionHttpV1(request,createTelecomAttentionUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
