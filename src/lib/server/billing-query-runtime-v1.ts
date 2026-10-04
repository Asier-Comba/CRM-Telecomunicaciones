import type { BillingQueryV1,BillingQueriesV1,BillingReadDataV1 } from '../contracts/billing-v1'
import { billingDateV1,profile,array,text,integer,parseBillingLinesV1,calculateBillingV1,parseBillingInputV1 } from './billing-runtime-v1.ts'
import { isClosedObjectV1 as plain,isUuidV1 as uuid } from './product-work-runtime-v1.ts'
import { isStrictInstantV1 } from './telecom-runtime-v1.ts'
export const BILLING_QUERY_RPC_V1={'invoice.propose':'billing_v1_invoice_propose','invoice.get':'billing_v1_invoice_get','invoice.summary':'billing_v1_invoice_summary','invoice.list':'billing_v1_invoice_list','invoice.financial_summary':'billing_v1_invoice_financial_summary','configuration.get':'billing_v1_configuration_get'} as const
const keys={ 'invoice.propose':['source','draft'], 'invoice.get':['id'],'invoice.summary':['id'],'invoice.list':['customer_id','status','from','to','series','limit','after_id'],'invoice.financial_summary':['period'],'configuration.get':['customer_id'] }
const periods=['month','quarter','semester','year','all']
export function isBillingQueryV1(v:unknown):v is BillingQueryV1{return typeof v==='string'&&Object.hasOwn(keys,v)}
export function parseBillingQueryV1<Q extends BillingQueryV1>(q:Q,v:unknown):BillingQueriesV1[Q]|null {
 try{if(!isBillingQueryV1(q)||!plain(v)||Object.keys(v).some(k=>!keys[q].includes(k)))return null
  if(q==='invoice.propose'){
   if(Object.keys(v).sort().join(',')!=='draft,source'||!['manual','text','audio'].includes(v.source as string)||!plain(v.draft)||Object.hasOwn(v.draft,'command_id'))return null
   const validated=parseBillingInputV1('invoice.create_draft',{...v.draft,command_id:'00000000-0000-4000-8000-000000000001'})
   if(validated===null)return null
   const {command_id:discarded,...draft}=validated;void discarded
   return Object.freeze({source:v.source,draft:Object.freeze(draft)}) as BillingQueriesV1[Q]
  }
  if(['invoice.get','invoice.summary'].includes(q)&&!uuid(v.id))return null
  for(const [k,x]of Object.entries(v)){
   if(k==='id'||k.endsWith('_id')){if(!uuid(x))return null}
   else if(k==='limit'){if(!integer(x,1,100))return null}
   else if(k==='from'||k==='to'){if(!billingDateV1(x))return null}
   else if(k==='series'){if(typeof x!=='string'||!/^[A-Z0-9-]{1,8}$/.test(x))return null}
   else if(k==='status'){if(!['draft','trashed','issued','paid','overdue'].includes(x as string))return null}
   else if(k==='period'){if(!periods.includes(x as string))return null}
  }
  if(Object.hasOwn(v,'from')!==Object.hasOwn(v,'to')||v.from&&(Date.parse(v.to as string)-Date.parse(v.from as string)<=0||Date.parse(v.to as string)-Date.parse(v.from as string)>366*86400000))return null
  return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,(k==='id'||k.endsWith('_id'))&&typeof x==='string'?x.toLowerCase():x]))) as BillingQueriesV1[Q]
 }catch{return null}
}
function closed(v:unknown,k:string):v is Record<string,unknown>{return plain(v)&&Object.keys(v).sort().join(',')===k}
const safe=(v:unknown,max=1000000000000)=>integer(v,0,max)
function number(v:unknown):v is Record<string,unknown>{return closed(v,'sequence,series,year')&&integer(v.sequence,1,999999999999)&&integer(v.year,2000,2100)&&typeof v.series==='string'&&/^[A-Z0-9-]{1,8}$/.test(v.series)}
function totals(v:unknown){return closed(v,'subtotal_minor,tax_minor,total_minor,withholding_minor')&&Object.values(v).every(x=>safe(x))&&(v.total_minor as number)===(v.subtotal_minor as number)+(v.tax_minor as number)-(v.withholding_minor as number)}
const basicKeys='currency,customer_id,due_on,id,issue_on,number,overdue,series,status,totals,version'
function instant(v:unknown):boolean{return typeof v==='string' && isStrictInstantV1(v.replace(/(\.\d{3})\d{1,3}(Z|[+-]\d{2}:\d{2})$/,'$1$2'))}
function invoice(v:unknown,full=false):boolean {
 if(!closed(v,full?'contract_id,currency,customer_fiscal,customer_id,due_on,fx,id,issue_on,issued_at,issuer,lines,notes,number,opportunity_id,overdue,paid_at,series,service_id,status,totals,version':basicKeys)||!uuid(v.id)||!uuid(v.customer_id)||!integer(v.version,1,999999999999999)||!['draft','trashed','issued','paid'].includes(v.status as string)||!billingDateV1(v.issue_on)||v.due_on!==null&&(!billingDateV1(v.due_on)||v.due_on<v.issue_on)||typeof v.series!=='string'||!/^[A-Z0-9-]{1,8}$/.test(v.series)||!['EUR','USD','GBP'].includes(v.currency as string)||typeof v.overdue!=='boolean'||!totals(v.totals))return false
 if((v.status==='issued'||v.status==='paid')?!number(v.number)||v.number?.series!==v.series:v.number!==null)return false
 if(v.overdue&&v.status!=='issued')return false
 if(!full)return true
 if(parseBillingLinesV1(v.lines)===null||JSON.stringify(calculateBillingV1(v.lines as import('../contracts/billing-v1').BillingLineV1[]))!==JSON.stringify(Object.fromEntries(['subtotal_minor','tax_minor','withholding_minor','total_minor'].map(k=>[k,(v.totals as Record<string,unknown>)[k]]))))return false
 if(v.notes!==null&&!text(v.notes,2000)||['contract_id','service_id','opportunity_id'].some(k=>v[k]!==null&&!uuid(v[k])))return false
 if(v.customer_fiscal!==null&&!profile(v.customer_fiscal))return false
 if(v.issuer!==null){if(!closed(v.issuer,'address,city,country,currency,default_series,legal_name,postal_code,region,tax_id')||!profile(Object.fromEntries(Object.entries(v.issuer).filter(([k])=>k!=='currency'&&k!=='default_series')))||!['EUR','USD','GBP'].includes(v.issuer.currency as string)||typeof v.issuer.default_series!=='string'||!/^[A-Z0-9-]{1,8}$/.test(v.issuer.default_series))return false}
 if((v.status==='issued'||v.status==='paid')&&(v.issuer===null||v.customer_fiscal===null||!instant(v.issued_at)))return false
 if(v.status==='paid'?!instant(v.paid_at):v.paid_at!==null)return false
 if(['draft','trashed'].includes(v.status as string)&&v.issued_at!==null)return false
 if(v.currency==='EUR'){if(v.fx!==null)return false}else if(!closed(v.fx,'on,rate_micros,source')||!integer(v.fx.rate_micros,1,1000000000)||!billingDateV1(v.fx.on)||!text(v.fx.source,80))return false
 return true
}
export function parseBillingReadV1(q:BillingQueryV1,input:BillingQueriesV1[BillingQueryV1],v:unknown):BillingReadDataV1|null {
 try{
 if(!plain(v)||v.contract_version!=='billing.v1'||v.operation!==q)return null
 if(q==='invoice.propose'){
  if(!closed(v,'contract_version,draft,operation,requires_review,saved,source,totals')||!('draft'in input)||v.source!==input.source||v.requires_review!==true||v.saved!==false)return null
  const parsed=parseBillingQueryV1('invoice.propose',{source:v.source,draft:v.draft})
  if(!parsed)return null
  const canonical=(x:unknown):string=>JSON.stringify(x,(_key,value)=>plain(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value)
  if(canonical(parsed.draft)!==canonical(input.draft)||canonical(v.totals)!==canonical(calculateBillingV1(parsed.draft.lines)))return null
 }else if(q==='invoice.get'||q==='invoice.summary'){
  if(!closed(v,'contract_version,invoice,operation')||!invoice(v.invoice,q==='invoice.get')||(v.invoice as Record<string,unknown>).id!==('id' in input?input.id:null))return null
 }else if(q==='invoice.list'){
  if(!closed(v,'contract_version,items,next_id,operation')||!array(v.items)||v.items.length>('limit' in input?input.limit??20:20))return null
  let last='after_id' in input?input.after_id??'':''
  for(const row of v.items){if(!invoice(row)||!plain(row)||(row.id as string)<=last)return null;last=row.id as string}
  if(v.next_id!==null&&(v.next_id!==last||v.items.length!==('limit' in input?input.limit??20:20)))return null
 }else if(q==='invoice.financial_summary'){
  if(!closed(v,'as_of,contract_version,currencies,from,operation,period,to')||v.period!==('period' in input?input.period??'month':'month')||!billingDateV1(v.as_of)||!array(v.currencies)||v.currencies.length>3||(v.period==='all'?v.from!==null||v.to!==null:!billingDateV1(v.from)||!billingDateV1(v.to)||(v.to as string)<=(v.from as string)))return null
  if(!validBillingFinancialCurrenciesV1(v.currencies))return null
 }else{
  if(!closed(v,'contract_version,customer,issuer,operation'))return null
  if(v.customer!==null&&(!closed(v.customer,'profile,version')||!profile(v.customer.profile)||!integer(v.customer.version,1,999999999999999)))return null
  if(v.issuer!==null&&(!closed(v.issuer,'currency,default_series,profile,version')||!profile(v.issuer.profile)||!integer(v.issuer.version,1,999999999999999)||!['EUR','USD','GBP'].includes(v.issuer.currency as string)||typeof v.issuer.default_series!=='string'||!/^[A-Z0-9-]{1,8}$/.test(v.issuer.default_series)))return null
 }
 return Object.freeze({...v}) as BillingReadDataV1
 }catch{return null}
}
export function validBillingFinancialCurrenciesV1(rows:unknown):boolean {
 try{
 if(!array(rows)||rows.length>3)return false
  let last=''
  for(const row of rows){if(!closed(row,'currency,issued_count,issued_minor,outstanding_count,outstanding_minor,overdue_count,overdue_minor,paid_count,paid_minor')||!['EUR','USD','GBP'].includes(row.currency as string)||(row.currency as string)<=last||Object.entries(row).some(([k,x])=>k!=='currency'&&!safe(x,Number.MAX_SAFE_INTEGER))||row.issued_minor!==(row.paid_minor as number)+(row.outstanding_minor as number)||(row.overdue_minor as number)>(row.outstanding_minor as number)||row.issued_count!==(row.paid_count as number)+(row.outstanding_count as number)||(row.overdue_count as number)>(row.outstanding_count as number))return false;last=row.currency as string}
 return true
 }catch{return false}
}
