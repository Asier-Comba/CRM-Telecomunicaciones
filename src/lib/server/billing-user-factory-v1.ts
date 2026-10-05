import 'server-only'
import { createProductUserPortV1 } from './product-user-factory-v1'
import {BillingIssueArtifactServiceV1}from './billing-issue-artifact-service-v1'
import {createBillingArtifactUserServiceV1}from './billing-artifact-user-factory-v1'
export async function createBillingUserServiceV1(){const port=await createProductUserPortV1();return port===null?null:new BillingIssueArtifactServiceV1(port,createBillingArtifactUserServiceV1,process.env.PRODUCT_DOCUMENT_CONTENT_ENABLED==='true')}
