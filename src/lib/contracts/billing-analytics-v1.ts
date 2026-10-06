export type BillingAnalyticsOperationV1='billing.monthly_series'|'billing.top_customers'
export type BillingAnalyticsInputV1=Readonly<{currency:'EUR'|'USD'|'GBP';from_month:string;to_month:string;customer_id?:string;limit?:number}>
export type BillingAnalyticsAmountsV1=Readonly<{issued_minor:string;paid_minor:string;outstanding_minor:string;overdue_minor:string}>
export type BillingAnalyticsRowV1=BillingAnalyticsAmountsV1&(Readonly<{month:string}>|Readonly<{customer_id:string}>)
export type BillingAnalyticsResultV1=Readonly<{contract_version:'billing.analytics.v1';operation:BillingAnalyticsOperationV1;basis:'issue_month_cohort_current_status';as_of:string;currency:'EUR'|'USD'|'GBP';from_month:string;to_month:string;items:readonly BillingAnalyticsRowV1[]}>
