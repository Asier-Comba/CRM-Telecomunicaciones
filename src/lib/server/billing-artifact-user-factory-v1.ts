import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {createDocumentContentUserServiceV1}from './document-content-user-factory-v1'
import {BillingArtifactServiceV1}from './billing-artifact-service-v1'
export async function createBillingArtifactUserServiceV1(){const port=await createProductUserPortV1(),content=await createDocumentContentUserServiceV1();return port&&content?new BillingArtifactServiceV1(port,content):null}
