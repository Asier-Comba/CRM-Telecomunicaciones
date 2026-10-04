import 'server-only'
import { createUserServerClient } from './supabase-user'
import { resolveTenantContext } from './tenant-context'
import { ProductServiceV1, type ProductUserPortV1 } from './product-service-v1'
async function createProductUserPortV1(): Promise<ProductUserPortV1 | null> {
 const client=await createUserServerClient()
 if(client===null)return null
 return {
  resolve:async()=>{const context=await resolveTenantContext();return 'error' in context?null:{workspaceId:context.workspaceId,role:context.role}},
  rpc:async(name,args)=>{const result=await client.rpc(name,args);return {data:result.data as unknown,error:result.error===null?null:{code:result.error.code}}},
 }
}
export async function createProductUserServiceV1() {
 const port=await createProductUserPortV1();return port===null?null:new ProductServiceV1(port)
}
export async function createProductUserServicesV1() {
 const port=await createProductUserPortV1();return port===null?null:{commands:new ProductServiceV1(port)}
}
