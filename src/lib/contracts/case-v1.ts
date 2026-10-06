export type CaseTypeV1='activation'|'portability'|'technical'|'billing'|'renewal'|'cancellation'|'documentation'|'other'
export type CaseStatusV1='open'|'in_progress'|'waiting_customer'|'waiting_operator'|'resolved'|'closed'|'cancelled'
export type CasePriorityV1='low'|'normal'|'high'|'urgent'
export type CaseResolutionV1='issue_fixed'|'request_fulfilled'|'customer_confirmed'|'no_action_required'
export type CaseCancellationV1='customer_withdrew'|'duplicate'|'no_longer_needed'|'entered_in_error'
type Command=Readonly<{command_id:string}>
type Edit=Command&Readonly<{id:string;expected_version:number}>
type Details=Readonly<{case_type:CaseTypeV1;title:string;priority:CasePriorityV1;due_on:string|null}>
export interface CaseInputsV1{
 'case.create':Command&Details&Readonly<{customer_id:string;contract_id:string|null;service_id:string|null;line_id:string|null;assigned_user_id:string|null}>
 'case.update':Edit&Details
 'case.assign':Edit&Readonly<{assigned_user_id:string|null}>
 'case.change_status':Edit&Readonly<{status:'open'|'in_progress'|'waiting_customer'|'waiting_operator'}>
 'case.resolve':Edit&Readonly<{resolution_code:CaseResolutionV1}>
 'case.reopen':Edit
 'case.close':Edit
 'case.cancel':Edit&Readonly<{cancellation_code:CaseCancellationV1}>
 'case.note_create':Edit&Readonly<{body:string}>
 'case.get':Readonly<{id:string}>
 'case.list':Readonly<{limit?:number;after_id?:string;customer_id?:string;contract_id?:string;service_id?:string;line_id?:string;assigned_user_id?:string;case_type?:CaseTypeV1;priority?:CasePriorityV1;status?:CaseStatusV1;source?:'manual'|'import'|'integration'|'system';due_from?:string;due_to?:string;overdue?:boolean}>
 'case.note_list':Readonly<{id:string;limit?:number;after_seq?:number}>
}
export type CaseOperationV1=keyof CaseInputsV1
export type CaseRowV1=Readonly<{id:string;version:number;customer_id:string;contract_id:string|null;service_id:string|null;line_id:string|null;case_type:CaseTypeV1;title:string;priority:CasePriorityV1;due_on:string|null;assigned_user_id:string|null;status:CaseStatusV1;source:'manual'|'import'|'integration'|'system';resolved_at:string|null;closed_at:string|null;resolution_code:CaseResolutionV1|null;cancellation_code:CaseCancellationV1|null;internal_note_count:number;created_at:string;updated_at:string;overdue:boolean}>
export type CaseReceiptV1=Readonly<{contract_version:'case.v1';operation:Exclude<CaseOperationV1,'case.get'|'case.list'|'case.note_list'>;command_id:string;id:string;version:number;status:CaseStatusV1;source:CaseRowV1['source'];resolution_code:CaseResolutionV1|null;cancellation_code:CaseCancellationV1|null;note_id:string|null;note_seq:number|null}>
export type CasePageV1=Readonly<{contract_version:'case.v1';operation:'case.list';items:readonly CaseRowV1[];next_id:string|null}>
export type CaseGetV1=Readonly<{contract_version:'case.v1';operation:'case.get';record:CaseRowV1}>
export type CaseNoteV1=Readonly<{id:string;seq:number;body:string;actor_user_id:string;created_at:string}>
export type CaseNotePageV1=Readonly<{contract_version:'case.v1';operation:'case.note_list';case_id:string;items:readonly CaseNoteV1[];next_seq:number|null}>
