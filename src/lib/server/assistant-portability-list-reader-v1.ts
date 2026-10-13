import type {ProductUserPortV1} from './product-service-v1.ts'
import {PortabilityServiceV1} from './portability-service-v1.ts'
import {parseAssistantPortabilityListInputV1} from '../../assistant/portability-read-projection-v1.ts'

/** Narrow runtime seam, not just a TypeScript annotation over execute(). A
 * caller cannot dispatch get/write operations or a broad workspace inventory. */
export function createAssistantPortabilityListReaderV1(port:ProductUserPortV1){
 const service=new PortabilityServiceV1(port)
 return async(operation:unknown,raw:unknown)=>{
  if(operation!=='portability.list')return{ok:false as const,error:'validation' as const}
  const input=parseAssistantPortabilityListInputV1(raw)
  return input?service.execute('portability.list',input):{ok:false as const,error:'validation' as const}
 }
}
