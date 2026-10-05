import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import type {DocumentContentInputsV1,DocumentContentOperationV1,DocumentContentReceiptV1,DocumentContentManifestV1}from '../contracts/document-content-v1'
export const DOCUMENT_CONTENT_RPC_V1={'document.request_upload':'document_content_v1_request_upload','document.finalize_upload':'document_content_v1_finalize_upload','document.request_download':'document_content_v1_request_download'}as const
const keys=(v:Record<string,unknown>,s:string)=>Object.keys(v).sort().join(',')===s.split(',').sort().join(',')
const version=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0&&v<1e15
const mime=(v:unknown)=>['application/pdf','image/png','image/jpeg'].includes(v as string)
const size=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0&&v<=10485760
const time=(v:unknown)=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v))
export function isDocumentContentOperationV1(v:unknown):v is DocumentContentOperationV1{return typeof v==='string'&&Object.hasOwn(DOCUMENT_CONTENT_RPC_V1,v)}
export function parseDocumentContentInputV1<O extends DocumentContentOperationV1>(op:O,v:unknown):DocumentContentInputsV1[O]|null{
 try{if(!isDocumentContentOperationV1(op)||!plain(v)||!uuid(v.command_id))return null
 if(op==='document.request_upload'){
  if(!keys(v,'command_id,target_kind,target_id,document_kind,media_type,size_bytes,file_name')||!uuid(v.target_id)||!['customer','contract','service','line','service_case','opportunity'].includes(v.target_kind as string)||!['general','identity','contract','service','incident','billing','other'].includes(v.document_kind as string)||!mime(v.media_type)||!size(v.size_bytes)||typeof v.file_name!=='string'||v.file_name.trim()!==v.file_name||v.file_name.length<1||v.file_name.length>255||/[\\/\x00-\x1f\x7f]/.test(v.file_name))return null
 }else if(!keys(v,'command_id,id,expected_version')||!uuid(v.id)||!version(v.expected_version))return null
 return Object.freeze({...v,command_id:v.command_id.toLowerCase(),...('id'in v?{id:(v.id as string).toLowerCase()}:{target_id:(v.target_id as string).toLowerCase()})})as DocumentContentInputsV1[O]
 }catch{return null}
}
export function parseDocumentContentReceiptV1(op:DocumentContentOperationV1,input:DocumentContentInputsV1[DocumentContentOperationV1],v:unknown):DocumentContentReceiptV1|null{
 try{if(!plain(v)||!keys(v,'command_id,contract_version,id,operation,status,version'+(op==='document.finalize_upload'?'':',expires_at')+(op==='document.request_download'?',ticket_id':''))||v.contract_version!=='document.content.v1'||v.operation!==op||v.command_id!==input.command_id||!uuid(v.id)||!version(v.version)||v.status!==(op==='document.request_upload'?'pending':'active'))return null
 if(op==='document.request_upload'?v.version!==1:v.id!==('id'in input?input.id:null)||v.version!==('expected_version'in input?input.expected_version:0)+(op==='document.finalize_upload'?1:0))return null
 if(op!=='document.finalize_upload'&&!time(v.expires_at)||op==='document.request_download'&&!uuid(v.ticket_id))return null
 return Object.freeze({...v})as DocumentContentReceiptV1}catch{return null}
}
export function parseDocumentContentManifestV1(id:string,v:unknown):DocumentContentManifestV1|null{
 try{return plain(v)&&keys(v,'id,object_ref,media_type,size_bytes,expires_at')&&v.id===id&&uuid(v.object_ref)&&mime(v.media_type)&&size(v.size_bytes)&&time(v.expires_at)?Object.freeze({...v})as DocumentContentManifestV1:null}catch{return null}
}
