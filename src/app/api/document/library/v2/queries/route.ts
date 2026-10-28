import {documentLibraryHttpV2} from '@/lib/server/document-library-http-v2'
import {createDocumentLibraryUserServiceV2} from '@/lib/server/document-library-user-factory-v2'
export const runtime='nodejs'
export async function POST(request:Request){
 if(process.env.PRODUCT_V1_ENABLED!=='true'||process.env.PRODUCT_DOCUMENT_LIBRARY_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})
 return documentLibraryHttpV2(request,createDocumentLibraryUserServiceV2,process.env.PRODUCT_V1_ORIGIN)
}
