import type { InvoiceFormData } from './model.ts'
import type { BillingDraftV1,BillingInvoiceV1 } from '@/lib/contracts/billing-v1'
import { ProductUiError } from '../product/integration/repository.ts'
function scaled(value:number,places:number):number{
  const parts=String(value).split('.');if(!/^\d+$/.test(parts[0]) || parts.length>2 || parts[1] && (!/^\d+$/.test(parts[1]) || parts[1].length>places))throw new ProductUiError('validation')
  const n=Number(parts[0])*10**places+Number((parts[1]??'').padEnd(places,'0'));if(!Number.isSafeInteger(n))throw new ProductUiError('validation');return n
}
export function normalizedInvoice(form:InvoiceFormData):BillingDraftV1{
  if(!form.clientId || !['EUR','USD','GBP'].includes(form.currency))throw new ProductUiError('validation')
  return {customer_id:form.clientId,issue_on:form.issueDate,due_on:form.dueDate,series:form.series,currency:form.currency as BillingDraftV1['currency'],lines:form.items.map(i=>({description:i.description,quantity_milli:scaled(i.quantity,3),unit_price_minor:scaled(i.unitPrice,2),discount_bps:scaled(i.discountRate,2),tax_bps:scaled(i.taxRate,2),withholding_bps:scaled(i.withholdingRate,2)})),notes:form.notes||null,contract_id:form.contractId,service_id:form.serviceId,opportunity_id:form.opportunityId,...(form.currency!=='EUR'?{fx_rate_micros:form.exchangeRateToEur===null?null:scaled(form.exchangeRateToEur,6),fx_on:form.exchangeRateDate,fx_source:form.exchangeRateSource}: {})}
}
export function invoiceForm(invoice:BillingInvoiceV1):InvoiceFormData{
  return {clientId:invoice.customer_id,opportunityId:invoice.opportunity_id,contractId:invoice.contract_id,serviceId:invoice.service_id,series:invoice.series,issueDate:invoice.issue_on,dueDate:invoice.due_on,currency:invoice.currency,exchangeRateToEur:invoice.fx?invoice.fx.rate_micros/1000000:null,exchangeRateDate:invoice.fx?.on??null,exchangeRateSource:invoice.fx?.source??'',notes:invoice.notes??'',internalNotes:'',items:invoice.lines.map((l,sortOrder)=>({description:l.description,quantity:l.quantity_milli/1000,unitPrice:l.unit_price_minor/100,discountRate:l.discount_bps/100,taxRate:l.tax_bps/100,withholdingRate:l.withholding_bps/100,sortOrder}))}
}
