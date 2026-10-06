import type { CalendarInputV1,CalendarPageV1,StageCatalogV1,WorkGetV1 } from '../contracts/product-queries-v1'
import { isStrictCalendarDateV1,isStrictInstantV1 } from './telecom-runtime-v1.ts'
import { isClosedObjectV1,isUuidV1,isWorkOperationV1 } from './product-work-runtime-v1.ts'
export function snapshotProductJsonV1(value:unknown):unknown {
 const seen=new WeakSet<object>();let nodes=0,chars=0
 function copy(v:unknown,depth:number):unknown {
  if(++nodes>3000||depth>8)throw Error('bounds')
  if(v===null||typeof v==='boolean')return v
  if(typeof v==='number'&&Number.isFinite(v))return v
  if(typeof v==='string'){chars+=v.length;if(v.length>4096||chars>262144)throw Error('bounds');return v}
  if(typeof v!=='object'||seen.has(v))throw Error('json')
  seen.add(v)
  let result:unknown
  if(Array.isArray(v)){
   if(Object.getPrototypeOf(v)!==Array.prototype||v.length>100||Reflect.ownKeys(v).length!==v.length+1)throw Error('array')
   const values=[]
   for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!d.enumerable||d.get||d.set)throw Error('descriptor');values.push(copy(d.value,depth+1))}
   result=Object.freeze(values)
  }else{
   if(!isClosedObjectV1(v))throw Error('object')
   result=Object.freeze(Object.fromEntries(Object.keys(v).map(k=>[k,copy(Object.getOwnPropertyDescriptor(v,k)?.value,depth+1)])))
  }
  seen.delete(v);return result
 }
 return copy(value,0)
}
const kinds=['task','meeting','renewal','permanence']
const statuses:Record<string,string[]>={task:['pending','in_progress','completed','cancelled'],meeting:['scheduled','completed','cancelled','no_show'],renewal:['open','completed','dismissed','not_applicable'],permanence:['open','cancelled'],opportunity:['open','won','lost','cancelled']}
function keys(v:Record<string,unknown>,s:string):boolean{return Object.keys(v).sort().join(',')===s.split(',').sort().join(',')}
function str(v:unknown,n=200):v is string{return typeof v==='string'&&v.trim().length>0&&v.length<=n&&!/[\u0000-\u001f\u007f-\u009f]/.test(v)}
function nullableId(v:unknown):boolean{return v===null||isUuidV1(v)}
function version(v:unknown):boolean{return typeof v==='number'&&Number.isSafeInteger(v)&&v>0&&v<1e15}
function instant(v:unknown):boolean{return typeof v==='string'&&isStrictInstantV1(v.replace(/(\.\d{3})\d{1,3}(Z|[+-]\d{2}:\d{2})$/,'$1$2'))}
export function parseCalendarInputV1(value:unknown):CalendarInputV1|null {
 try{
  const v=snapshotProductJsonV1(value)
  if(!isClosedObjectV1(v)||Object.keys(v).some(k=>!['range_start','range_end','kind','status','customer_id','assigned_user_id','limit','after_at','after_kind','after_id'].includes(k))||!isStrictInstantV1(v.range_start)||!isStrictInstantV1(v.range_end))return null
  const duration=Date.parse(v.range_end)-Date.parse(v.range_start)
  if(duration<=0||duration>93*86400000||('kind'in v&&!kinds.includes(v.kind as string))||('status'in v&&!Object.values(statuses).flat().includes(v.status as string))||['customer_id','assigned_user_id'].some(k=>k in v&&!isUuidV1(v[k]))||('limit'in v&&(!Number.isInteger(v.limit)||(v.limit as number)<1||(v.limit as number)>100)))return null
  if(['after_at','after_kind','after_id'].some(k=>k in v)&&(!isStrictInstantV1(v.after_at)||!kinds.includes(v.after_kind as string)||!isUuidV1(v.after_id)))return null
  return v as CalendarInputV1
 }catch{return null}
}
export function parseCalendarPageV1(input:CalendarInputV1,value:unknown):CalendarPageV1|null {
 try{
  const v=snapshotProductJsonV1(value),limit=input.limit??50
  if(!isClosedObjectV1(v)||!keys(v,'contract_version,items,next')||v.contract_version!=='product.v1'||!Array.isArray(v.items)||v.items.length>limit)return null
  let previous=input.after_at?[Date.parse(input.after_at),input.after_kind!,input.after_id!]:null
  for(const r of v.items){
   if(!isClosedObjectV1(r)||!keys(r,'kind,id,version,title,status,customer_id,assigned_user_id,at,ends_at,all_day,date')||!kinds.includes(r.kind as string)||!isUuidV1(r.id)||!str(r.title)||!statuses[r.kind as string]?.includes(r.status as string)||!nullableId(r.customer_id)||!nullableId(r.assigned_user_id)||!instant(r.at)||typeof r.all_day!=='boolean')return null
   if(['renewal','permanence'].includes(r.kind as string)?(r.version!==null||!isStrictCalendarDateV1(r.date)||r.all_day!==true||r.ends_at!==null):(!version(r.version)||r.date!==null))return null
   if(r.ends_at!==null&&(!instant(r.ends_at)||Date.parse(r.ends_at as string)<=Date.parse(r.at as string)))return null
   const at=Date.parse(r.at as string),end=r.ends_at===null?null:Date.parse(r.ends_at as string)
   if(at>=Date.parse(input.range_end)||(end===null?at<Date.parse(input.range_start):end<=Date.parse(input.range_start)))return null
   if(input.kind&&r.kind!==input.kind||input.status&&r.status!==input.status||input.customer_id&&r.customer_id!==input.customer_id||input.assigned_user_id&&r.assigned_user_id!==input.assigned_user_id)return null
   if(previous&&(at<(previous[0] as number)||(at===previous[0]&&(r.kind as string)<(previous[1] as string))||(at===previous[0]&&r.kind===previous[1]&&r.id<=(previous[2] as string))))return null
   previous=[at,r.kind as string,r.id]
  }
  if(v.next!==null){const last=v.items.at(-1);if(!isClosedObjectV1(v.next)||!keys(v.next,'after_at,after_kind,after_id')||v.items.length!==limit||v.next.after_at!==last?.at||v.next.after_kind!==last?.kind||v.next.after_id!==last?.id)return null}
  return v as CalendarPageV1
 }catch{return null}
}
export function parseWorkGetV1(kind:string,id:string,value:unknown):WorkGetV1|null {
 try{
  const v=snapshotProductJsonV1(value)
  if(!isClosedObjectV1(v)||!keys(v,'contract_version,kind,record')||v.contract_version!=='product.v1'||v.kind!==kind||!isClosedObjectV1(v.record))return null
  const r=v.record
  const fields={task:'id,version,title,status,customer_id,opportunity_id,due_at,priority,assigned_user_id',meeting:'id,version,title,status,customer_id,opportunity_id,starts_at,ends_at,timezone,all_day,channel,assigned_user_id',opportunity:'id,version,title,status,customer_id,stage_id,owner_user_id,amount_minor,currency,next_follow_up_at,expected_close_date,next_action,source,links,history,history_partial'}[kind]
  if(!fields||!keys(r,fields)||r.id!==id||!version(r.version)||!str(r.title)||!statuses[kind]?.includes(r.status as string)||!nullableId(r.customer_id))return null
  if(kind!=='opportunity'&&(!nullableId(r.opportunity_id)||!nullableId(r.assigned_user_id)||(r.opportunity_id!==null&&r.customer_id===null)))return null
  if(kind==='task'&&((r.due_at!==null&&!instant(r.due_at))||(r.priority!==null&&!['low','normal','high'].includes(r.priority as string))))return null
  if(kind==='meeting'){
   if(!instant(r.starts_at)||(r.ends_at!==null&&(!instant(r.ends_at)||Date.parse(r.ends_at as string)<=Date.parse(r.starts_at as string)))||!str(r.timezone,64)||typeof r.all_day!=='boolean'||!['in_person','phone','video','other'].includes(r.channel as string))return null
   try{new Intl.DateTimeFormat('en',{timeZone:r.timezone})}catch{return null}
  }
  if(kind==='opportunity'){
   if(!isUuidV1(r.customer_id)||!isUuidV1(r.stage_id)||!nullableId(r.owner_user_id)||!['manual','import','integration'].includes(r.source as string)||((r.amount_minor===null)!==(r.currency===null))||(r.amount_minor!==null&&(typeof r.amount_minor!=='number'||!Number.isSafeInteger(r.amount_minor)||r.amount_minor<0||r.amount_minor>=1e15||!['EUR','USD','GBP'].includes(r.currency as string)))||(r.next_follow_up_at!==null&&!instant(r.next_follow_up_at))||(r.expected_close_date!==null&&!isStrictCalendarDateV1(r.expected_close_date))||(r.next_action!==null&&!str(r.next_action))||!Array.isArray(r.links)||r.links.length>3||!Array.isArray(r.history)||r.history.length>50||typeof r.history_partial!=='boolean')return null
   const linkKinds=new Set()
   for(const x of r.links){if(!isClosedObjectV1(x)||!keys(x,'kind,id')||!['contract','service','plan'].includes(x.kind as string)||!isUuidV1(x.id)||linkKinds.has(x.kind))return null;linkKinds.add(x.kind)}
   let prev=(r.version as number)+1
   for(const h of r.history){if(!isClosedObjectV1(h)||!keys(h,'version,operation,occurred_at,from_stage_id,to_stage_id,from_status,to_status')||!version(h.version)||(h.version as number)>=prev||!isWorkOperationV1(h.operation)||!h.operation.startsWith('opportunity.')||!instant(h.occurred_at)||!nullableId(h.from_stage_id)||!isUuidV1(h.to_stage_id)||(h.from_status!==null&&!statuses.opportunity.includes(h.from_status as string))||!statuses.opportunity.includes(h.to_status as string))return null;prev=h.version as number}
  }
  return v as WorkGetV1
 }catch{return null}
}
export function parseStageCatalogV1(limit:number,after:string|null,value:unknown):StageCatalogV1|null{
 try{const v=snapshotProductJsonV1(value);if(!isClosedObjectV1(v)||!keys(v,'contract_version,items,next_id')||v.contract_version!=='product.v1'||!Array.isArray(v.items)||v.items.length>limit)return null
 let prev=after??''
 for(const r of v.items){if(!isClosedObjectV1(r)||!keys(r,'id,code,display_name,position,outcome,status')||!isUuidV1(r.id)||r.id<=prev||typeof r.code!=='string'||!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(r.code)||!str(r.display_name,120)||!Number.isSafeInteger(r.position)||(r.position as number)<0||![null,'won','lost'].includes(r.outcome as null)||!['active','retired'].includes(r.status as string))return null;prev=r.id}
 if(v.next_id!==null&&(v.items.length!==limit||v.next_id!==v.items.at(-1)?.id))return null
 return v as StageCatalogV1
 }catch{return null}
}
