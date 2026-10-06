export type TelecomReadOperationV1 =
'customer360.summary' | 'report.operator_portfolio' | 'report.services_by_kind' | 'report.lines_by_status' | 'report.renewals_by_month' | 'report.permanences_by_month' | 'report.portabilities_by_status' | 'report.cases_by_priority_status' | 'report.pipeline_by_stage' | 'report.commercial_owner_counts'
export type TelecomReadInputsV1 = {
'customer360.summary': Readonly<{customer_id: string}>
'report.operator_portfolio': Readonly<{customer_id?: string;operator_id?: string;after_id?: string;limit?: number}>
'report.services_by_kind': Readonly<{customer_id?: string;operator_id?: string}>
'report.lines_by_status': Readonly<{customer_id?: string;operator_id?: string}>
'report.renewals_by_month': Readonly<{customer_id?: string;from_month: string;to_month: string}>
'report.permanences_by_month': Readonly<{customer_id?: string;from_month: string;to_month: string}>
'report.portabilities_by_status': Readonly<{customer_id?: string}>
'report.cases_by_priority_status': Readonly<{customer_id?: string}>
'report.pipeline_by_stage': Readonly<{customer_id?: string;owner_user_id?: string;stage_id?: string;after_id?: string;limit?: number}>
'report.commercial_owner_counts': Readonly<{customer_id?: string;owner_user_id?: string;after_id?: string;limit?: number}>
}
export type TelecomReadRowsV1 = {
'customer360.summary': Readonly<{customer_id: string;contacts: number;contracts: number;services: number;lines: number;renewals: number;permanences: number;opportunities: number;tasks: number;meetings: number;cases: number;documents: number | null;billing: number | null;activity: number;portabilities: number;sims: number}>
'report.operator_portfolio': Readonly<{id: string;customers: number;contracts: number;services: number;lines: number}>
'report.services_by_kind': Readonly<{service_kind: 'mobile' | 'fiber' | 'fixed_voice' | 'data_connectivity' | 'other';pending: number;active: number;suspended: number;ended: number;cancelled: number}>
'report.lines_by_status': Readonly<{status: 'pending' | 'active' | 'suspended' | 'ended' | 'cancelled';count: number}>
'report.renewals_by_month': Readonly<{month: string;open: number;completed: number;dismissed: number;not_applicable: number}>
'report.permanences_by_month': Readonly<{month: string;open: number;cancelled: number}>
'report.portabilities_by_status': Readonly<{status: 'draft' | 'requested' | 'scheduled' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';count: number}>
'report.cases_by_priority_status': Readonly<{priority: 'low' | 'normal' | 'high' | 'urgent';status: 'open' | 'in_progress' | 'waiting_customer' | 'waiting_operator' | 'resolved' | 'closed' | 'cancelled';count: number}>
'report.pipeline_by_stage': Readonly<{id: string;open: number;won: number;lost: number;cancelled: number}>
'report.commercial_owner_counts': Readonly<{id: string;contracts: number;opportunities: number;tasks: number;cases: number}>
}
export type TelecomReadResultV1<O extends TelecomReadOperationV1> = Readonly<{contract_version:"telecom.reads.v1";operation:O;as_of:string}> & (O extends "customer360.summary" ? Readonly<{record:TelecomReadRowsV1[O]}> : Readonly<{items:readonly TelecomReadRowsV1[O][];next_id:string|null}>) & (O extends "report.commercial_owner_counts" ? Readonly<{unassigned_counts:Readonly<{contracts:number;opportunities:number;tasks:number;cases:number}>}> : object)
