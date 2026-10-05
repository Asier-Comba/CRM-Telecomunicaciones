import type {DocumentInputsV1,DocumentOperationV1,DocumentReceiptV1,DocumentMetadataV1,DocumentListInputV1,DocumentListV1,DocumentGetV1,DocumentGetInputV1}from '../contracts/document-v1'
import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import {snapshotProductJsonV1}from './product-query-runtime-v1.ts'
const version=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0&&v<1e15
const keys=(v:Record<string,unknown>,k:string)=>Object.keys(v).sort().join(',')===k.split(',').sort().join(',')
const targets=['customer','contract','service','line','service_case','opportunity']
export const DOCUMENT_RPC_V1={'document.archive':'document_v1_archive','document.restore':'document_v1_restore'}as const
export function isDocumentOperationV1(v:unknown):v is DocumentOperationV1{return typeof v==='string'&&Object.hasOwn(DOCUMENT_RPC_V1,v)}
export function parseDocumentInputV1<O extends DocumentOperationV1>(op:O,v:unknown):DocumentInputsV1[O]|null{
 try{if(!isDocumentOperationV1(op)||!plain(v)||!keys(v,'command_id,id,expected_version')||!uuid(v.id)||!uuid(v.command_id)||!version(v.expected_version))return null
 return Object.freeze({...v,id:v.id.toLowerCase(),command_id:v.command_id.toLowerCase()})as DocumentInputsV1[O]}catch{return null}
}
export function parseDocumentReceiptV1(op:DocumentOperationV1,input:DocumentInputsV1[DocumentOperationV1],v:unknown):DocumentReceiptV1|null{
 try{if(!plain(v)||!keys(v,'command_id,contract_version,id,operation,status,version')||v.contract_version!=='document.v1'||v.operation!==op||v.command_id!==input.command_id||v.id!==input.id||!version(v.version)||v.version!==input.expected_version+1||v.status!==(op==='document.archive'?'archived':'active'))return null
 return Object.freeze({...v})as DocumentReceiptV1}catch{return null}
}
export function parseDocumentGetInputV1(v:unknown):DocumentGetInputV1|null{try{return plain(v)&&keys(v,'id')&&uuid(v.id)?Object.freeze({id:v.id.toLowerCase()}):null}catch{return null}}
export function parseDocumentListInputV1(v:unknown):DocumentListInputV1|null{
 try{if(!plain(v)||Object.keys(v).some(k=>!['target_kind','target_id','status','limit','after_id'].includes(k))||!targets.includes(v.target_kind as string)||!uuid(v.target_id)||'after_id'in v&&!uuid(v.after_id)||'status'in v&&!['active','archived'].includes(v.status as string)||'limit'in v&&(!Number.isInteger(v.limit)||(v.limit as number)<1||(v.limit as number)>100))return null
 return Object.freeze({...v,target_id:v.target_id.toLowerCase(),...('after_id'in v?{after_id:(v.after_id as string).toLowerCase()}:{})})as DocumentListInputV1}catch{return null}
}
function metadata(v:unknown):v is DocumentMetadataV1{
 if(!plain(v)||!keys(v,'id,version,status,document_kind,media_type,size_bytes,target')||!uuid(v.id)||!version(v.version)||!['active','archived'].includes(v.status as string)||!['general','identity','contract','service','incident','billing','other'].includes(v.document_kind as string)||!plain(v.target)||!keys(v.target,'kind,id')||!targets.includes(v.target.kind as string)||!uuid(v.target.id))return false
 return(v.media_type===null||typeof v.media_type==='string'&&/^[a-z0-9][a-z0-9!#$&^_.+-]{0,62}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,62}$/.test(v.media_type))&&(v.size_bytes===null||typeof v.size_bytes==='number'&&Number.isSafeInteger(v.size_bytes)&&v.size_bytes>=0&&v.size_bytes<=1073741824)
}
export function parseDocumentGetV1(id:string,value:unknown):DocumentGetV1|null{
 try{const v=snapshotProductJsonV1(value);return plain(v)&&keys(v,'contract_version,operation,record')&&v.contract_version==='document.v1'&&v.operation==='document.get_metadata'&&metadata(v.record)&&v.record.id===id?v as DocumentGetV1:null}catch{return null}
}
export function parseDocumentListV1(input:DocumentListInputV1,value:unknown):DocumentListV1|null{
 try{const v=snapshotProductJsonV1(value);if(!plain(v)||!keys(v,'contract_version,operation,items,next_id')||v.contract_version!=='document.v1'||v.operation!=='document.list'||!Array.isArray(v.items)||v.items.length>(input.limit??20))return null
 let last=input.after_id??''
 for(const r of v.items){if(!metadata(r)||r.id<=last||r.target.kind!==input.target_kind||r.target.id!==input.target_id||r.status!==(input.status??'active'))return null;last=r.id}
 if(v.next_id!==null&&(v.next_id!==last||v.items.length!==(input.limit??20)))return null
 return v as DocumentListV1}catch{return null}
}
