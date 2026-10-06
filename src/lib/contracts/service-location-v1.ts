export type ServiceLocationInputsV1={
 'service_location.create':Readonly<{command_id:string;customer_id:string;label:string;address_line1:string;address_line2:string|null;postal_code:string;city:string;region:string|null;country:string}>
 'service_location.assign':Readonly<{command_id:string;service_id:string;location_id:string|null;expected_service_version:number;expected_details_version:number}>
 'service_location.get':Readonly<{id:string}>
 'service_location.list':Readonly<{customer_id:string;limit?:number;after_id?:string}>
}
export type ServiceLocationOperationV1=keyof ServiceLocationInputsV1
export type ServiceLocationRowV1=Readonly<{id:string;customer_id:string;version:1;label:string;country:string;source:'manual'|'import'|'integration'}>
export type ServiceLocationReceiptV1=Readonly<{contract_version:'service_location.v1';operation:'service_location.create'|'service_location.assign';command_id:string;id:string;customer_id:string;service_id:string|null;service_version:number|null;version:number;status:'created'|'assigned'}>
export type ServiceLocationReadV1=Readonly<{contract_version:'service_location.v1';operation:'service_location.get';record:ServiceLocationRowV1}>|Readonly<{contract_version:'service_location.v1';operation:'service_location.list';items:readonly ServiceLocationRowV1[];next_id:string|null}>
