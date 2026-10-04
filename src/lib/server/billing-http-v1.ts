import { readProductEnvelopeV1,productReplyV1,PRODUCT_HTTP_STATUS_V1 } from './product-http-v1.ts'
import { isBillingOperationV1 } from './billing-runtime-v1.ts'
import { isBillingQueryV1 } from './billing-query-runtime-v1.ts'
import type { BillingServiceV1 } from './billing-service-v1'
export async function billingHttpV1(request:Request,kind:'commands'|'queries',factory:()=>Promise<BillingServiceV1|null>,expectedOrigin?:string){
 try{
  const envelope=await readProductEnvelopeV1(request,65536,expectedOrigin);if(envelope instanceof Response)return envelope
  const {operation,input}=envelope
  if(kind==='commands'?!isBillingOperationV1(operation):!isBillingQueryV1(operation))return productReplyV1({ok:false,error:'validation'},400)
  const service=await factory();if(service===null)return productReplyV1({ok:false,error:'unavailable'},503)
  const result=kind==='commands'&&isBillingOperationV1(operation)?await service.execute(operation,input):isBillingQueryV1(operation)?await service.read(operation,input):{ok:false as const,error:'validation' as const}
  return productReplyV1(result,result.ok?200:PRODUCT_HTTP_STATUS_V1[result.error])
 }catch{return productReplyV1({ok:false,error:'internal_safe'},500)}
}
