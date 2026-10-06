type CAS=Readonly<{command_id:string;service_id:string;expected_service_version:number}>
export type ServiceCommercialInputsV1={
 'service.installation_set':CAS&Readonly<{expected_details_version:number;site_label:string|null;location_id:string|null;installation_contact_id:string|null;activation_target_on:string|null}>
 'service.addon_assign':CAS&Readonly<{component_position:number;quantity:number;valid_from:string;valid_until:string|null}>
 'service.addon_end':CAS&Readonly<{id:string;expected_version:number;ended_on:string}>
 'service.installation_get':Readonly<{service_id:string}>
 'service.addon_list':Readonly<{service_id:string;limit?:number;after_id?:string}>
}
export type ServiceCommercialOperationV1=keyof ServiceCommercialInputsV1
export type ServiceCommercialReceiptV1=Readonly<{contract_version:'telecom.service_commercial.v1';operation:'service.installation_set'|'service.addon_assign'|'service.addon_end';command_id:string;id:string;service_id:string;service_version:number;version:number;status:'recorded'|'assigned'|'ended'}>
export type ServiceInstallationV1=Readonly<{contract_version:'telecom.service_commercial.v1';operation:'service.installation_get';service_id:string;service_version:number;service_kind:'mobile'|'fiber'|'fixed_voice'|'data_connectivity'|'other';source:'manual'|'import'|'integration';plan_version_id:string|null;activated_on:string|null;ended_on:string|null;installation:Readonly<{version:number;site_label:string|null;location_id:string|null;installation_contact_id:string|null;activation_target_on:string|null;source:'manual'|'import'|'integration'}>|null}>
export type ServiceAddonRowV1=Readonly<{id:string;version:number;service_id:string;plan_version_id:string;component_position:number;addon_code:'extra_data'|'international_calling'|'roaming'|'static_ip'|'device_financing';quantity:number;valid_from:string;valid_until:string|null;ended_on:string|null;source:'manual'|'import'|'integration';timing_state:'planned'|'current'|'expired'|'ended'}>
export type ServiceAddonPageV1=Readonly<{contract_version:'telecom.service_commercial.v1';operation:'service.addon_list';service_id:string;as_of:string;items:readonly ServiceAddonRowV1[];next_id:string|null}>
