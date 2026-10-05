import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {SensitiveServiceV1}from './sensitive-service-v1'
export async function createSensitiveUserServiceV1(){const p=await createProductUserPortV1();return p?new SensitiveServiceV1(p):null}
