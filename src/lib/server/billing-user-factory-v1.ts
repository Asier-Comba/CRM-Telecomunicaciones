import 'server-only'
import { createProductUserPortV1 } from './product-user-factory-v1'
import { BillingServiceV1 } from './billing-service-v1'
export async function createBillingUserServiceV1(){const port=await createProductUserPortV1();return port===null?null:new BillingServiceV1(port)}
