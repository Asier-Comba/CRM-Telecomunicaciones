import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {DocumentServiceV1}from './document-service-v1'
export async function createDocumentUserServiceV1(){const port=await createProductUserPortV1();return port?new DocumentServiceV1(port):null}
