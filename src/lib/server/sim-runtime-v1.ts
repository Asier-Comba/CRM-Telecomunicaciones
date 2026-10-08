import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import {snapshotProductJsonV1}from './product-query-runtime-v1.ts'
import {exact,natural,instant}from './notifications-runtime-v1.ts'
import {SIM_FIELDS_V1,SIM_LIST_FILTERS_V1}from './sim-specs-v1.ts'
import type {SimOperationV1,SimInputsV1}from '../contracts/sim-v1'
export const SIM_RPC_V1={'sim.create':'sim_v1_command','sim.assign':'sim_v1_command','sim.activate':'sim_v1_command','sim.replace':'sim_v1_command','sim.deactivate':'sim_v1_command','sim.cancel':'sim_v1_command','sim.list':'sim_v1_query','sim.get':'sim_v1_query','sim.history':'sim_v1_query'}as const
const states=['prepared','assigned','active','replaced','inactive','cancelled'],sources=['manual','import','integration'],label=(v:unknown)=>typeof v==='string'&&v.trim().length>0&&[...v].length<=200&&!/[\x00-\x1f\x7f-\x9f]/.test(v),mask=(v:unknown)=>typeof v==='string'&&/^••••[0-9]{3}$/.test(v)
export function isSimOperationV1(v:unknown):v is SimOperationV1{return typeof v==='string'&&Object.hasOwn(SIM_RPC_V1,v)}
export function parseSimInputV1(op:SimOperationV1,value:unknown):SimInputsV1[SimOperationV1]|null{try{
 const snap=snapshotProductJsonV1(value);if(!isSimOperationV1(op)||!plain(snap))return null;const v={...snap},req:readonly string[]=SIM_FIELDS_V1[op],opt:readonly string[]=op==='sim.list'?SIM_LIST_FILTERS_V1:op==='sim.history'?['limit','after_id']:[]
 if(req.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>![...req,...opt].includes(k)))return null
 for(const[k,x]of Object.entries(v)){
  if(k==='id'||k.endsWith('_id')){if(!uuid(x))return null;v[k]=(x as string).toLowerCase()}
  else if(['expected_version','expected_line_version','expected_replacement_version','limit'].includes(k)){if(!natural(x)||(x as number)<1||k==='limit'&&(x as number)>100)return null}
  else if(k==='display_label'?!label(x):k==='kind'?!['physical','esim'].includes(x as string):k==='status'?!states.includes(x as string):k==='source'?!sources.includes(x as string):k==='evidence_source'?x!=='manual':k==='replacement_status'?!['assigned','active'].includes(x as string):k==='provider_confirmation'?!['confirmed_active','not_recorded'].includes(x as string):true)return null
 }
 if(op==='sim.activate'&&v.provider_confirmation!=='confirmed_active'||op==='sim.replace'&&((v.replacement_status==='active')!==(v.provider_confirmation==='confirmed_active')||v.id===v.replacement_sim_id))return null
 return Object.freeze(v)as SimInputsV1[SimOperationV1]
 }catch{return null}}
