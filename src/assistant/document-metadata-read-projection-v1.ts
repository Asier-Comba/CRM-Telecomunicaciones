import {parseDocumentListInputV1,parseDocumentListV1} from '../lib/server/document-runtime-v1.ts'
import {snapshotProductJsonV1} from '../lib/server/product-query-runtime-v1.ts'
import type {DocumentListInputV1,DocumentMetadataV1} from '../lib/contracts/document-v1.ts'

export type SelectedCustomerDocumentListMetadataV1=Readonly<{customer_id:string;status:'active'|'archived';limit:number;after_id?:string}>
export type MinimizedAssistantDocumentMetadataListV1={contract_version:'assistant.document-metadata-list.v1';operation:'document.list';items:readonly Readonly<Pick<DocumentMetadataV1,'id'|'document_kind'|'status'|'media_type'|'size_bytes'>>[];next_id:string|null}
/** Only the selected customer's own metadata collection. Content permission,
 * review/indexing approval and RAG admission are separate controls. */
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
/** Canonical owned assistant-domain request. Keep this frozen around awaits;
 * only the existing reader maps it to W1's customer target representation. */
export function snapshotAssistantDocumentListRequestV1(raw:unknown):SelectedCustomerDocumentListMetadataV1|null{
 const input=parseAssistantDocumentListInputV1(raw)
 return input?Object.freeze({customer_id:input.target_id,status:input.status??'active',limit:input.limit??20,...(input.after_id?{after_id:input.after_id}:{})}):null
}
