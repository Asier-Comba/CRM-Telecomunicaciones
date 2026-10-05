import {documentMaintenanceHttpV1}from '@/lib/server/document-maintenance-http-v1'
import {createDocumentMaintenanceUserServiceV1}from '@/lib/server/document-maintenance-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true'||process.env.PRODUCT_DOCUMENT_MAINTENANCE_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return documentMaintenanceHttpV1(request,createDocumentMaintenanceUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
