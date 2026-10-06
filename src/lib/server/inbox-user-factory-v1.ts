import 'server-only'
import {createProductUserPortV1}from './product-user-factory-v1'
import {InboxServiceV1}from './inbox-service-v1'
export async function createInboxUserServiceV1(){const p=await createProductUserPortV1();return p?new InboxServiceV1(p):null}
