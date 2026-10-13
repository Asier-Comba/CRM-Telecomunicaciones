import type {ProductUserPortV1} from './product-service-v1.ts'
import {CaseServiceV1} from './case-service-v1.ts'
import {parseAssistantCaseListInputV1} from '../../assistant/case-read-projection-v1.ts'

/** Runtime read boundary: get/notes/commands cannot reach resolve or RPC. */
export function createAssistantCaseListReaderV1(port:ProductUserPortV1){
 const service=new CaseServiceV1(port)
 return async(operation:unknown,raw:unknown)=>{
  if(operation!=='case.list')return{ok:false as const,error:'validation' as const}
  const input=parseAssistantCaseListInputV1(raw)
  return input?service.execute('case.list',input):{ok:false as const,error:'validation' as const}
 }
}
