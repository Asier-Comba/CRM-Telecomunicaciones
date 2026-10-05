/** Exact money. Currency amounts are minor units; quantity in thousandths; rates in basis points. */
export type BillingLineV1 = Readonly<{description:string;quantity_milli:number;unit_price_minor:number;discount_bps:number;tax_bps:number;withholding_bps:number}>
export type BillingTotalsV1 = Readonly<{subtotal_minor:number;tax_minor:number;withholding_minor:number;total_minor:number}>
export type BillingProfileV1 = {legal_name:string;tax_id:string;address:string;postal_code:string;city:string;region:string;country:string}
export type BillingDraftV1 = {customer_id:string;issue_on:string;due_on:string|null;series:string;currency:'EUR'|'USD'|'GBP';lines:readonly BillingLineV1[];contract_id?:string|null;service_id?:string|null;opportunity_id?:string|null;notes?:string|null;fx_rate_micros?:number|null;fx_on?:string|null;fx_source?:string|null}
type CAS={command_id:string;id:string;expected_version:number}
export type BillingInputsV1 = {
 'issuer.set':{command_id:string;expected_version:number;profile:BillingProfileV1;currency:'EUR'|'USD'|'GBP';default_series:string}
 'customer_fiscal.set':{command_id:string;customer_id:string;expected_version:number;profile:BillingProfileV1}
 'invoice.create_draft':{command_id:string}&BillingDraftV1
 'invoice.update_draft':CAS&Omit<BillingDraftV1,'customer_id'>
 'invoice.issue':CAS
 'invoice.mark_paid':CAS
 'invoice.reverse_payment':CAS
 'invoice.trash':CAS
 'invoice.restore':CAS
}
export type BillingOperationV1=keyof BillingInputsV1
export type BillingReceiptV1=Readonly<{contract_version:'billing.v1';command_id:string;operation:BillingOperationV1;id:string;version:number;status:'profile'|'draft'|'trashed'|'issued'|'paid';number:Readonly<{series:string;year:number;sequence:number}>|null}>
export type BillingProposalInputV1=Readonly<{source:'manual'|'text'|'audio';draft:BillingDraftV1}>
export type BillingQueriesV1 = {
 'invoice.propose':BillingProposalInputV1
 'invoice.get':{id:string}
 'invoice.summary':{id:string}
 'invoice.list':{customer_id?:string;status?:'draft'|'trashed'|'issued'|'paid'|'overdue';from?:string;to?:string;series?:string;limit?:number;after_id?:string}
 'invoice.financial_summary':{period?:'month'|'quarter'|'semester'|'year'|'all'}
 'configuration.get':{customer_id?:string}
}
export type BillingQueryV1=keyof BillingQueriesV1
export type BillingInvoiceSummaryV1=Readonly<{id:string;version:number;status:'draft'|'trashed'|'issued'|'paid';customer_id:string;issue_on:string;due_on:string|null;series:string;currency:'EUR'|'USD'|'GBP';number:BillingReceiptV1['number'];totals:BillingTotalsV1;overdue:boolean}>
export type BillingInvoiceV1=BillingInvoiceSummaryV1&Readonly<{lines:readonly BillingLineV1[];notes:string|null;contract_id:string|null;service_id:string|null;opportunity_id:string|null;issuer:(BillingProfileV1&{currency:'EUR'|'USD'|'GBP';default_series:string})|null;customer_fiscal:BillingProfileV1|null;issued_at:string|null;paid_at:string|null;fx:Readonly<{rate_micros:number;on:string;source:string}>|null}>
export type BillingFinancialCurrencyV1=Readonly<{currency:'EUR'|'USD'|'GBP';issued_minor:number;paid_minor:number;outstanding_minor:number;overdue_minor:number;issued_count:number;paid_count:number;outstanding_count:number;overdue_count:number}>
export type BillingReadDataV1=
 Readonly<{contract_version:'billing.v1';operation:'invoice.propose';source:'manual'|'text'|'audio';draft:BillingDraftV1;totals:BillingTotalsV1;requires_review:true;saved:false}>|
 Readonly<{contract_version:'billing.v1';operation:'invoice.get';invoice:BillingInvoiceV1}>|
 Readonly<{contract_version:'billing.v1';operation:'invoice.summary';invoice:BillingInvoiceSummaryV1}>|
 Readonly<{contract_version:'billing.v1';operation:'invoice.list';items:readonly BillingInvoiceSummaryV1[];next_id:string|null}>|
 Readonly<{contract_version:'billing.v1';operation:'invoice.financial_summary';period:'month'|'quarter'|'semester'|'year'|'all';from:string|null;to:string|null;as_of:string;currencies:readonly BillingFinancialCurrencyV1[]}>|
 Readonly<{contract_version:'billing.v1';operation:'configuration.get';issuer:Readonly<{version:number;profile:BillingProfileV1;currency:'EUR'|'USD'|'GBP';default_series:string}>|null;customer:Readonly<{version:number;profile:BillingProfileV1}>|null}>
