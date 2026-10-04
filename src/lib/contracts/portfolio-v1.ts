/** Human application operations; never assistant tools or provider side effects. */
type Command={command_id:string}
type Edit=Command&{id:string;expected_version:number}
export type PortfolioKindV1='contract'|'service'|'line'|'renewal'|'permanence'
export type PortfolioSourceV1='manual'|'import'|'integration'
export type PortfolioStatusV1='draft'|'pending'|'active'|'suspended'|'ended'|'cancelled'|'open'|'completed'|'dismissed'|'not_applicable'
export type PortfolioInputsV1={
 'contract.record_renewal':Command&{contract_id:string;target_on:string;opens_on:string|null;closes_on:string|null}
 'renewal.update':Edit&{target_on:string;opens_on:string|null;closes_on:string|null}
 'renewal.resolve':Edit&{reason_code:string}
 'renewal.dismiss':Edit&{reason_code:string}
 'permanence.create_manual':Command&{contract_id:string;service_id?:string|null;commitment_kind:'minimum_term'|'device'|'subsidy'|'discount'|'other';starts_on:string;ends_on:string;reason_code:string}
 'permanence.update':Edit&{starts_on:string;ends_on:string;reason_code:string}
 'permanence.cancel':Edit&{reason_code:string}
 'contract.create_manual':Command&{customer_id:string;operator_id:string;start_date:string;plan_version_id?:string|null;assigned_user_id?:string|null}
 'contract.update_allowed_metadata':Edit&{assigned_user_id:string|null}
 'contract.activate':Edit&{signed_date:string}
 'contract.cancel':Edit
 'service.create_manual':Command&{contract_id:string;service_kind:'mobile'|'fiber'|'fixed_voice'|'data_connectivity'|'other';display_name:string;plan_version_id?:string|null}
 'service.update_label':Edit&{display_name:string}
 'service.transition':Edit&{status:'active'|'suspended'|'ended'|'cancelled';effective_on:string}
 'line.create_manual':Command&{service_id:string;display_name:string}
 'line.update_label':Edit&{display_name:string}
 'line.transition':Edit&{status:'active'|'suspended'|'ended'|'cancelled';effective_on:string}
}
export type PortfolioOperationV1=keyof PortfolioInputsV1
export type PortfolioReceiptV1={contract_version:'portfolio.v1';operation:PortfolioOperationV1;command_id:string;id:string;version:number;status:PortfolioStatusV1;source:PortfolioSourceV1}
type Base={id:string;version:number;status:PortfolioStatusV1;source:PortfolioSourceV1}
export type PortfolioGetInputV1={kind:PortfolioKindV1;id:string}
export type PortfolioGetV1={contract_version:'portfolio.v1'}&(
 {kind:'renewal';record:Base&{contract_id:string;target_on:string;opens_on:string|null;closes_on:string|null;reason_code:string|null}}|
 {kind:'permanence';record:Base&{contract_id:string;service_id:string|null;commitment_kind:string;starts_on:string;ends_on:string;reason_code:string}}|
 {kind:'contract';record:Base&{customer_id:string;operator_id:string;plan_version_id:string|null;start_date:string;signed_date:string|null;end_date:string|null;assigned_user_id:string|null}}|
 {kind:'service';record:Base&{customer_id:string;contract_id:string;operator_id:string;plan_version_id:string|null;service_kind:string;display_name:string;activated_on:string|null;ended_on:string|null;status_effective_on:string|null}}|
 {kind:'line';record:Base&{service_id:string;display_name:string|null;activated_on:string|null;ended_on:string|null;status_effective_on:string|null}}
)
