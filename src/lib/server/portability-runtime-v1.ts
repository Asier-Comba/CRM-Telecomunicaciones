import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import {snapshotProductJsonV1}from './product-query-runtime-v1.ts'
import {exact,natural,instant}from './notifications-runtime-v1.ts'
import {isStrictCalendarDateV1}from './telecom-runtime-v1.ts'
import {PORTABILITY_FIELDS_V1,PORTABILITY_LIST_FILTERS_V1,PORTABILITY_REASONS_V1}from './portability-specs-v1.ts'
import type {PortabilityOperationV1,PortabilityInputsV1}from '../contracts/portability-v1'
export const PORTABILITY_RPC_V1={'portability.create':'portability_v1_command','portability.update_draft':'portability_v1_command','portability.assign':'portability_v1_command','portability.transition':'portability_v1_command','portability.complete':'portability_v1_command','portability.list':'portability_v1_query','portability.get':'portability_v1_query'}as const
const states=['draft','requested','scheduled','in_progress','completed','rejected','cancelled'],sources=['manual','import','integration']
const date=(v:unknown):v is string=>isStrictCalendarDateV1(v)&&v>='1900-01-01'&&v<='2199-12-31'
export function isPortabilityOperationV1(v:unknown):v is PortabilityOperationV1{return typeof v==='string'&&Object.hasOwn(PORTABILITY_FIELDS_V1,v)}
export function parsePortabilityInputV1(op:PortabilityOperationV1,value:unknown):PortabilityInputsV1[PortabilityOperationV1]|null{try{
 const snap=snapshotProductJsonV1(value);if(!isPortabilityOperationV1(op)||!plain(snap))return null;const v={...snap},required:readonly string[]=PORTABILITY_FIELDS_V1[op],allowed:readonly string[]=op==='portability.list'?PORTABILITY_LIST_FILTERS_V1:required
 if(required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!allowed.includes(k)))return null
 for(const[k,x]of Object.entries(v)){
  if(x===null&&((k==='owner_user_id'&&op!=='portability.list')||['reason_code','expected_line_version'].includes(k)))continue
  if(k==='id'||k.endsWith('_id')){if(!uuid(x))return null;v[k]=(x as string).toLowerCase()}
  else if(['limit','expected_version','expected_line_version'].includes(k)){if(!natural(x)||(x as number)<1||(x as number)>=1e15||k==='limit'&&(x as number)>100)return null}
  else if(['requested_on','effective_on','completed_on','window_from','window_to'].includes(k)){if(!date(x))return null}
  else if(k==='direction'?!['inbound','outbound'].includes(x as string):k==='status'?!states.includes(x as string):k==='source'?!sources.includes(x as string):k==='reason_code'?!(PORTABILITY_REASONS_V1 as readonly unknown[]).includes(x):k==='evidence_source'?x!=='manual':k==='provider_outcome'?x!=='confirmed_completed':k==='line_action'?!['none','activate','end'].includes(x as string):true)return null
 }
 if(op==='portability.create'||op==='portability.update_draft'){if(v.donor_operator_id===v.target_operator_id)return null}
 if(op==='portability.transition'){
  if(!['requested','scheduled','in_progress','rejected','cancelled'].includes(v.status as string)||(['rejected','cancelled'].includes(v.status as string)!==(v.reason_code!==null)))return null
  if(v.status==='cancelled'&&!['customer_withdrew','duplicate_request'].includes(v.reason_code as string)||v.status==='rejected'&&['customer_withdrew','duplicate_request'].includes(v.reason_code as string))return null
 }
 if(op==='portability.complete'&&((v.line_action==='none')!==(v.expected_line_version===null)))return null
 if((v.window_from===undefined)!==(v.window_to===undefined)||v.window_from!==undefined&&(v.window_from as string)>(v.window_to as string)||v.window_from!==undefined&&Date.parse(v.window_to as string)-Date.parse(v.window_from as string)>366*86400000)return null
 return Object.freeze(v)as PortabilityInputsV1[PortabilityOperationV1]
 }catch{return null}}
