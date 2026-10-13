import {parseBillingQueryV1,parseBillingReadV1} from '../lib/server/billing-query-runtime-v1.ts'
import {snapshotProductJsonV1} from '../lib/server/product-query-runtime-v1.ts'
import type {BillingQueriesV1,BillingInvoiceSummaryV1} from '../lib/contracts/billing-v1.ts'

/** Customer identity must come from an authorized opaque binding. No broad
 * workspace list, fiscal data, invoice numbers, lines, notes or payment command. */
export function parseAssistantInvoiceListInputV1(raw:unknown):BillingQueriesV1['invoice.list']|null{
  try{
    const value=snapshotProductJsonV1(raw)
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['customer_id','status','from','to','limit','after_id'].includes(k)))return null
    const input=parseBillingQueryV1('invoice.list',value)
    return input&&input.customer_id&&(input.limit??20)<=20?input:null
  }catch{return null}
}

/** Validate the complete current W1 list DTO, then verify the requested
 * customer/status/issue-date slice before discarding private fields. */
export function projectAuthorizedInvoiceListV1(rawInput:unknown,raw:unknown):Record<string,unknown>|null{
  try{
    const input=parseAssistantInvoiceListInputV1(rawInput)
    if(!input)return null
    const value=snapshotProductJsonV1(raw)
    const data=parseBillingReadV1('invoice.list',input,value) as {items:readonly BillingInvoiceSummaryV1[];next_id:string|null}|null
    if(!data||data.items.some(row=>row.customer_id.toLowerCase()!==input.customer_id!.toLowerCase()||(row.overdue&&row.due_on===null)
      ||(input.status==='overdue'?!row.overdue:input.status!==undefined&&row.status!==input.status)
      ||(input.from!==undefined&&row.issue_on<input.from)||(input.to!==undefined&&row.issue_on>=input.to)))return null
    return snapshotProductJsonV1({contract_version:'assistant.invoice-list.v1',operation:'invoice.list',
      items:data.items.map(row=>({id:row.id,status:row.status,issue_on:row.issue_on,due_on:row.due_on,currency:row.currency,
        total_minor:String(row.totals.total_minor),overdue:row.overdue})),next_id:data.next_id}) as Record<string,unknown>
  }catch{return null}
}
