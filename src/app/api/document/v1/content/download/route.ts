import {documentContentHttpV1}from '@/lib/server/document-content-http-v1'
import {createDocumentContentUserServiceV1}from '@/lib/server/document-content-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){
 if(process.env.PRODUCT_V1_ENABLED!=='true'||process.env.PRODUCT_DOCUMENT_CONTENT_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})
 return documentContentHttpV1(request,'download',createDocumentContentUserServiceV1,process.env.PRODUCT_V1_ORIGIN)
}
