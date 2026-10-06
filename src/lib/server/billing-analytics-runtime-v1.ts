import type{BillingAnalyticsInputV1,BillingAnalyticsOperationV1,BillingAnalyticsResultV1}from '../contracts/billing-analytics-v1'
import{snapshotProductJsonV1}from './product-query-runtime-v1.ts'
import{isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import{isStrictCalendarDateV1}from './telecom-runtime-v1.ts'
const date=(v:unknown):v is string=>isStrictCalendarDateV1(v)&&v>='2000-01-01'&&v<='2100-12-31'
const month=(v:unknown):v is string=>date(v)&&v.endsWith('-01')
const money=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9][0-9]{0,39})$/.test(v)
const currencies=['EUR','USD','GBP']
const keys=(v:Record<string,unknown>,want:readonly string[])=>Object.keys(v).sort().join(',')===[...want].sort().join(',')
export function isBillingAnalyticsOperationV1(v:unknown):v is BillingAnalyticsOperationV1{return v==='billing.monthly_series'||v==='billing.top_customers'}
export function parseBillingAnalyticsInputV1(op:BillingAnalyticsOperationV1,value:unknown):BillingAnalyticsInputV1|null{try{
 if(!isBillingAnalyticsOperationV1(op))return null;const v=snapshotProductJsonV1(value),allowed=['currency','from_month','to_month','customer_id',...(op==='billing.top_customers'?['limit']:[])]
 if(!plain(v)||Object.keys(v).some(k=>!allowed.includes(k))||!month(v.from_month)||!month(v.to_month)||typeof v.currency!=='string'||!currencies.includes(v.currency)||v.to_month<v.from_month)return null
 const span=(Number(v.to_month.slice(0,4))-Number(v.from_month.slice(0,4)))*12+Number(v.to_month.slice(5,7))-Number(v.from_month.slice(5,7));if(span>=24)return null
 if(v.customer_id!==undefined&&!uuid(v.customer_id)||v.limit!==undefined&&(typeof v.limit!=='number'||!Number.isInteger(v.limit)||v.limit<1||v.limit>25))return null
 return Object.freeze({...v,...(typeof v.customer_id==='string'?{customer_id:v.customer_id.toLowerCase()}:{})})as BillingAnalyticsInputV1
}catch{return null}}
export function parseBillingAnalyticsResultV1(op:BillingAnalyticsOperationV1,input:BillingAnalyticsInputV1,value:unknown):BillingAnalyticsResultV1|null{try{
 if(!isBillingAnalyticsOperationV1(op))return null;const v=snapshotProductJsonV1(value),monthly=op==='billing.monthly_series',amounts=['issued_minor','paid_minor','outstanding_minor','overdue_minor']
 if(!plain(v)||!keys(v,['contract_version','operation','basis','as_of','currency','from_month','to_month','items'])||v.contract_version!=='billing.analytics.v1'||v.operation!==op||v.basis!=='issue_month_cohort_current_status'||!date(v.as_of)||v.currency!==input.currency||v.from_month!==input.from_month||v.to_month!==input.to_month||!Array.isArray(v.items)||v.items.length>(monthly?24:input.limit??10))return null
 let previousAmount:bigint|null=null,previousId='';const seen=new Set<string>(),months:string[]=[]
 for(const row of v.items){if(!plain(row)||!keys(row,[...amounts,monthly?'month':'customer_id'])||amounts.some(k=>!money(row[k])))return null
 const issued=BigInt(row.issued_minor as string),paid=BigInt(row.paid_minor as string),outstanding=BigInt(row.outstanding_minor as string),overdue=BigInt(row.overdue_minor as string)
 if(issued!==paid+outstanding||overdue>outstanding)return null
 if(monthly){if(!month(row.month))return null;months.push(row.month)}else{if(!uuid(row.customer_id)||seen.has(row.customer_id as string)||input.customer_id!==undefined&&input.customer_id!==row.customer_id||previousAmount!==null&&(issued>previousAmount||issued===previousAmount&&(row.customer_id as string)<=previousId))return null
 seen.add(row.customer_id as string);previousAmount=issued;previousId=row.customer_id as string}
 }
 if(monthly){const expected:string[]=[];for(let m=input.from_month;m<=input.to_month;){expected.push(m);const d=new Date(m+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);m=d.toISOString().slice(0,10)}if(expected.join('|')!==months.join('|'))return null}
 return v as BillingAnalyticsResultV1
}catch{return null}}
