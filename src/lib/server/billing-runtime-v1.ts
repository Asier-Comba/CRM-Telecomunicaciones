import type { BillingLineV1,BillingTotalsV1,BillingInputsV1,BillingOperationV1,BillingReceiptV1 } from '../contracts/billing-v1'
import { isClosedObjectV1 as plain,isUuidV1 as uuid } from './product-work-runtime-v1.ts'
import { isStrictCalendarDateV1 } from './telecom-runtime-v1.ts'
export const BILLING_RPC_V1 = {
 'issuer.set':'billing_v1_issuer_set','customer_fiscal.set':'billing_v1_customer_fiscal_set',
 'invoice.create_draft':'billing_v1_invoice_create_draft','invoice.update_draft':'billing_v1_invoice_update_draft',
 'invoice.issue':'billing_v1_invoice_issue','invoice.mark_paid':'billing_v1_invoice_mark_paid',
 'invoice.reverse_payment':'billing_v1_invoice_reverse_payment','invoice.trash':'billing_v1_invoice_trash','invoice.restore':'billing_v1_invoice_restore',
} as const
export function isBillingOperationV1(v:unknown):v is BillingOperationV1{return typeof v==='string' && Object.hasOwn(BILLING_RPC_V1,v)}
export function text(v:unknown,max:number){return typeof v==='string' && v.trim().length>0 && v.length<=max && !/[\u0000-\u001f\u007f-\u009f]/.test(v)}
export function integer(v:unknown,min:number,max:number):v is number{return typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max}
export function billingDateV1(v:unknown):v is string {return isStrictCalendarDateV1(v) && v>='2000-01-01'&&v<='2100-12-31'}
export function array(v:unknown):v is unknown[]{return Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&Reflect.ownKeys(v).every(k=>k==='length'||typeof k==='string'&&/^(0|[1-9][0-9]*)$/.test(k)&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)??{},'value'))}
export function parseBillingLinesV1(v:unknown):readonly BillingLineV1[]|null {
 try {
  if(!array(v)||v.length<1||v.length>50)return null
  const rows:BillingLineV1[]=[]
  for(const x of v){if(!plain(x)||Object.keys(x).sort().join(',')!=='description,discount_bps,quantity_milli,tax_bps,unit_price_minor,withholding_bps'||!text(x.description,300)||!integer(x.quantity_milli,1,100000000)||!integer(x.unit_price_minor,0,1000000000)||!['discount_bps','tax_bps','withholding_bps'].every(k=>integer(x[k],0,10000)))return null;rows.push(Object.freeze({...x}) as BillingLineV1)}
  return Object.freeze(rows)
 } catch{return null}
}
export function calculateBillingV1(lines:readonly BillingLineV1[]):BillingTotalsV1|null {
 const parsed=parseBillingLinesV1(lines);if(parsed===null)return null
 const round=(n:bigint,d:bigint)=>(n+d/BigInt("2"))/d
 let subtotal=BigInt("0"),tax=BigInt("0"),withholding=BigInt("0")
 for(const row of parsed){const gross=round(BigInt(row.quantity_milli)*BigInt(row.unit_price_minor),BigInt("1000")),base=gross-round(gross*BigInt(row.discount_bps),BigInt("10000"));subtotal+=base;tax+=round(base*BigInt(row.tax_bps),BigInt("10000"));withholding+=round(base*BigInt(row.withholding_bps),BigInt("10000"))}
 const total=subtotal+tax-withholding;if([subtotal,tax,withholding,total].some(n=>n<BigInt("0")||n>BigInt("1000000000000")))return null
 return Object.freeze({subtotal_minor:Number(subtotal),tax_minor:Number(tax),withholding_minor:Number(withholding),total_minor:Number(total)})
}
export function profile(v:unknown):boolean {
 if(!plain(v)||Object.keys(v).sort().join(',')!=='address,city,country,legal_name,postal_code,region,tax_id')return false
 return Object.entries(v).every(([k,x])=>text(x,k==='address'?300:k==='legal_name'?200:80))&&typeof v.country==='string'&&/^[A-Z]{2}$/.test(v.country)
}
const draftKeys=['issue_on','due_on','series','currency','lines','contract_id','service_id','opportunity_id','notes','fx_rate_micros','fx_on','fx_source']
export function parseBillingInputV1<O extends BillingOperationV1>(op:O,v:unknown):BillingInputsV1[O]|null {
 try {
  if(!isBillingOperationV1(op)||!plain(v)||new TextEncoder().encode(JSON.stringify(v)).length>32768)return null
  const required=op==='issuer.set'?['command_id','expected_version','profile','currency','default_series']:op==='customer_fiscal.set'?['command_id','customer_id','expected_version','profile']:op==='invoice.create_draft'?['command_id','customer_id','issue_on','due_on','series','currency','lines']:op==='invoice.update_draft'?['command_id','id','expected_version','issue_on','due_on','series','currency','lines']:['command_id','id','expected_version']
  const allowed=new Set([...required,...(op.endsWith('_draft')?draftKeys:[])])
  if(required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!allowed.has(k)))return null
  for(const [k,x] of Object.entries(v)) {
   if(['command_id','id','customer_id'].includes(k)){if(!uuid(x))return null}
   else if(['contract_id','service_id','opportunity_id'].includes(k)){if(x!==null&&!uuid(x))return null}
   else if(k==='expected_version'){if(!integer(x,op.endsWith('.set')?0:1,999999999999999))return null}
   else if(k==='profile'){if(!profile(x))return null}
   else if(k==='lines'){if(parseBillingLinesV1(x)===null||calculateBillingV1(x as BillingLineV1[])===null)return null}
   else if(k==='currency'){if(!['EUR','USD','GBP'].includes(x as string))return null}
   else if(k==='series'||k==='default_series'){if(typeof x!=='string'||!/^[A-Z0-9-]{1,8}$/.test(x))return null}
   else if(['issue_on','due_on','fx_on'].includes(k)){if(x===null&&k!=='issue_on')continue;if(!billingDateV1(x))return null}
   else if(k==='fx_rate_micros'){if(x!==null&&!integer(x,1,1000000000))return null}
   else if(x!==null&&!text(x,k==='notes'?2000:80))return null
  }
  if(v.issue_on){if(v.due_on!==null&&(v.due_on as string)<(v.issue_on as string))return null
   if(v.currency!=='EUR'&&(!v.fx_rate_micros||!v.fx_on||!v.fx_source))return null
   if(v.currency==='EUR'&&['fx_rate_micros','fx_on','fx_source'].some(k=>v[k]!==undefined&&v[k]!==null))return null
  }
  return Object.freeze({...Object.fromEntries(Object.entries(v).map(([k,x])=>[k,(k==='id'||k.endsWith('_id'))&&typeof x==='string'?x.toLowerCase():x])),...(v.lines?{lines:parseBillingLinesV1(v.lines)}:{}),...(plain(v.profile)?{profile:Object.freeze({...v.profile})}:{})}) as BillingInputsV1[O]
 }catch{return null}
}
export function parseBillingReceiptV1(op:BillingOperationV1,input:BillingInputsV1[BillingOperationV1],v:unknown):BillingReceiptV1|null {
 try {
 if(!plain(v)||Object.keys(v).sort().join(',')!=='command_id,contract_version,id,number,operation,status,version'||v.contract_version!=='billing.v1'||v.command_id!==input.command_id||v.operation!==op||!uuid(v.id)||!integer(v.version,1,999999999999999)||!['profile','draft','trashed','issued','paid'].includes(v.status as string)||('id' in input&&v.id!==input.id)||('expected_version' in input?v.version!==input.expected_version+1:v.version!==1))return null
 const state=op.endsWith('.set')?'profile':op==='invoice.issue'||op==='invoice.reverse_payment'?'issued':op==='invoice.mark_paid'?'paid':op==='invoice.trash'?'trashed':'draft'
 if(v.status!==state)return null
 if(state==='issued'||state==='paid') {if(!plain(v.number)||Object.keys(v.number).sort().join(',')!=='sequence,series,year'||typeof v.number.series!=='string'||!/^[A-Z0-9-]{1,8}$/.test(v.number.series)||!integer(v.number.year,2000,2100)||!integer(v.number.sequence,1,999999999999))return null}
 else if(v.number!==null)return null
 return Object.freeze({...v}) as BillingReceiptV1
 }catch{return null}
}
