import type { BillingServiceV1 } from './billing-service-v1'
import { readProductEnvelopeV1,productReplyV1,PRODUCT_HTTP_STATUS_V1 } from './product-http-v1.ts'
import { renderBillingPdfV1 } from './billing-pdf-v1.ts'
export async function billingPdfHttpV1(request:Request,factory:()=>Promise<BillingServiceV1|null>,expectedOrigin?:string){
 try{
  const envelope=await readProductEnvelopeV1(request,12288,expectedOrigin);if(envelope instanceof Response)return envelope
  if(envelope.operation!=='invoice.pdf')return productReplyV1({ok:false,error:'validation'},400)
  const service=await factory();if(service===null)return productReplyV1({ok:false,error:'unavailable'},503)
  const result=await service.read('invoice.get',envelope.input)
  if(!result.ok)return productReplyV1(result,PRODUCT_HTTP_STATUS_V1[result.error])
  if(result.data.operation!=='invoice.get')return productReplyV1({ok:false,error:'internal_safe'},500)
  const bytes=renderBillingPdfV1(result.data.invoice);if(bytes===null)return productReplyV1({ok:false,error:'internal_safe'},500)
  return new Response(bytes as Uint8Array<ArrayBuffer>,{headers:{'Content-Type':'application/pdf','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`attachment; filename="invoice-${result.data.invoice.id}.pdf"`}})
 }catch{return productReplyV1({ok:false,error:'internal_safe'},500)}
}
