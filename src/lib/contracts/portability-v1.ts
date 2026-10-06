type Command=Readonly<{command_id:string}>
type Edit=Command&Readonly<{id:string;expected_version:number}>
export type PortabilityStatusV1='draft'|'requested'|'scheduled'|'in_progress'|'completed'|'rejected'|'cancelled'
export type PortabilityReasonV1='subscriber_mismatch'|'number_not_found'|'authorization_missing'|'ineligible_contract'|'donor_rejected'|'technical_failure'|'customer_withdrew'|'duplicate_request'
export interface PortabilityInputsV1{
 'portability.create':Command&Readonly<{line_id:string;number_identifier_id:string;direction:'inbound'|'outbound';donor_operator_id:string;target_operator_id:string;requested_on:string;owner_user_id:string|null}>
 'portability.update_draft':Edit&Readonly<{donor_operator_id:string;target_operator_id:string;requested_on:string}>
 'portability.assign':Edit&Readonly<{owner_user_id:string|null}>
 'portability.transition':Edit&Readonly<{status:'requested'|'scheduled'|'in_progress'|'rejected'|'cancelled';effective_on:string;reason_code:PortabilityReasonV1|null;evidence_source:'manual'}>
 'portability.complete':Edit&Readonly<{completed_on:string;evidence_source:'manual';provider_outcome:'confirmed_completed';line_action:'none'|'activate'|'end';expected_line_version:number|null}>
 'portability.get':Readonly<{id:string}>
 'portability.list':Readonly<{limit?:number;after_id?:string;customer_id?:string;contract_id?:string;service_id?:string;line_id?:string;owner_user_id?:string;operator_id?:string;status?:PortabilityStatusV1;source?:'manual'|'import'|'integration';direction?:'inbound'|'outbound';window_from?:string;window_to?:string}>
}
export type PortabilityOperationV1=keyof PortabilityInputsV1
export type PortabilityRowV1=Readonly<{id:string;version:number;customer_id:string;contract_id:string;service_id:string;line_id:string;number_identifier_id:string;masked_display:string;direction:'inbound'|'outbound';donor_operator_id:string;target_operator_id:string;requested_on:string;submitted_on:string|null;scheduled_on:string|null;started_on:string|null;completed_on:string|null;closed_on:string|null;status:PortabilityStatusV1;reason_code:PortabilityReasonV1|null;owner_user_id:string|null;source:'manual'|'import'|'integration';created_at:string;updated_at:string}>
export type PortabilityReceiptV1=Readonly<{contract_version:'portability.v1';operation:Exclude<PortabilityOperationV1,'portability.list'|'portability.get'>;command_id:string;id:string;version:number;status:PortabilityStatusV1;source:'manual'|'import'|'integration';line_effect:null|Readonly<{line_id:string;version:number;status:'active'|'ended'}>}>

export type PortabilityPageV1=Readonly<{contract_version:'portability.v1';operation:'portability.list';items:readonly PortabilityRowV1[];next_id:string|null}>
export type PortabilityGetV1=Readonly<{contract_version:'portability.v1';operation:'portability.get';record:PortabilityRowV1}>
