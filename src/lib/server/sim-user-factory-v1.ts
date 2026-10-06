import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {SimServiceV1}from './sim-service-v1'
export async function createSimUserServiceV1(){const p=await createProductUserPortV1();return p?new SimServiceV1(p):null}
