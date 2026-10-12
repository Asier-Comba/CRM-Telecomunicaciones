import {parseDocumentListInputV1,parseDocumentListV1} from '../lib/server/document-runtime-v1.ts'
import {snapshotProductJsonV1} from '../lib/server/product-query-runtime-v1.ts'
import type {DocumentListInputV1} from '../lib/contracts/document-v1.ts'

/** Preparation for an assistant reader, not a registered capability or RAG
 * admission. Only the selected customer's own metadata collection is in scope. */
export function parseAssistantDocumentListInputV1(raw:unknown):DocumentListInputV1|null{
 try{
  const v=snapshotProductJsonV1(raw)
  if(!v||typeof v!=='object'||Array.isArray(v)||!Object.hasOwn(v,'customer_id')
   ||Object.keys(v).some(key=>!['customer_id','status','limit','after_id'].includes(key)))return null
  const {customer_id,...filters}=v as Record<string,unknown>
  const input=parseDocumentListInputV1({target_kind:'customer',target_id:customer_id,...filters})
  return input&&(input.limit??20)<=20?Object.freeze({...input,limit:input.limit??20}):null
 }catch{return null}
}
export function projectAuthorizedDocumentMetadataListV1(rawInput:unknown,raw:unknown):Record<string,unknown>|null{
 try{
  const input=parseAssistantDocumentListInputV1(rawInput);if(!input)return null
  // Validate the complete current W1 DTO, selected target, state and keyset
  // before dropping target/version and exposing any bounded metadata facts.
  const data=parseDocumentListV1(input,raw);if(!data)return null
  return snapshotProductJsonV1({contract_version:'assistant.document-metadata-list.v1',operation:'document.list',
   items:data.items.map(row=>({id:row.id,document_kind:row.document_kind,status:row.status,media_type:row.media_type,size_bytes:row.size_bytes})),next_id:data.next_id}) as Record<string,unknown>
 }catch{return null}
}
