export type EquipmentKindV1='router'|'ont'|'mobile_terminal'|'other'
export type EquipmentStatusV1='prepared'|'assigned'|'returned'|'replaced'|'cancelled'
type Command=Readonly<{command_id:string}>
type CAS=Command&Readonly<{id:string;expected_version:number;event_on:string}>
type Facts=Readonly<{manufacturer:string;model:string;commercial_description:string|null;purchased_on:string|null;commitment_id:string|null}>
export type EquipmentInputsV1={
 'equipment.create':Command&Facts&Readonly<{customer_id:string;contract_id:string|null;service_id:string|null;line_id:string|null;kind:EquipmentKindV1;assigned_on:string|null}>
 'equipment.assign':CAS
 'equipment.return':CAS
 'equipment.cancel':CAS
 'equipment.replace':CAS&Facts
 'equipment.get':Readonly<{id:string}>
 'equipment.list':Readonly<{customer_id?:string;contract_id?:string;service_id?:string;line_id?:string;kind?:EquipmentKindV1;status?:EquipmentStatusV1;source?:'manual'|'import'|'integration';limit?:number;after_id?:string}>
 'equipment.history':Readonly<{id:string;limit?:number;after_version?:number}>
}
export type EquipmentOperationV1=keyof EquipmentInputsV1
export type EquipmentReceiptV1=Readonly<{contract_version:'equipment.v1';operation:EquipmentOperationV1;command_id:string;id:string;version:number;status:EquipmentStatusV1;source:'manual';replacement_id:string|null;replacement_version:1|null}>
export type EquipmentRowV1=Facts&Readonly<{id:string;version:number;customer_id:string;contract_id:string|null;service_id:string|null;line_id:string|null;kind:EquipmentKindV1;status:EquipmentStatusV1;assigned_on:string|null;returned_on:string|null;replaced_on:string|null;cancelled_on:string|null;replaces_equipment_id:string|null;replaced_by_id:string|null;source:'manual'|'import'|'integration'}>
export type EquipmentEventV1=Readonly<{version:number;operation:'equipment.create'|'equipment.assign'|'equipment.return'|'equipment.replace'|'equipment.cancel';status:EquipmentStatusV1;event_on:string|null;related_equipment_id:string|null;actor_user_id:string;created_at:string}>
export type EquipmentReadV1=Readonly<{contract_version:'equipment.v1';operation:'equipment.get';record:EquipmentRowV1}>|Readonly<{contract_version:'equipment.v1';operation:'equipment.list';items:readonly EquipmentRowV1[];next_id:string|null}>|Readonly<{contract_version:'equipment.v1';operation:'equipment.history';id:string;items:readonly EquipmentEventV1[];next_version:number|null}>
