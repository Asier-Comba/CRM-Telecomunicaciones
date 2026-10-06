import 'server-only'
import{createProductUserPortV1}from './product-user-factory-v1'
import{ServiceCommercialServiceV1}from './telecom-service-commercial-service-v1'
export async function createServiceCommercialUserServiceV1(){const p=await createProductUserPortV1();return p?new ServiceCommercialServiceV1(p):null}
