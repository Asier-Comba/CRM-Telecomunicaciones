import 'server-only'
import{createProductUserPortV1}from './product-user-factory-v1'
import{TelecomReadsServiceV1}from './telecom-reads-service-v1'
export async function createTelecomReadsUserServiceV1(){const p=await createProductUserPortV1();return p?new TelecomReadsServiceV1(p):null}
