import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {CaseServiceV1}from './case-service-v1'
export async function createCaseUserServiceV1(){const p=await createProductUserPortV1();return p?new CaseServiceV1(p):null}
