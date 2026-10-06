import {readProductEnvelopeV1,productReplyV1,PRODUCT_HTTP_STATUS_V1} from './product-http-v1.ts'
import {isPortfolioOperationV1} from './portfolio-runtime-v1.ts'
import type {PortfolioServiceV1} from './portfolio-service-v1'
export async function portfolioHttpV1(request:Request,kind:'commands'|'queries',factory:()=>Promise<PortfolioServiceV1|null>,expectedOrigin?:string){
 try{
  const envelope=await readProductEnvelopeV1(request,8192,expectedOrigin);if(envelope instanceof Response)return envelope
  if(kind==='commands'?!isPortfolioOperationV1(envelope.operation):envelope.operation!=='portfolio.get')return productReplyV1({ok:false,error:'validation'},400)
  const service=await factory();if(!service)return productReplyV1({ok:false,error:'unavailable'},503)
  const result=kind==='commands'&&isPortfolioOperationV1(envelope.operation)?await service.execute(envelope.operation,envelope.input):await service.get(envelope.input)
  return productReplyV1(result,result.ok?200:PRODUCT_HTTP_STATUS_V1[result.error])
 }catch{return productReplyV1({ok:false,error:'internal_safe'},500)}
}
