import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {CatalogServiceV1}from './catalog-service-v1'
export async function createCatalogUserServiceV1(){const p=await createProductUserPortV1();return p?new CatalogServiceV1(p):null}
