import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import {snapshotProductJsonV1}from './product-query-runtime-v1.ts'
import {exact,natural,instant}from './notifications-runtime-v1.ts'
import {isStrictCalendarDateV1}from './telecom-runtime-v1.ts'
import {CASE_FIELDS_V1,CASE_LIST_FILTERS_V1}from './case-specs-v1.ts'
import type {CaseOperationV1,CaseInputsV1}from '../contracts/case-v1'
export const CASE_RPC_V1={'case.create':'case_v1_command','case.update':'case_v1_command','case.assign':'case_v1_command','case.change_status':'case_v1_command','case.resolve':'case_v1_command','case.reopen':'case_v1_command','case.close':'case_v1_command','case.cancel':'case_v1_command','case.note_create':'case_v1_command','case.list':'case_v1_query','case.get':'case_v1_query','case.note_list':'case_v1_query'}as const
const types=['activation','portability','technical','billing','renewal','cancellation','documentation','other'],states=['open','in_progress','waiting_customer','waiting_operator','resolved','closed','cancelled'],active=states.slice(0,4),priorities=['low','normal','high','urgent'],sources=['manual','import','integration','system'],resolutions=['issue_fixed','request_fulfilled','customer_confirmed','no_action_required'],cancellations=['customer_withdrew','duplicate','no_longer_needed','entered_in_error']
const date=(x:unknown):x is string=>isStrictCalendarDateV1(x)&&x>='1900-01-01'&&x<='2199-12-31'
const title=(x:unknown)=>typeof x==='string'&&x.trim().length>0&&[...x].length<=200&&!/[\x00-\x1f\x7f-\x9f]/.test(x)
const body=(x:unknown)=>typeof x==='string'&&x.trim().length>0&&[...x].length<=4000&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(x)
export function isCaseOperationV1(v:unknown):v is CaseOperationV1{return typeof v==='string'&&Object.hasOwn(CASE_RPC_V1,v)}
export function parseCaseInputV1(op:CaseOperationV1,value:unknown):CaseInputsV1[CaseOperationV1]|null{try{
 const snap=snapshotProductJsonV1(value);if(!isCaseOperationV1(op)||!plain(snap))return null;const v={...snap},req:readonly string[]=CASE_FIELDS_V1[op],opt:readonly string[]=op==='case.list'?CASE_LIST_FILTERS_V1:op==='case.note_list'?['limit','after_seq']:[]
 if(req.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>![...req,...opt].includes(k)))return null
 for(const[k,x]of Object.entries(v)){
  if(x===null&&op!=='case.list'&&['contract_id','service_id','line_id','assigned_user_id','due_on'].includes(k))continue
  if(k==='id'||k.endsWith('_id')){if(!uuid(x))return null;v[k]=(x as string).toLowerCase()}
  else if(['expected_version','limit','after_seq'].includes(k)){if(!natural(x)||(k!=='after_seq'&&(x as number)<1)||k==='limit'&&(x as number)>100||k==='after_seq'&&(x as number)>1000000)return null}
  else if(['due_on','due_from','due_to'].includes(k)){if(!date(x))return null}
  else if(k==='overdue'){if(typeof x!=='boolean')return null}
  else if(k==='title'?!title(x):k==='body'?!body(x):k==='case_type'?!types.includes(x as string):k==='priority'?!priorities.includes(x as string):k==='status'?!states.includes(x as string):k==='source'?!sources.includes(x as string):k==='resolution_code'?!resolutions.includes(x as string):k==='cancellation_code'?!cancellations.includes(x as string):true)return null
 }
 if(op==='case.create'&&(v.service_id!==null&&v.contract_id===null||v.line_id!==null&&v.service_id===null)||op==='case.change_status'&&!active.includes(v.status as string))return null
 if((v.due_from===undefined)!==(v.due_to===undefined)||v.due_from!==undefined&&((v.due_to as string)<(v.due_from as string)||Date.parse(v.due_to as string)-Date.parse(v.due_from as string)>366*86400000))return null
 return Object.freeze(v)as CaseInputsV1[CaseOperationV1]
 }catch{return null}}
