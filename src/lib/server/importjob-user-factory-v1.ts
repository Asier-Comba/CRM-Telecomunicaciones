import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {ImportJobServiceV1}from './importjob-service-v1'
export async function createImportJobUserServiceV1(){const p=await createProductUserPortV1();return p?new ImportJobServiceV1(p):null}
