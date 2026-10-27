import {readProductEnvelopeV1,productReplyV1,PRODUCT_HTTP_STATUS_V1} from './product-http-v1.ts'
import type {DocumentLibraryServiceV2} from './document-library-service-v2'
export async function documentLibraryHttpV2(request:Request,factory:()=>Promise<DocumentLibraryServiceV2|null>,expectedOrigin?:string){
 try{
  const envelope=await readProductEnvelopeV1(request,8192,expectedOrigin);if(envelope instanceof Response)return envelope
  if(envelope.operation!=='document.library_list')return productReplyV1({ok:false,error:'validation'},400)
  const service=await factory();if(!service)return productReplyV1({ok:false,error:'unavailable'},503)
  const result=await service.list(envelope.input);return productReplyV1(result,result.ok?200:PRODUCT_HTTP_STATUS_V1[result.error])
 }catch{return productReplyV1({ok:false,error:'internal_safe'},500)}
}
