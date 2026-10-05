import {documentHttpV1} from '@/lib/server/document-http-v1'
import {createDocumentUserServiceV1} from '@/lib/server/document-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){
 if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})
 return documentHttpV1(request,'queries',createDocumentUserServiceV1,process.env.PRODUCT_V1_ORIGIN)
}
