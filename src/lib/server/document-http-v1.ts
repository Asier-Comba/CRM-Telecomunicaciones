import {readProductEnvelopeV1,productReplyV1,PRODUCT_HTTP_STATUS_V1}from './product-http-v1.ts'
import {isDocumentOperationV1}from './document-runtime-v1.ts'
import type {DocumentServiceV1}from './document-service-v1'
export async function documentHttpV1(request:Request,kind:'commands'|'queries',factory:()=>Promise<DocumentServiceV1|null>,expectedOrigin?:string){
 try{const envelope=await readProductEnvelopeV1(request,8192,expectedOrigin);if(envelope instanceof Response)return envelope
  const op=envelope.operation
  if(kind==='commands'?!isDocumentOperationV1(op):!['document.list','document.get_metadata'].includes(op))return productReplyV1({ok:false,error:'validation'},400)
  const service=await factory();if(!service)return productReplyV1({ok:false,error:'unavailable'},503)
  const r=kind==='commands'&&isDocumentOperationV1(op)?await service.execute(op,envelope.input):op==='document.list'?await service.list(envelope.input):await service.getMetadata(envelope.input)
  return productReplyV1(r,r.ok?200:PRODUCT_HTTP_STATUS_V1[r.error])
 }catch{return productReplyV1({ok:false,error:'internal_safe'},500)}
}
