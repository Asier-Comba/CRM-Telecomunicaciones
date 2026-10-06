import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {IdentifierServiceV1}from './identifiers-service-v1'
export async function createIdentifierUserServiceV1(){const p=await createProductUserPortV1();return p?new IdentifierServiceV1(p):null}
