import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {PortabilityServiceV1}from './portability-service-v1'
export async function createPortabilityUserServiceV1(){const p=await createProductUserPortV1();return p?new PortabilityServiceV1(p):null}
