import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import {snapshotProductJsonV1}from './product-query-runtime-v1.ts'
import {exact,natural}from './notifications-runtime-v1.ts'
import {isStrictCalendarDateV1}from './telecom-runtime-v1.ts'
import {CATALOG_FIELDS_V1,CATALOG_ENTITLEMENTS_V1,CATALOG_ADDONS_V1}from './catalog-specs-v1.ts'
import type {CatalogOperationV1,CatalogInputV1}from '../contracts/catalog-v1'
export const CATALOG_RPC_V1={"operator.create": "catalog_v1_command", "operator.update": "catalog_v1_command", "operator.activate": "catalog_v1_command", "operator.deactivate": "catalog_v1_command", "plan.create": "catalog_v1_command", "plan.update_metadata": "catalog_v1_command", "plan.change_status": "catalog_v1_command", "plan_version.create": "catalog_v1_command", "plan_version.terms_get": "catalog_v1_terms_get"}as const
const kinds=['mobile','fiber','fixed_voice','data_connectivity','other']
export const money=(x:unknown):x is string=>typeof x==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(x)&&BigInt(x)<=BigInt('9223372036854775807')
const date=(x:unknown):x is string=>typeof x==='string'&&/^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(x)&&isStrictCalendarDateV1(x)
export function isCatalogOperationV1(v:unknown):v is CatalogOperationV1{return typeof v==='string'&&Object.hasOwn(CATALOG_FIELDS_V1,v)}
function component(v:unknown,position?:number){return plain(v)&&exact(v,position===undefined?'addon_code,component_kind,quantity,service_kind':'addon_code,component_kind,position,quantity,service_kind')&&(position===undefined||v.position===position)&&kinds.includes(v.service_kind as string)&&natural(v.quantity)&&(v.quantity as number)>=1&&(v.quantity as number)<=100&&(v.component_kind==='base'?v.addon_code===null:v.component_kind==='add_on'&&typeof v.addon_code==='string'&&(CATALOG_ADDONS_V1 as readonly string[]).includes(v.addon_code))}
function entitlement(v:unknown,componentCount:number,output=false){
 if(!plain(v)||!exact(v,output?'code,component_position,integer_value,boolean_value,text_value,value_kind,unit':'code,component_position,integer_value,boolean_value,text_value')||typeof v.code!=='string'||!Object.hasOwn(CATALOG_ENTITLEMENTS_V1,v.code)||(v.component_position!==null&&(!natural(v.component_position)||(v.component_position as number)<1||(v.component_position as number)>componentCount)))return false
 const rule=CATALOG_ENTITLEMENTS_V1[v.code as keyof typeof CATALOG_ENTITLEMENTS_V1]
 if(output&&(v.value_kind!==rule.kind||v.unit!==rule.unit))return false
 if(rule.kind==='integer'){
  if(typeof v.integer_value!=='string'||!/^(0|[1-9][0-9]{0,12})$/.test(v.integer_value)||BigInt(v.integer_value)>BigInt('1000000000000')||v.boolean_value!==null||v.text_value!==null)return false
  if(['commitment_months','promotion_months'].includes(v.code)&&BigInt(v.integer_value)>BigInt(60))return false
  if(['download_mbps','upload_mbps'].includes(v.code)&&(BigInt(v.integer_value)<BigInt(1)||BigInt(v.integer_value)>BigInt(1000000)))return false
 }else if(rule.kind==='boolean'){if(typeof v.boolean_value!=='boolean'||v.integer_value!==null||v.text_value!==null)return false}
 else if(typeof v.text_value!=='string'||!(rule.values as readonly string[]).includes(v.text_value)||v.integer_value!==null||v.boolean_value!==null)return false
 return true
}
function facts(components:unknown,entitlements:unknown,bundle:unknown,output=false){
 if(!Array.isArray(components)||components.length<1||components.length>8||!components.every((c,i)=>component(c,output?i+1:undefined))||components[0].component_kind!=='base'||typeof bundle!=='boolean'||!Array.isArray(entitlements)||entitlements.length>24||!entitlements.every(e=>entitlement(e,components.length,output)))return false
 const bases=components.filter(c=>c.component_kind==='base').reduce((n,c)=>n+c.quantity,0)
 if(bundle?bases<2:bases!==1)return false
 const seen=new Set<string>()
 for(const e of entitlements){const key=String(e.component_position)+':'+e.code;if(seen.has(key))return false;seen.add(key)
  if(e.boolean_value===true&&[['unlimited_data','data_mib'],['unlimited_voice','voice_minutes'],['unlimited_sms','sms_count']].some(([u,b])=>u===e.code&&entitlements.some(x=>x.component_position===e.component_position&&x.code===b)))return false
 }
 return true
}
export function parseCatalogInputV1(op:CatalogOperationV1,value:unknown):CatalogInputV1|null{try{
 const snap=snapshotProductJsonV1(value);if(!isCatalogOperationV1(op)||!plain(snap)||!exact(snap,CATALOG_FIELDS_V1[op].join(',')))return null;const v={...snap}
 for(const[k,x]of Object.entries(v)){
  if(['command_id','id','operator_id','plan_id'].includes(k)){if(!uuid(x))return null;v[k]=(x as string).toLowerCase()}
  else if(k==='expected_version'){if(!natural(x)||(x as number)<1)return null}
  else if(['valid_from','valid_until'].includes(k)){if(!(k==='valid_until'&&x===null)&&!date(x))return null}
  else if(['recurring_amount_minor','one_time_amount_minor'].includes(k)){if(!money(x))return null}
  else if(k==='is_bundle'){if(typeof x!=='boolean')return null}
  else if(!['components','entitlements'].includes(k)){
   if(typeof x!=='string'||!x.trim()||/[\x00-\x1f\x7f-\x9f]/.test(x)||[...x].length>(k==='display_name'&&op.startsWith('operator.')?160:200))return null
   if(k==='code'&&!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(x)||k==='service_kind'&&!kinds.includes(x)||k==='currency'&&!/^[A-Z]{3}$/.test(x)||k==='status'&&!['active','retired'].includes(x))return null
  }
 }
 if(op==='plan_version.create'&&(!facts(v.components,v.entitlements,v.is_bundle)||v.valid_until!==null&&(v.valid_until as string)<(v.valid_from as string)))return null
 return Object.freeze(v)
 }catch{return null}}
