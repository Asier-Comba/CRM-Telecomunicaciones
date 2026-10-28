import type {DocumentLibraryInputV2,DocumentLibraryEntryV2,DocumentLibraryPageV2} from '../contracts/document-library-v2'
import {isClosedObjectV1 as plain,isUuidV1 as uuid} from './product-work-runtime-v1.ts'
import {snapshotProductJsonV1} from './product-query-runtime-v1.ts'

const kinds=['customer','contract','service','line','service_case','opportunity'],categories=['general','identity','contract','service','incident','billing','other']
const keys=(value:Record<string,unknown>,expected:string)=>Object.keys(value).sort().join(',')===expected.split(',').sort().join(',')
const instant=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v
const documentInstant=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(v)&&Number.isFinite(Date.parse(v))
const text=(v:unknown,max:number)=>typeof v==='string'&&v.length>0&&[...v].length<=max&&!/[\u0000-\u001f\u007f]/.test(v)
const opaque=(v:unknown)=>typeof v==='string'&&v.length>=32&&v.length<=4096&&/^[A-Za-z0-9_-]+$/.test(v)
const arrayExact=(v:unknown,expected:string[])=>Array.isArray(v)&&JSON.stringify(v)===JSON.stringify(expected)
export function parseDocumentLibraryInputV2(value:unknown):DocumentLibraryInputV2|null{
 try{
  const v=snapshotProductJsonV1(value)
  if(!plain(v)||Object.keys(v).some(k=>!['status','query','customer_id','target','document_kind','format','created_from','created_before','sort','limit','cursor'].includes(k)))return null
  if('status'in v&&!['active','archived'].includes(v.status as string)||'sort'in v&&!['created_asc','created_desc'].includes(v.sort as string)||'limit'in v&&(!Number.isInteger(v.limit)||(v.limit as number)<1||(v.limit as number)>100))return null
  if('query'in v&&(!text(v.query,100)||[...(v.query as string).trim()].length<2)||'customer_id'in v&&!uuid(v.customer_id)||'document_kind'in v&&!categories.includes(v.document_kind as string)||'format'in v&&!['pdf','image'].includes(v.format as string))return null
  if('created_from'in v&&!instant(v.created_from)||'created_before'in v&&!instant(v.created_before)||'created_from'in v&&'created_before'in v&&(v.created_from as string)>=(v.created_before as string)||'cursor'in v&&!opaque(v.cursor))return null
  if('target'in v&&(!plain(v.target)||!keys(v.target,'kind,id')||!kinds.includes(v.target.kind as string)||!uuid(v.target.id)))return null
  return Object.freeze({...v,status:v.status??'active',sort:v.sort??'created_desc',limit:v.limit??20,...('query'in v?{query:(v.query as string).trim()}:{}),...('customer_id'in v?{customer_id:(v.customer_id as string).toLowerCase()}:{}),...('target'in v?{target:{kind:(v.target as {kind:string}).kind,id:((v.target as {id:string}).id).toLowerCase()}}:{})})as DocumentLibraryInputV2
 }catch{return null}
}
function entry(v:unknown):v is DocumentLibraryEntryV2{
 if(!plain(v)||!keys(v,'id,version,status,document_kind,display_title,title_state,media_type,size_bytes,created_at,context')||!uuid(v.id)||!Number.isSafeInteger(v.version)||(v.version as number)<1||(v.version as number)>=1e15||!['active','archived'].includes(v.status as string)||!categories.includes(v.document_kind as string)||!documentInstant(v.created_at))return false
 if(!['available','restricted','not_provided'].includes(v.title_state as string)||(v.title_state==='available'?!text(v.display_title,180):v.display_title!==null))return false
 if(v.media_type!==null&&(typeof v.media_type!=='string'||!/^[a-z0-9][a-z0-9!#$&^_.+-]{0,62}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,62}$/.test(v.media_type))||v.size_bytes!==null&&(!Number.isSafeInteger(v.size_bytes)||(v.size_bytes as number)<0||(v.size_bytes as number)>1073741824))return false
 if(!plain(v.context)||!keys(v.context,'target,customer')||!plain(v.context.target)||!keys(v.context.target,'kind,id,label')||!kinds.includes(v.context.target.kind as string)||!uuid(v.context.target.id)||!text(v.context.target.label,180))return false
 return v.context.customer===null||plain(v.context.customer)&&keys(v.context.customer,'id,label')&&uuid(v.context.customer.id)&&text(v.context.customer.label,200)
}
export function parseDocumentLibraryPageV2(input:DocumentLibraryInputV2,value:unknown):DocumentLibraryPageV2|null{
 try{
  const v=snapshotProductJsonV1(value)
  if(!plain(v)||!keys(v,'contract_version,operation,items,next_cursor,completeness,total_count,count_state,capabilities')||v.contract_version!=='document.library.v2'||v.operation!=='document.library_list'||!Array.isArray(v.items)||v.items.length>(input.limit??20)||v.next_cursor!==null&&!opaque(v.next_cursor)||!['complete','partial'].includes(v.completeness as string))return null
  if(v.count_state==='exact'?(!Number.isSafeInteger(v.total_count)||(v.total_count as number)<v.items.length||v.completeness!=='complete'):v.count_state!=='unavailable'||v.total_count!==null)return null
  if(v.next_cursor!==null&&v.items.length!==(input.limit??20))return null
  const seen=new Set<string>();let previous:DocumentLibraryEntryV2|null=null
  for(const r of v.items){
   if(!entry(r)||seen.has(r.id)||r.status!==(input.status??'active')||input.target&&(r.context.target.kind!==input.target.kind||r.context.target.id!==input.target.id)||input.customer_id&&r.context.customer?.id!==input.customer_id||input.document_kind&&r.document_kind!==input.document_kind||input.format==='pdf'&&r.media_type!=='application/pdf'||input.format==='image'&&!['image/png','image/jpeg'].includes(r.media_type??''))return null
   if(input.created_from&&Date.parse(r.created_at)<Date.parse(input.created_from)||input.created_before&&Date.parse(r.created_at)>=Date.parse(input.created_before))return null
   if(previous){const a=previous.created_at+previous.id,b=r.created_at+r.id;if(input.sort==='created_asc'?a>=b:a<=b)return null}
   seen.add(r.id);previous=r
  }
  const c=v.capabilities
  if(!plain(c)||!keys(c,'search_fields,sort_fields,private_content,folders,file_name,consistency')||!arrayExact(c.search_fields,['title','reference','customer_label','category'])||!arrayExact(c.sort_fields,['created_asc','created_desc'])||c.private_content!==false||c.folders!==false||c.file_name!==false||c.consistency!=='live_reauthorized_creation_cutoff')return null
  return v as DocumentLibraryPageV2
 }catch{return null}
}
