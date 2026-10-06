import{readProductEnvelopeV1,productReplyV1,PRODUCT_HTTP_STATUS_V1}from './product-http-v1.ts'
import type{BillingAnalyticsServiceV1}from './billing-analytics-service-v1'
export async function billingAnalyticsHttpV1(request:Request,factory:()=>Promise<BillingAnalyticsServiceV1|null>,origin?:string){try{
 const e=await readProductEnvelopeV1(request,8192,origin);if(e instanceof Response)return e
 const s=await factory();if(!s)return productReplyV1({ok:false,error:'unavailable'},503)
 const r=await s.execute(e.operation,e.input);return productReplyV1(r,r.ok?200:PRODUCT_HTTP_STATUS_V1[r.error])
}catch{return productReplyV1({ok:false,error:'internal_safe'},500)}}
