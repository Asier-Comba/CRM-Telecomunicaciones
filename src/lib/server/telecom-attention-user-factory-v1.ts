import 'server-only'
import{createProductUserPortV1}from './product-user-factory-v1'
import{TelecomAttentionServiceV1}from './telecom-attention-service-v1'
export async function createTelecomAttentionUserServiceV1(){const p=await createProductUserPortV1();return p?new TelecomAttentionServiceV1(p):null}
