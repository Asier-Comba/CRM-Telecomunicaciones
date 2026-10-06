import 'server-only'
import {createProductUserPortV1} from './product-user-factory-v1'
import {ExternalIdentityServiceV1} from './external-identity-service-v1'
export async function createExternalIdentityUserServiceV1(){const port=await createProductUserPortV1();return port?new ExternalIdentityServiceV1(port):null}