function record(r:unknown){
 if(!plain(r)||!exact(r,'id,version,customer_id,contract_id,service_id,line_id,case_type,title,priority,due_on,assigned_user_id,status,source,resolved_at,closed_at,resolution_code,cancellation_code,internal_note_count,created_at,updated_at,overdue')||!uuid(r.id)||!uuid(r.customer_id)||!natural(r.version)||(r.version as number)<1||['contract_id','service_id','line_id','assigned_user_id'].some(k=>r[k]!==null&&!uuid(r[k]))||r.service_id!==null&&r.contract_id===null||r.line_id!==null&&r.service_id===null||!types.includes(r.case_type as string)||!title(r.title)||!priorities.includes(r.priority as string)||r.due_on!==null&&!date(r.due_on)||!states.includes(r.status as string)||!sources.includes(r.source as string)||!natural(r.internal_note_count)||(r.internal_note_count as number)>1000000||!instant(r.created_at)||!instant(r.updated_at)||typeof r.overdue!=='boolean'||r.resolution_code!==null&&!resolutions.includes(r.resolution_code as string)||r.cancellation_code!==null&&!cancellations.includes(r.cancellation_code as string))return false
 if(r.overdue&&(r.due_on===null||!active.includes(r.status as string)))return false
 if(r.resolved_at!==null&&(!instant(r.resolved_at)||Date.parse(r.resolved_at as string)<Date.parse(r.created_at as string))||r.closed_at!==null&&(!instant(r.closed_at)||Date.parse(r.closed_at as string)<Date.parse(r.created_at as string)||r.resolved_at!==null&&Date.parse(r.closed_at as string)<Date.parse(r.resolved_at as string)))return false
 if(active.includes(r.status as string)&&(r.resolved_at!==null||r.closed_at!==null)||r.status==='resolved'&&(r.resolved_at===null||r.closed_at!==null)||['closed','cancelled'].includes(r.status as string)&&r.closed_at===null)return false
 return true
}
export function parseCaseResultV1(op:CaseOperationV1,input:CaseInputsV1[CaseOperationV1],value:unknown){try{
 const v=snapshotProductJsonV1(value),i=input as Readonly<Record<string,unknown>>;if(!plain(v)||v.contract_version!=='case.v1'||v.operation!==op)return null
 if(op==='case.get')return exact(v,'contract_version,operation,record')&&record(v.record)&&(v.record as Record<string,unknown>).id===i.id?v:null
 if(op==='case.note_list'){
  if(!exact(v,'contract_version,operation,case_id,items,next_seq')||v.case_id!==i.id||!Array.isArray(v.items)||v.items.length>((i.limit as number)??50))return null;let seq=(i.after_seq as number)??0;const ids=new Set()
  for(const n of v.items){if(!plain(n)||!exact(n,'id,seq,body,actor_user_id,created_at')||!uuid(n.id)||ids.has(n.id)||!natural(n.seq)||(n.seq as number)<=seq||(n.seq as number)>1000000||!body(n.body)||!uuid(n.actor_user_id)||!instant(n.created_at))return null;ids.add(n.id);seq=n.seq as number}
  return v.next_seq===null||v.next_seq===seq&&v.items.length===((i.limit as number)??50)?v:null
 }
 if(op==='case.list'){
  if(!exact(v,'contract_version,operation,items,next_id')||!Array.isArray(v.items)||v.items.length>((i.limit as number)??50))return null;let last=(i.after_id as string)??''
  for(const r of v.items){if(!record(r)||r.id<=last)return null;last=r.id;for(const k of ['customer_id','contract_id','service_id','line_id','assigned_user_id','case_type','priority','status','source','overdue'])if(i[k]!==undefined&&r[k]!==i[k])return null
   if(i.due_from!==undefined&&(r.due_on===null||r.due_on<(i.due_from as string)||r.due_on>(i.due_to as string)))return null}
  return v.next_id===null||uuid(v.next_id)&&v.next_id===last&&v.items.length===((i.limit as number)??50)?v:null
 }
 if(!exact(v,'contract_version,operation,command_id,id,version,status,source,resolution_code,cancellation_code,note_id,note_seq')||v.command_id!==i.command_id||!uuid(v.id)||!states.includes(v.status as string)||!sources.includes(v.source as string)||(op==='case.create'?v.version!==1||v.status!=='open':v.id!==i.id||v.version!==(i.expected_version as number)+1)||v.resolution_code!==null&&!resolutions.includes(v.resolution_code as string)||v.cancellation_code!==null&&!cancellations.includes(v.cancellation_code as string))return null
 const target=op==='case.resolve'?'resolved':op==='case.reopen'?'open':op==='case.close'?'closed':op==='case.cancel'?'cancelled':op==='case.change_status'?i.status:null
 if(target!==null&&v.status!==target||op==='case.resolve'&&v.resolution_code!==i.resolution_code||op==='case.cancel'&&v.cancellation_code!==i.cancellation_code)return null
 if(op==='case.note_create')return uuid(v.note_id)&&natural(v.note_seq)&&(v.note_seq as number)>0&&(v.note_seq as number)<=1000000?v:null
 return v.note_id===null&&v.note_seq===null?v:null
 }catch{return null}}
