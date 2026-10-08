import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {SettingsServiceV1}from './settings-service-v1'
export async function createSettingsUserServiceV1(){const p=await createProductUserPortV1();return p?new SettingsServiceV1(p,process.env.PRODUCT_DOCUMENT_CONTENT_ENABLED==='true'):null}
