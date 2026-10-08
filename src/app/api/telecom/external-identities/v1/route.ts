import {externalIdentityHttpV1} from '@/lib/server/external-identity-http-v1'
import {createExternalIdentityUserServiceV1} from '@/lib/server/external-identity-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return externalIdentityHttpV1(request,createExternalIdentityUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
