import {EXTERNAL_IDENTITY_KINDS_V1,EXTERNAL_IDENTITY_PROVIDERS_V1} from '../contracts/external-identity-v1.ts'
import type {ExternalIdentityInputsV1,ExternalIdentityOperationV1,ExternalIdentityReceiptV1,ExternalIdentityReadV1} from '../contracts/external-identity-v1'
import {snapshotProductJsonV1} from './product-query-runtime-v1.ts'
import {isClosedObjectV1 as plain,isUuidV1 as uuid} from './product-work-runtime-v1.ts'
import {instant} from './notifications-runtime-v1.ts'
const required={
 'external_identity.integration_register':['command_id','integration_key','provider_code','display_name','source'],
 'external_identity.bind':['command_id','integration_id','external_kind','external_id','local_entity_kind','local_entity_id'],
 'external_identity.retire':['command_id','id','expected_version'],
 'external_identity.list':['local_entity_kind','local_entity_id'],
 'external_identity.integration_list':[],
} as const
const token=(v:unknown):v is string=>typeof v==='string'&&/^[a-z][a-z0-9._-]{0,63}$/.test(v)
const external=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v)
const natural=(v:unknown,max=999999999999999):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=1&&v<=max
const exact=(v:Record<string,unknown>,keys:readonly string[])=>Object.keys(v).sort().join(',')===[...keys].sort().join(',')
const source=(v:unknown)=>v==='import'||v==='integration'
export function isExternalIdentityOperationV1(v:unknown):v is ExternalIdentityOperationV1{return typeof v==='string'&&Object.hasOwn(required,v)}
export function parseExternalIdentityInputV1<O extends ExternalIdentityOperationV1>(op:O,value:unknown):ExternalIdentityInputsV1[O]|null{try{
 if(!isExternalIdentityOperationV1(op))return null
 const snap=snapshotProductJsonV1(value);if(!plain(snap))return null
 const v={...snap},req:readonly string[]=required[op],opt=op==='external_identity.list'?['integration_id','status','limit','after_id']:op==='external_identity.integration_list'?['limit','after_id']:[]
 if(!plain(v)||req.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>![...req,...opt].includes(k))||JSON.stringify(v).length>4096)return null
 for(const[k,x]of Object.entries(v)){
  if(k==='id'||k.endsWith('_id')){if(k==='external_id'){if(!external(x))return null}else{if(!uuid(x))return null;v[k]=x.toLowerCase()}}
  else if(['integration_key','external_kind'].includes(k)){if(!token(x))return null}
  else if(k==='local_entity_kind'){if(!(EXTERNAL_IDENTITY_KINDS_V1 as readonly unknown[]).includes(x))return null}
  else if(k==='provider_code'){if(!(EXTERNAL_IDENTITY_PROVIDERS_V1 as readonly unknown[]).includes(x))return null}
  else if(k==='source'){if(!source(x))return null}
  else if(k==='status'){if(!['active','retired'].includes(x as string))return null}
  else if(k==='display_name'){if(typeof x!=='string'||!x.trim()||[...x].length>160||/[\u0000-\u001f\u007f-\u009f]/.test(x))return null}
  else if(!natural(x,k==='limit'?100:999999999999999))return null
 }
 return Object.freeze(v) as ExternalIdentityInputsV1[O]
}catch{return null}}
export function parseExternalIdentityReceiptV1(op:ExternalIdentityOperationV1,input:ExternalIdentityInputsV1[ExternalIdentityOperationV1],value:unknown):ExternalIdentityReceiptV1|null{try{
 const v=snapshotProductJsonV1(value),i=input as unknown as Record<string,unknown>
 if(!plain(v)||!exact(v,['contract_version','operation','command_id','id','version','status','external_effect'])||v.contract_version!=='external_identity.v1'||v.operation!==op||v.command_id!==i.command_id||!uuid(v.id)||!natural(v.version)||v.external_effect!=='disabled')return null
 if(op==='external_identity.retire'){if(v.id!==i.id||v.version!==(i.expected_version as number)+1||v.status!=='retired')return null}
 else if(!['external_identity.integration_register','external_identity.bind'].includes(op)||v.status!=='active'||op==='external_identity.integration_register'&&v.version!==1)return null
 return v as ExternalIdentityReceiptV1
}catch{return null}}
export function parseExternalIdentityReadV1(op:ExternalIdentityOperationV1,input:ExternalIdentityInputsV1[ExternalIdentityOperationV1],value:unknown):ExternalIdentityReadV1|null{try{
 const v=snapshotProductJsonV1(value),i=input as unknown as Record<string,unknown>,limit=(i.limit as number)??20
 if(!['external_identity.list','external_identity.integration_list'].includes(op)||!plain(v)||!exact(v,['contract_version','operation','items','next_id'])||v.contract_version!=='external_identity.v1'||v.operation!==op||!Array.isArray(v.items)||v.items.length>limit)return null
 let previous=(i.after_id as string)??''
 for(const r of v.items){
  if(!plain(r)||!uuid(r.id)||r.id<=previous||!source(r.source)||!natural(r.version)||!instant(r.created_at))return null
  if(op==='external_identity.integration_list'){
   if(!exact(r,['id','integration_key','provider_code','display_name','source','status','version','created_at','external_effect'])||!token(r.integration_key)||!(EXTERNAL_IDENTITY_PROVIDERS_V1 as readonly unknown[]).includes(r.provider_code)||typeof r.display_name!=='string'||!r.display_name.trim()||[...r.display_name].length>160||/[\u0000-\u001f\u007f-\u009f]/.test(r.display_name)||r.status!=='active'||r.version!==1||r.external_effect!=='disabled')return null
  }else{
   if(!exact(r,['id','integration_id','external_kind','external_id','local_entity_kind','local_entity_id','source','status','version','created_at','updated_at','retired_at'])||!uuid(r.integration_id)||!token(r.external_kind)||!external(r.external_id)||r.local_entity_kind!==i.local_entity_kind||r.local_entity_id!==i.local_entity_id||i.integration_id!==undefined&&r.integration_id!==i.integration_id||i.status!==undefined&&r.status!==i.status||!['active','retired'].includes(r.status as string)||!instant(r.updated_at)||Date.parse(r.updated_at as string)<Date.parse(r.created_at as string)||(r.status==='retired'? !instant(r.retired_at)||Date.parse(r.retired_at as string)<Date.parse(r.created_at as string):r.retired_at!==null))return null
  }
  previous=r.id
 }
 if(v.next_id!==null&&(!uuid(v.next_id)||v.items.length!==limit||v.next_id!==previous))return null
 return v as ExternalIdentityReadV1
}catch{return null}}