function row(value:unknown){
 if(!plain(value)||!exact(value,'id,version,customer_id,contract_id,service_id,line_id,number_identifier_id,masked_display,direction,donor_operator_id,target_operator_id,requested_on,submitted_on,scheduled_on,started_on,completed_on,closed_on,status,reason_code,owner_user_id,source,created_at,updated_at'))return false
 const r=value
 if(['id','customer_id','contract_id','service_id','line_id','number_identifier_id','donor_operator_id','target_operator_id'].some(k=>!uuid(r[k]))||r.owner_user_id!==null&&!uuid(r.owner_user_id)||!natural(r.version)||(r.version as number)<1||!['inbound','outbound'].includes(r.direction as string)||!states.includes(r.status as string)||!sources.includes(r.source as string)||typeof r.masked_display!=='string'||!/^••••[0-9]{3}$/.test(r.masked_display)||r.donor_operator_id===r.target_operator_id||!date(r.requested_on)||!instant(r.created_at)||!instant(r.updated_at))return false
 const dates=['submitted_on','scheduled_on','started_on','completed_on','closed_on'];let prior=r.requested_on
 for(const k of dates){if(r[k]!==null){if(!date(r[k])||(r[k] as string)<prior)return false;prior=r[k]as string}}
 if(r.reason_code!==null&&!(PORTABILITY_REASONS_V1 as readonly unknown[]).includes(r.reason_code))return false
 if(['draft','requested','scheduled','in_progress','completed'].includes(r.status as string)&&r.reason_code!==null)return false
 if(r.status==='draft'&&dates.some(k=>r[k]!==null))return false
 if(r.status==='requested'&&(r.submitted_on===null||dates.slice(1).some(k=>r[k]!==null)))return false
 if(r.status==='scheduled'&&(r.submitted_on===null||r.scheduled_on===null||dates.slice(2).some(k=>r[k]!==null)))return false
 if(r.status==='in_progress'&&(dates.slice(0,3).some(k=>r[k]===null)||r.completed_on!==null||r.closed_on!==null))return false
 if(r.status==='completed'&&(r.submitted_on===null||r.scheduled_on===null||r.completed_on===null||r.closed_on!==null))return false
 if(['rejected','cancelled'].includes(r.status as string)&&(r.completed_on!==null||r.closed_on===null||r.reason_code===null))return false
 if(r.status==='cancelled'&&!['customer_withdrew','duplicate_request'].includes(r.reason_code as string)||r.status==='rejected'&&['customer_withdrew','duplicate_request'].includes(r.reason_code as string))return false
 return true
}
export function parsePortabilityResultV1(op:PortabilityOperationV1,input:PortabilityInputsV1[PortabilityOperationV1],value:unknown){try{
 const v=snapshotProductJsonV1(value),i=input as Readonly<Record<string,unknown>>;if(!plain(v)||v.contract_version!=='portability.v1'||v.operation!==op)return null
 if(op==='portability.get')return exact(v,'contract_version,operation,record')&&row(v.record)&&(v.record as Record<string,unknown>).id===i.id?v:null
 if(op==='portability.list'){
  if(!exact(v,'contract_version,operation,items,next_id')||!Array.isArray(v.items)||v.items.length>((i.limit as number)??50))return null;let last=(i.after_id as string)??''
  for(const r of v.items){if(!row(r)||r.id<=last)return null;last=r.id;for(const k of ['customer_id','contract_id','service_id','line_id','owner_user_id','status','source','direction'])if(i[k]!==undefined&&r[k]!==i[k])return null
   if(i.operator_id!==undefined&&r.donor_operator_id!==i.operator_id&&r.target_operator_id!==i.operator_id||i.window_from!==undefined&&(r.requested_on<(i.window_from as string)||r.requested_on>(i.window_to as string)))return null}
  return v.next_id===null||uuid(v.next_id)&&v.items.length===((i.limit as number)??50)&&v.next_id===last?v:null
 }
 if(!exact(v,'contract_version,operation,command_id,id,version,status,source,line_effect')||v.command_id!==i.command_id||!uuid(v.id)||!sources.includes(v.source as string)||!states.includes(v.status as string)||(op==='portability.create'?v.version!==1||v.status!=='draft':v.id!==i.id||v.version!==(i.expected_version as number)+1))return null
 if(op==='portability.update_draft'&&v.status!=='draft'||op==='portability.assign'&&!['draft','requested','scheduled','in_progress'].includes(v.status as string)||op==='portability.transition'&&v.status!==i.status||op==='portability.complete'&&v.status!=='completed')return null
 if(op!=='portability.complete'||i.line_action==='none')return v.line_effect===null?v:null
 return plain(v.line_effect)&&exact(v.line_effect,'line_id,version,status')&&uuid(v.line_effect.line_id)&&v.line_effect.version===(i.expected_line_version as number)+1&&v.line_effect.status===(i.line_action==='activate'?'active':'ended')?v:null
 }catch{return null}}
