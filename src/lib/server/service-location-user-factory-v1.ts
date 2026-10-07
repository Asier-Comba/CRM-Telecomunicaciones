import 'server-only'
import{createProductUserPortV1}from './product-user-factory-v1'
import{ServiceLocationServiceV1}from './service-location-service-v1'
export async function createServiceLocationUserServiceV1(){const p=await createProductUserPortV1();return p?new ServiceLocationServiceV1(p):null}
