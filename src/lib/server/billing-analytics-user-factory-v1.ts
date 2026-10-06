import 'server-only'
import{createProductUserPortV1}from './product-user-factory-v1'
import{BillingAnalyticsServiceV1}from './billing-analytics-service-v1'
export async function createBillingAnalyticsUserServiceV1(){const p=await createProductUserPortV1();return p?new BillingAnalyticsServiceV1(p):null}