export function parseCatalogResultV1(op:CatalogOperationV1,i:CatalogInputV1,value:unknown){try{
 const v=snapshotProductJsonV1(value);if(!plain(v)||v.contract_version!=='catalog.v1'||v.operation!==op)return null
 if(op==='plan_version.terms_get'){
  if(!exact(v,'contract_version,operation,record')||!plain(v.record))return null
  const r=v.record;if(!exact(r,'id,plan_id,version_number,terms_status,currency,recurring_period,valid_from,valid_until,recurring_amount_minor,one_time_amount_minor,is_bundle,components,entitlements')||r.id!==i.id||!uuid(r.id)||!uuid(r.plan_id)||!natural(r.version_number)||(r.version_number as number)<1||typeof r.currency!=='string'||!/^[A-Z]{3}$/.test(r.currency)||!date(r.valid_from)||r.valid_until!==null&&(!date(r.valid_until)||r.valid_until<r.valid_from)||(r.recurring_amount_minor!==null&&!money(r.recurring_amount_minor))||(r.one_time_amount_minor!==null&&!money(r.one_time_amount_minor)))return null
  if(r.terms_status==='published'){if(r.recurring_period!=='month'||!money(r.recurring_amount_minor)||!money(r.one_time_amount_minor)||!facts(r.components,r.entitlements,r.is_bundle,true))return null}
  else if(r.terms_status!=='unrecorded'||r.recurring_period!==null||r.is_bundle!==null||r.one_time_amount_minor!==null||!Array.isArray(r.components)||r.components.length||!Array.isArray(r.entitlements)||r.entitlements.length)return null
  return v
 }
 if(!exact(v,op==='plan_version.create'?'contract_version,operation,command_id,id,version,status,plan_id,parent_version,version_number':'contract_version,operation,command_id,id,version,status')||v.command_id!==i.command_id||!uuid(v.id)||!natural(v.version))return null
 if(op==='plan_version.create')return v.version===1&&v.status==='published'&&v.plan_id===i.plan_id&&v.parent_version===(i.expected_version as number)+1&&natural(v.version_number)&&(v.version_number as number)>0?v:null
 const created=op==='operator.create'||op==='plan.create'
 if(created?v.version!==1||v.status!=='active':v.id!==i.id||v.version!==(i.expected_version as number)+1)return null
 const statuses=op.startsWith('operator.')?['active','inactive']:['active','retired'];if(!statuses.includes(v.status as string)||op==='operator.activate'&&v.status!=='active'||op==='operator.deactivate'&&v.status!=='inactive'||op==='plan.change_status'&&v.status!==i.status)return null
 return v
 }catch{return null}}
