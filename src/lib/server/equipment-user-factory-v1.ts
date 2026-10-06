import 'server-only'
import{createProductUserPortV1}from './product-user-factory-v1'
import{EquipmentServiceV1}from './equipment-service-v1'
export async function createEquipmentUserServiceV1(){const p=await createProductUserPortV1();return p?new EquipmentServiceV1(p):null}
