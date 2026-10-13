import type {ProductUserPortV1} from './product-service-v1.ts'
import {DocumentServiceV1} from './document-service-v1.ts'
import {parseAssistantDocumentListInputV1} from '../../assistant/document-metadata-read-projection-v1.ts'

/** Literal metadata list only. Current W1 owner/admin membership remains the
 * authority; no upload, ticket, download, content or indexing permission. */
export function createAssistantDocumentListReaderV1(port:ProductUserPortV1){
 const service=new DocumentServiceV1(port)
 return async(operation:unknown,raw:unknown)=>{
  if(operation!=='document.list')return{ok:false as const,error:'validation' as const}
  const input=parseAssistantDocumentListInputV1(raw)
  return input?service.list(input):{ok:false as const,error:'validation' as const}
 }
}
