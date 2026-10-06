import {catalogHttpV1}from '@/lib/server/catalog-http-v1'
import {createCatalogUserServiceV1}from '@/lib/server/catalog-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return catalogHttpV1(request,createCatalogUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
