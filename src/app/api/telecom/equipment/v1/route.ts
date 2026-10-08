import{equipmentHttpV1}from '@/lib/server/equipment-http-v1'
import{createEquipmentUserServiceV1}from '@/lib/server/equipment-user-factory-v1'
export const runtime='nodejs'
export async function POST(request:Request){if(process.env.PRODUCT_V1_ENABLED!=='true')return Response.json({ok:false,error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});return equipmentHttpV1(request,createEquipmentUserServiceV1,process.env.PRODUCT_V1_ORIGIN)}
