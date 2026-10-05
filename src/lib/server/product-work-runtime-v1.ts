import type { ProductWorkInputsV1 } from '../contracts/product-work-v1'
import { isStrictCalendarDateV1, isStrictInstantV1 } from './telecom-runtime-v1.ts'
const TASK = ['title','due_at','priority','assigned_user_id']
const MEETING = ['title','starts_at','ends_at','timezone','all_day','channel','assigned_user_id']
const OPPORTUNITY = ['title','owner_user_id','amount_minor','currency','next_follow_up_at','expected_close_date','next_action','contract_id','service_id','plan_id']
export const WORK_RPC_V1 = Object.freeze(Object.fromEntries([
 ...['create','update','start','complete','reopen','cancel'].map(a => 'task.'+a),
 ...['create','update','reschedule','complete','cancel','no_show'].map(a => 'meeting.'+a),
 ...['create','update','change_stage','assign','win','lose','reopen','archive'].map(a => 'opportunity.'+a),
].map(op => [op,'product_v1_'+op.replace('.','_')]))) as Readonly<Record<keyof ProductWorkInputsV1,string>>
export function isWorkOperationV1(value: unknown): value is keyof ProductWorkInputsV1 { return typeof value==='string' && Object.hasOwn(WORK_RPC_V1,value) }
export function isClosedObjectV1(v: unknown): v is Record<string, unknown> {
 if(v===null || typeof v!=='object' || Array.isArray(v)) return false
 const proto=Object.getPrototypeOf(v)
 return (proto===Object.prototype || proto===null) && Reflect.ownKeys(v).every(k=>typeof k==='string' && Object.getOwnPropertyDescriptor(v,k)?.enumerable===true && !Object.getOwnPropertyDescriptor(v,k)?.get && !Object.getOwnPropertyDescriptor(v,k)?.set)
}
export function isUuidV1(v: unknown): v is string { return typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) }
function field(k: string,v: unknown): boolean {
 if(v===null) return ['customer_id','opportunity_id','assigned_user_id','owner_user_id','priority','due_at','ends_at','amount_minor','currency','next_follow_up_at','expected_close_date','next_action','contract_id','service_id','plan_id'].includes(k)
 if(k==='id'||k.endsWith('_id')) return isUuidV1(v)
 if(k==='expected_version'||k==='amount_minor') return typeof v==='number' && Number.isSafeInteger(v) && v>= (k==='expected_version'?1:0) && v<1e15
 if(k==='all_day') return typeof v==='boolean'
 if(['due_at','starts_at','ends_at','next_follow_up_at'].includes(k)) return isStrictInstantV1(v)
 if(k==='expected_close_date') return isStrictCalendarDateV1(v)
 if(k==='priority') return typeof v==='string' && ['low','normal','high'].includes(v)
 if(k==='channel') return typeof v==='string' && ['in_person','phone','video','other'].includes(v)
 if(k==='currency') return typeof v==='string' && ['EUR','USD','GBP'].includes(v)
 if(k==='close_reason_code') return typeof v==='string' && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(v)
 if(typeof v!=='string'||!v.trim()||v.length>(k==='timezone'?64:200)||/[\u0000-\u001f\u007f-\u009f]/.test(v)) return false
 if(k==='timezone') { try { new Intl.DateTimeFormat('en',{timeZone:v}); } catch { return false } }
 return true
}
export function parseWorkInputV1<O extends keyof ProductWorkInputsV1>(op:O,v:unknown):ProductWorkInputsV1[O]|null {
 try {
  if(!isWorkOperationV1(op)||!isClosedObjectV1(v))return null
  const [family,action]=op.split('.')
  const required=['command_id',...(action==='create'?['title']:['id','expected_version'])]
  const optional: string[]=[]
  if(action==='create') optional.push('customer_id')
  if(family==='task'&&['create','update'].includes(action))optional.push(...TASK)
  if(family==='meeting'&&['create','update'].includes(action))optional.push(...MEETING)
  if(['task','meeting'].includes(family)&&action==='create')optional.push('opportunity_id')
  if(family==='meeting'&&action==='create')required.push('starts_at','timezone')
  if(family==='meeting'&&action==='reschedule'){required.push('starts_at','ends_at');optional.push('timezone','all_day')}
  if(family==='opportunity'&&action==='create')required.push('customer_id','stage_id')
  if(family==='opportunity'&&['create','update'].includes(action))optional.push(...OPPORTUNITY)
  if(family==='opportunity'&&['change_stage','win','lose','reopen'].includes(action))required.push('stage_id')
  if(family==='opportunity'&&action==='assign')required.push('owner_user_id')
  if(family==='opportunity'&&action==='lose')required.push('close_reason_code')
  const allowed=new Set([...required,...optional])
  if(required.some(k=>!Object.hasOwn(v,k)||v[k]===null)||Object.keys(v).some(k=>!allowed.has(k)||!field(k,v[k]))||new TextEncoder().encode(JSON.stringify(v)).length>8192)return null
  if(action==='update'&&!optional.some(k=>Object.hasOwn(v,k)))return null
  if(v.opportunity_id&&!v.customer_id)return null
  if(v.starts_at&&v.ends_at&&Date.parse(v.ends_at as string)<=Date.parse(v.starts_at as string))return null
  if(Object.hasOwn(v,'amount_minor')!==Object.hasOwn(v,'currency') || ('amount_minor' in v && (v.amount_minor===null)!==(v.currency===null)))return null
  return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,(k==='id'||k.endsWith('_id'))&&typeof x==='string'?x.toLowerCase():x]))) as ProductWorkInputsV1[O]
 } catch{return null}
}
export function validWorkReceiptStatusV1(op: keyof ProductWorkInputsV1,status: unknown):boolean {
 const [family,action]=op.split('.')
 const target:Record<string,string>={start:'in_progress',complete:'completed',cancel:'cancelled',no_show:'no_show',win:'won',lose:'lost',archive:'cancelled',reopen:family==='task'?'pending':'open',create:family==='task'?'pending':family==='meeting'?'scheduled':'open'}
 if(target[action])return status===target[action]
 return (family==='task'?['pending','in_progress']:family==='meeting'?['scheduled']:['open']).includes(status as string)
}
