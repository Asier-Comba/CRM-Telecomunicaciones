import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import {snapshotProductJsonV1}from './product-query-runtime-v1.ts'
import {exact,natural,instant}from './notifications-runtime-v1.ts'
import type {IdentifierOperationV1,IdentifierInputV1,IdentifierRowV1}from '../contracts/identifiers-v1'
export const IDENTIFIER_RPC_V1={'identifier.create_manual':'identifier_v1_command','identifier.retire':'identifier_v1_command','identifier.list':'identifier_v1_query','identifier.get':'identifier_v1_query'}as const
export const IDENTIFIER_OPERATIONS_V1=['identifier.create_manual','identifier.retire','identifier.list','identifier.get']as const
export function isIdentifierOperationV1(v:unknown):v is IdentifierOperationV1{return typeof v==='string'&&(IDENTIFIER_OPERATIONS_V1 as readonly string[]).includes(v)}
export function parseIdentifierInputV1(op:IdentifierOperationV1,value:unknown):IdentifierInputV1|null{try{
 const snap=snapshotProductJsonV1(value);if(!isIdentifierOperationV1(op)||!plain(snap))return null;const v={...snap}
 const required=op==='identifier.create_manual'?['command_id','entity_kind','entity_id','identifier_kind','canonical_value']:op==='identifier.retire'?['command_id','id','expected_version']:op==='identifier.get'?['id']:['entity_kind','entity_id']
 if(required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!required.includes(k)&&!(op==='identifier.list'&&['limit','after_id','status'].includes(k))))return null
 for(const[k,x]of Object.entries(v)){
 if(['command_id','id','entity_id','after_id'].includes(k)){if(!uuid(x))return null;v[k]=(x as string).toLowerCase()}
 else if(k==='entity_kind'){if(!['line','service','contract','sim'].includes(x as string))return null}
 else if(k==='identifier_kind'){if(!['msisdn','circuit_reference','provider_account_reference','provider_contract_reference','iccid','eid'].includes(x as string))return null}
 else if(k==='expected_version'){if(!natural(x)||(x as number)<1)return null}
 else if(k==='limit'){if(!natural(x)||(x as number)<1||(x as number)>100)return null}
 else if(k==='status'){if(!['active','retired'].includes(x as string))return null}
 }
 if(op==='identifier.create_manual'){
 const valid=v.entity_kind==='sim'?typeof v.canonical_value==='string'&&(v.identifier_kind==='iccid'?/^89[0-9]{16,20}$/.test(v.canonical_value):v.identifier_kind==='eid'&&/^[0-9]{32}$/.test(v.canonical_value)):v.entity_kind==='line'?v.identifier_kind==='msisdn'&&typeof v.canonical_value==='string'&&/^\+[1-9][0-9]{7,14}$/.test(v.canonical_value):v.entity_kind==='service'?v.identifier_kind==='circuit_reference':v.entity_kind==='contract'&&['provider_account_reference','provider_contract_reference'].includes(v.identifier_kind as string)
 if(!valid||typeof v.canonical_value!=='string'||(!['line','sim'].includes(v.entity_kind as string)&&!/^[A-Za-z0-9][A-Za-z0-9._/-]{7,95}$/.test(v.canonical_value)))return null
 }
 return Object.freeze(v)as IdentifierInputV1
 }catch{return null}}
function row(v:unknown):v is IdentifierRowV1{return plain(v)&&exact(v,'id,entity_kind,entity_id,identifier_kind,masked_display,status,source,valid_from,valid_until,version')&&uuid(v.id)&&uuid(v.entity_id)&&['line','service','contract','sim'].includes(v.entity_kind as string)&&['msisdn','circuit_reference','provider_account_reference','provider_contract_reference','iccid','eid'].includes(v.identifier_kind as string)&&typeof v.masked_display==='string'&&/^••••[A-Za-z0-9._/-]{3}$/.test(v.masked_display)&&['active','retired'].includes(v.status as string)&&['manual','import','integration'].includes(v.source as string)&&instant(v.valid_from)&&(v.valid_until===null?v.status==='active':v.status==='retired'&&instant(v.valid_until)&&Date.parse(v.valid_until as string)>=Date.parse(v.valid_from as string))&&natural(v.version)&&(v.version as number)>0}
export function parseIdentifierResultV1(op:IdentifierOperationV1,i:IdentifierInputV1,value:unknown){try{
 const v=snapshotProductJsonV1(value);if(!plain(v)||v.contract_version!=='identifiers.v1'||v.operation!==op)return null
 if(op==='identifier.create_manual'||op==='identifier.retire')return exact(v,'contract_version,operation,command_id,id,version,status')&&v.command_id===i.command_id&&uuid(v.id)&&(op==='identifier.create_manual'?v.version===1&&v.status==='active':v.id===i.id&&v.version===i.expected_version!+1&&v.status==='retired')?v:null
 if(op==='identifier.get')return exact(v,'contract_version,operation,record')&&row(v.record)&&v.record.id===i.id?v:null
 if(!exact(v,'contract_version,operation,items,next_id')||!Array.isArray(v.items)||v.items.length>(i.limit??50))return null
 let last=i.after_id??'';for(const x of v.items){if(!row(x)||x.id<=last||x.entity_kind!==i.entity_kind||x.entity_id!==i.entity_id||(i.status&&x.status!==i.status))return null;last=x.id}
 if(v.next_id!==null&&(v.items.length!==(i.limit??50)||v.next_id!==last))return null
 return v
 }catch{return null}}
