export type DashboardInputV2={audience?:'my'|'workspace'|'team';period?:'month'|'quarter'|'semester'|'year'|'all';anchor_date?:string}
export type DashboardV2={
 contract_version:'product.dashboard.v2';audience:'my'|'workspace';period:{kind:NonNullable<DashboardInputV2['period']>;start:string|null;end_exclusive:string|null}
 snapshot_counts:Readonly<Record<'customers'|'contracts'|'services'|'lines'|'opportunities'|'tasks'|'meetings'|'renewals'|'permanences',number>>
 period_counts:Readonly<Record<'customers_created'|'tasks_due'|'meetings_scheduled'|'renewals_due'|'permanences_due'|'opportunities_closed',number>>
 recent_activity:readonly {id:string;activity_kind:'created'|'updated'|'contacted'|'status_changed'|'system';summary_code:string;occurred_at:string;customer_id:string|null}[]
 financial:null;financial_status:'unavailable'
}
export type GlobalSearchInputV1={query:string;limit?:number}
export type GlobalSearchV1={contract_version:'product.v1';items:readonly {kind:'customer'|'contact'|'contract'|'service'|'line'|'opportunity';id:string;customer_id:string;label:string;status:string}[]}