function row(r:unknown){
 if(!plain(r)||!exact(r,'id,version,customer_id,operator_id,kind,display_label,status,source,masked_iccid,masked_eid,assigned_line_id,activated_at,replaced_at,deactivated_at,cancelled_at,created_at,updated_at')||!uuid(r.id)||!natural(r.version)||(r.version as number)<1||!uuid(r.customer_id)||!uuid(r.operator_id)||!['physical','esim'].includes(r.kind as string)||!label(r.display_label)||!states.includes(r.status as string)||!sources.includes(r.source as string)||r.masked_iccid!==null&&!mask(r.masked_iccid)||r.masked_eid!==null&&(!mask(r.masked_eid)||r.kind!=='esim')||r.assigned_line_id!==null&&!uuid(r.assigned_line_id)||!instant(r.created_at)||!instant(r.updated_at))return false
 for(const k of ['activated_at','replaced_at','deactivated_at','cancelled_at'])if(r[k]!==null&&(!instant(r[k])||Date.parse(r[k]as string)<Date.parse(r.created_at as string)))return false
 if(['assigned','active'].includes(r.status as string)?r.assigned_line_id===null||r.masked_iccid===null:r.assigned_line_id!==null)return false
 if(['prepared','assigned'].includes(r.status as string)&&r.activated_at!==null||r.status==='active'&&r.activated_at===null||r.status==='replaced'&&r.replaced_at===null||r.status==='inactive'&&r.deactivated_at===null||r.status==='cancelled'&&r.cancelled_at===null)return false
 for(const[k,status]of [['replaced_at','replaced'],['deactivated_at','inactive'],['cancelled_at','cancelled']])if(r[k]!==null&&r.status!==status)return false
 return true
}
function association(r:unknown,line:unknown){
 if(!plain(r)||!exact(r,'id,sim_id,line_id,kind,masked_iccid,masked_eid,status,assigned_at,activated_at,ended_at,replacement_sim_id')||!uuid(r.id)||!uuid(r.sim_id)||r.line_id!==line||!['physical','esim'].includes(r.kind as string)||!mask(r.masked_iccid)||r.masked_eid!==null&&(!mask(r.masked_eid)||r.kind!=='esim')||!['assigned','active','replaced','inactive'].includes(r.status as string)||!instant(r.assigned_at)||r.activated_at!==null&&(!instant(r.activated_at)||Date.parse(r.activated_at as string)<Date.parse(r.assigned_at as string))||r.ended_at!==null&&(!instant(r.ended_at)||Date.parse(r.ended_at as string)<Math.max(Date.parse(r.assigned_at as string),r.activated_at===null?0:Date.parse(r.activated_at as string))))return false
 return r.status==='replaced'?r.ended_at!==null&&uuid(r.replacement_sim_id)&&r.replacement_sim_id!==r.sim_id:r.replacement_sim_id===null&&(r.status==='inactive'?r.ended_at!==null:r.ended_at===null&&(r.status==='active'?r.activated_at!==null:r.activated_at===null))
}
export function parseSimResultV1(op:SimOperationV1,input:SimInputsV1[SimOperationV1],value:unknown){try{
 const v=snapshotProductJsonV1(value),i=input as Readonly<Record<string,unknown>>;if(!plain(v)||v.contract_version!=='sim.v1'||v.operation!==op)return null
 if(op==='sim.get')return exact(v,'contract_version,operation,record')&&row(v.record)&&(v.record as Record<string,unknown>).id===i.id?v:null
 if(op==='sim.list'||op==='sim.history'){
  const history=op==='sim.history';if(!exact(v,history?'contract_version,operation,line_id,items,next_id':'contract_version,operation,items,next_id')||history&&v.line_id!==i.line_id||!Array.isArray(v.items)||v.items.length>((i.limit as number)??50))return null;let last=(i.after_id as string)??''
  for(const r of v.items){if(!(history?association(r,i.line_id):row(r))||r.id<=last)return null;last=r.id;if(!history){for(const k of ['customer_id','operator_id','kind','status','source'])if(i[k]!==undefined&&r[k]!==i[k])return null;if(i.line_id!==undefined&&r.assigned_line_id!==i.line_id)return null}}
  return v.next_id===null||uuid(v.next_id)&&v.next_id===last&&v.items.length===((i.limit as number)??50)?v:null
 }
 if(!exact(v,'contract_version,operation,command_id,id,version,status,source,association_id,replacement_id,replacement_version,replacement_status,replacement_association_id')||v.command_id!==i.command_id||!uuid(v.id)||v.source!=='manual'||(op==='sim.create'?v.version!==1:v.id!==i.id||v.version!==(i.expected_version as number)+1))return null
 const target=op==='sim.create'?'prepared':op==='sim.assign'?'assigned':op==='sim.activate'?'active':op==='sim.replace'?'replaced':op==='sim.deactivate'?'inactive':'cancelled';if(v.status!==target||(op==='sim.create'||op==='sim.cancel'?v.association_id!==null:!uuid(v.association_id)))return null
 if(op==='sim.replace')return v.replacement_id===i.replacement_sim_id&&v.replacement_version===(i.expected_replacement_version as number)+1&&v.replacement_status===i.replacement_status&&uuid(v.replacement_association_id)?v:null
 return [v.replacement_id,v.replacement_version,v.replacement_status,v.replacement_association_id].every(x=>x===null)?v:null
 }catch{return null}}
