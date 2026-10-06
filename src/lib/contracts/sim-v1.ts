export type SimStatusV1='prepared'|'assigned'|'active'|'replaced'|'inactive'|'cancelled'
type Command=Readonly<{command_id:string}>
type Edit=Command&Readonly<{id:string;expected_version:number}>
type LineEdit=Edit&Readonly<{expected_line_version:number}>
export interface SimInputsV1{
 'sim.create':Command&Readonly<{customer_id:string;operator_id:string;kind:'physical'|'esim';display_label:string}>
 'sim.assign':LineEdit&Readonly<{line_id:string}>
 'sim.activate':LineEdit&Readonly<{evidence_source:'manual';provider_confirmation:'confirmed_active'}>
 'sim.replace':LineEdit&Readonly<{replacement_sim_id:string;expected_replacement_version:number;replacement_status:'assigned'|'active';evidence_source:'manual';provider_confirmation:'confirmed_active'|'not_recorded'}>
 'sim.deactivate':LineEdit&Readonly<{evidence_source:'manual'}>
 'sim.cancel':Edit
 'sim.list':Readonly<{limit?:number;after_id?:string;customer_id?:string;operator_id?:string;line_id?:string;kind?:'physical'|'esim';status?:SimStatusV1;source?:'manual'|'import'|'integration'}>
 'sim.get':Readonly<{id:string}>
 'sim.history':Readonly<{line_id:string;limit?:number;after_id?:string}>
}
export type SimOperationV1=keyof SimInputsV1
export type SimRowV1=Readonly<{id:string;version:number;customer_id:string;operator_id:string;kind:'physical'|'esim';display_label:string;status:SimStatusV1;source:'manual'|'import'|'integration';masked_iccid:string|null;masked_eid:string|null;assigned_line_id:string|null;activated_at:string|null;replaced_at:string|null;deactivated_at:string|null;cancelled_at:string|null;created_at:string;updated_at:string}>
export type SimAssociationV1=Readonly<{id:string;sim_id:string;line_id:string;kind:'physical'|'esim';masked_iccid:string;masked_eid:string|null;status:'assigned'|'active'|'replaced'|'inactive';assigned_at:string;activated_at:string|null;ended_at:string|null;replacement_sim_id:string|null}>
export type SimReceiptV1=Readonly<{contract_version:'sim.v1';operation:Exclude<SimOperationV1,'sim.list'|'sim.get'|'sim.history'>;command_id:string;id:string;version:number;status:SimStatusV1;source:'manual';association_id:string|null;replacement_id:string|null;replacement_version:number|null;replacement_status:'assigned'|'active'|null;replacement_association_id:string|null}>
export type SimPageV1=Readonly<{contract_version:'sim.v1';operation:'sim.list';items:readonly SimRowV1[];next_id:string|null}>
export type SimGetV1=Readonly<{contract_version:'sim.v1';operation:'sim.get';record:SimRowV1}>
export type SimHistoryV1=Readonly<{contract_version:'sim.v1';operation:'sim.history';line_id:string;items:readonly SimAssociationV1[];next_id:string|null}>
