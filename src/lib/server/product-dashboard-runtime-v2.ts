import {validBillingFinancialCurrenciesV1} from './billing-query-runtime-v1.ts'
import type {DashboardInputV2,DashboardV2,GlobalSearchInputV1,GlobalSearchV1} from '../contracts/product-dashboard-v2'
import {snapshotProductJsonV1} from './product-query-runtime-v1.ts'
import {isClosedObjectV1,isUuidV1} from './product-work-runtime-v1.ts'
import {isStrictCalendarDateV1,isStrictInstantV1} from './telecom-runtime-v1.ts'
function keys(v:Record<string,unknown>,s:string){return Object.keys(v).sort().join(',')===s.split(',').sort().join(',')}
export function parseDashboardInputV2(value:unknown):DashboardInputV2|null{
 try{const v=snapshotProductJsonV1(value);if(!isClosedObjectV1(v)||Object.keys(v).some(k=>!['audience','period','anchor_date'].includes(k))||('audience'in v&&!['my','workspace','team'].includes(v.audience as string))||('period'in v&&!['month','quarter','semester','year','all'].includes(v.period as string))||('anchor_date'in v&&!isStrictCalendarDateV1(v.anchor_date)))return null;return v as DashboardInputV2}catch{return null}
}
export function parseDashboardV2(input:DashboardInputV2,value:unknown):DashboardV2|null{
 try{const v=snapshotProductJsonV1(value);if(!isClosedObjectV1(v)||!keys(v,'contract_version,audience,period,snapshot_counts,period_counts,recent_activity,financial,financial_status')||v.contract_version!=='product.dashboard.v2'||v.audience!==(input.audience??'my')||!['available','unavailable'].includes(v.financial_status as string)||!isClosedObjectV1(v.period)||!keys(v.period,'kind,start,end_exclusive')||v.period.kind!==(input.period??'month'))return null
 if(v.financial_status==='unavailable'?v.financial!==null:!isClosedObjectV1(v.financial)||!keys(v.financial,'currencies')||!validBillingFinancialCurrenciesV1(v.financial.currencies))return null
 if(v.period.kind==='all'?(v.period.start!==null||v.period.end_exclusive!==null):(!isStrictCalendarDateV1(v.period.start)||!isStrictCalendarDateV1(v.period.end_exclusive)||v.period.start>=v.period.end_exclusive))return null
 const dimensions=[[v.snapshot_counts,'customers,contracts,services,lines,opportunities,tasks,meetings,renewals,permanences'],[v.period_counts,'customers_created,tasks_due,meetings_scheduled,renewals_due,permanences_due,opportunities_closed']]
 for(const [counts,fields] of dimensions){if(!isClosedObjectV1(counts)||!keys(counts,fields as string)||Object.values(counts).some(x=>typeof x!=='number'||!Number.isSafeInteger(x)||x<0||x>=1e15))return null}
 if(!Array.isArray(v.recent_activity)||v.recent_activity.length>20)return null
 const ids=new Set()
 for(const a of v.recent_activity){if(!isClosedObjectV1(a)||!keys(a,'id,activity_kind,summary_code,occurred_at,customer_id')||!isUuidV1(a.id)||ids.has(a.id)||!['created','updated','contacted','status_changed','system'].includes(a.activity_kind as string)||!['entity.created','entity.updated','entity.contacted','entity.status_changed','system.imported','system.synchronized'].includes(a.summary_code as string)||typeof a.occurred_at!=='string'||!isStrictInstantV1(a.occurred_at.replace(/(\.\d{3})\d{1,3}(Z|[+-]\d{2}:\d{2})$/,'$1$2'))||(a.customer_id!==null&&!isUuidV1(a.customer_id)))return null;ids.add(a.id)}
 return v as DashboardV2
 }catch{return null}
}
export function parseGlobalSearchInputV1(value:unknown):GlobalSearchInputV1|null{
 try{const v=snapshotProductJsonV1(value);if(!isClosedObjectV1(v)||Object.keys(v).some(k=>!['query','limit'].includes(k))||typeof v.query!=='string'||v.query.trim().length<2||v.query.length>100||/[\u0000-\u001f\u007f-\u009f]/.test(v.query)||('limit'in v&&(!Number.isInteger(v.limit)||(v.limit as number)<1||(v.limit as number)>50)))return null;return Object.freeze({...v,query:v.query.trim()}) as GlobalSearchInputV1}catch{return null}
}
export function parseGlobalSearchV1(input:GlobalSearchInputV1,value:unknown):GlobalSearchV1|null{
 try{const v=snapshotProductJsonV1(value);if(!isClosedObjectV1(v)||!keys(v,'contract_version,items')||v.contract_version!=='product.v1'||!Array.isArray(v.items)||v.items.length>(input.limit??20))return null
 const ids=new Set(),counts:Record<string,number>={}
 const status:Record<string,string[]>={customer:['active','inactive'],contact:['active','inactive'],contract:['draft','active','ended','cancelled'],service:['pending','active','suspended','ended','cancelled'],line:['pending','active','suspended','ended','cancelled'],opportunity:['open','won','lost']}
 for(const r of v.items){if(!isClosedObjectV1(r)||!keys(r,'kind,id,customer_id,label,status')||!Object.hasOwn(status,r.kind as string)||!isUuidV1(r.id)||!isUuidV1(r.customer_id)||typeof r.label!=='string'||r.label.length<1||r.label.length>240||/[\u0000-\u001f\u007f-\u009f]/.test(r.label)||!r.label.toLowerCase().includes(input.query.toLowerCase())||!status[r.kind as string].includes(r.status as string)||ids.has(r.kind+':'+r.id))return null
 ids.add(r.kind+':'+r.id);counts[r.kind as string]=(counts[r.kind as string]??0)+1;if(counts[r.kind as string]>5)return null
 }
 return v as GlobalSearchV1
 }catch{return null}
}
