import {readProductEnvelopeV1,productReplyV1,PRODUCT_HTTP_STATUS_V1}from './product-http-v1.ts'
import type {BillingArtifactServiceV1}from './billing-artifact-service-v1'
export async function billingArtifactHttpV1(request:Request,factory:()=>Promise<BillingArtifactServiceV1|null>,origin?:string){
 try{const e=await readProductEnvelopeV1(request,4096,origin);if(e instanceof Response)return e;if(!['invoice.persist_private_pdf','invoice.private_pdf_reference','invoice.private_pdf'].includes(e.operation))return productReplyV1({ok:false,error:'validation'},400)
 const s=await factory();if(!s)return productReplyV1({ok:false,error:'unavailable'},503)
 if(e.operation==='invoice.private_pdf'){const r=await s.download(e.input);if(!r.ok)return productReplyV1(r,PRODUCT_HTTP_STATUS_V1[r.error]);return new Response(new Uint8Array(r.bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="invoice.pdf"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}})}
 const r=e.operation==='invoice.persist_private_pdf'?await s.persist(e.input):await s.reference(e.input);return productReplyV1(r,r.ok?200:PRODUCT_HTTP_STATUS_V1[r.error])
 }catch{return productReplyV1({ok:false,error:'internal_safe'},500)}
}
