import type{TelecomAttentionInputV1,TelecomAttentionPageV1}from '../contracts/telecom-attention-v1'
import{snapshotProductJsonV1}from './product-query-runtime-v1.ts'
import{isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import{isStrictCalendarDateV1}from './telecom-runtime-v1.ts'
const kinds=['renewal','permanence','case','task','meeting','opportunity','portability']as const
const date=(v:unknown):v is string=>isStrictCalendarDateV1(v)&&v>='2000-01-01'&&v<='2100-12-31'
const days=(a:string,b:string)=>(Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/86400000
const keys=(v:Record<string,unknown>,want:readonly string[])=>Object.keys(v).sort().join(',')===[...want].sort().join(',')
const kind=(v:unknown)=>typeof v==='string'&&(kinds as readonly string[]).includes(v)
export function parseTelecomAttentionInputV1(value:unknown):TelecomAttentionInputV1|null{try{
 const v=snapshotProductJsonV1(value)
 if(!plain(v)||Object.keys(v).some(k=>!['window_from','window_to','customer_id','owner_user_id','kind','limit','fallback_on','after_sort_on','after_kind','after_id'].includes(k))||!date(v.window_from)||!date(v.window_to)||days(v.window_to,v.window_from)<0||days(v.window_to,v.window_from)>366)return null
 for(const[k,x]of Object.entries(v)){if(k==='limit'){if(typeof x!=='number'||!Number.isInteger(x)||x<1||x>100)return null}else if(k.endsWith('_id')){if(!uuid(x))return null}else if(k==='kind'||k==='after_kind'){if(!kind(x))return null}else if(!date(x))return null}
 const n=['after_sort_on','after_kind','after_id'].filter(k=>Object.hasOwn(v,k)).length
 if(n!==0&&n!==3||n===3&&(!Object.hasOwn(v,'fallback_on')||(v.after_sort_on as string)<v.window_from||(v.after_sort_on as string)>v.window_to||v.kind!==undefined&&v.kind!==v.after_kind))return null
 return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,typeof x==='string'&&k.endsWith('_id')?x.toLowerCase():x])))as TelecomAttentionInputV1
}catch{return null}}
const states:Readonly<Record<string,readonly string[]>>={renewal:['open'],permanence:['open'],case:['open','in_progress','waiting_customer','waiting_operator'],task:['pending','in_progress'],meeting:['scheduled'],opportunity:['open'],portability:['draft','requested','scheduled','in_progress','rejected']}
const reasons:Readonly<Record<string,readonly string[]>>={renewal:['renewal_overdue','renewal_upcoming'],permanence:['permanence_ending'],case:['case_urgent','case_overdue'],task:['task_overdue'],meeting:['meeting_upcoming'],opportunity:['opportunity_missing_next_action'],portability:['portability_blocked','portability_pending']}
const tuple=(r:Record<string,unknown>)=>[r.sort_on,r.kind,r.id].join('|')
export function parseTelecomAttentionResultV1(input:TelecomAttentionInputV1,value:unknown):TelecomAttentionPageV1|null{try{
 const v=snapshotProductJsonV1(value),lim=input.limit??50
 if(!plain(v)||!keys(v,['contract_version','operation','as_of','fallback_on','items','next_cursor'])||v.contract_version!=='telecom.attention.v1'||v.operation!=='telecom.attention'||!date(v.as_of)||!date(v.fallback_on)||days(v.as_of,v.fallback_on)<0||days(v.as_of,v.fallback_on)>7||input.fallback_on!==undefined&&input.fallback_on!==v.fallback_on||!Array.isArray(v.items)||v.items.length>lim)return null
 let previous=input.after_id?[input.after_sort_on,input.after_kind,input.after_id].join('|'):''
 for(const r of v.items){
 if(!plain(r)||!keys(r,['kind','id','customer_id','owner_user_id','sort_on','due_on','status','reason_code','priority'])||!kind(r.kind)||!uuid(r.id)||r.owner_user_id!==null&&!uuid(r.owner_user_id)||r.customer_id!==null&&!uuid(r.customer_id)||r.customer_id===null&&!['task','meeting'].includes(r.kind as string)||!date(r.sort_on)||r.sort_on<input.window_from||r.sort_on>input.window_to||r.due_on!==null&&!date(r.due_on)||typeof r.status!=='string'||!states[r.kind as string].includes(r.status)||typeof r.reason_code!=='string'||!reasons[r.kind as string].includes(r.reason_code)||!['low','normal','high','urgent'].includes(r.priority as string))return null
 if(input.customer_id!==undefined&&input.customer_id!==r.customer_id||input.owner_user_id!==undefined&&input.owner_user_id!==r.owner_user_id||input.kind!==undefined&&input.kind!==r.kind)return null
 if(r.due_on===null){if(!['case','opportunity'].includes(r.kind as string)||r.sort_on!==v.fallback_on)return null}else if(r.sort_on!==r.due_on)return null
 const gap=r.due_on===null?null:days(r.due_on as string,v.as_of)
 if(['renewal','permanence','meeting','opportunity'].includes(r.kind as string)&&r.priority!=='normal')return null
 if(r.kind==='renewal'&&(gap===null||gap>30||(gap<0)!==(r.reason_code==='renewal_overdue')))return null
 if(r.kind==='permanence'&&(gap===null||gap<0||gap>30))return null
 if(r.kind==='task'&&(gap===null||gap>0||r.priority==='urgent'))return null
 if(r.kind==='meeting'&&(gap===null||gap<0||gap>30))return null
 if(r.kind==='opportunity'&&r.due_on!==null)return null
 if(r.kind==='case'&&(r.reason_code==='case_urgent'?!['high','urgent'].includes(r.priority as string):gap===null||gap>=0||['high','urgent'].includes(r.priority as string)))return null
 if(r.kind==='portability'&&(gap===null||(r.status==='rejected')!==(r.reason_code==='portability_blocked')||r.priority!==(r.status==='rejected'?'high':'normal')))return null
 const t=tuple(r);if(t<=previous)return null;previous=t
 }
 if(v.next_cursor!==null){const c=v.next_cursor,last=v.items.at(-1);if(!plain(c)||!keys(c,['after_sort_on','after_kind','after_id','fallback_on'])||v.items.length!==lim||!last||c.after_sort_on!==last.sort_on||c.after_kind!==last.kind||c.after_id!==last.id||c.fallback_on!==v.fallback_on)return null}
 return v as TelecomAttentionPageV1
}catch{return null}}
