export type CatalogOperationV1='operator.create'|'operator.update'|'operator.activate'|'operator.deactivate'|'plan.create'|'plan.update_metadata'|'plan.change_status'|'plan_version.create'|'plan_version.terms_get'
export type CatalogInputV1=Readonly<Record<string,unknown>>
export type CatalogEntitlementV1=Readonly<{code:CatalogEntitlementCodeV1;component_position:number|null;integer_value:string|null;boolean_value:boolean|null;text_value:string|null}>
export type CatalogComponentV1=Readonly<{component_kind:'base'|'add_on';service_kind:'mobile'|'fiber'|'fixed_voice'|'data_connectivity'|'other';addon_code:CatalogAddonCodeV1|null;quantity:number}>
export type CatalogEntitlementCodeV1='data_mib'|'unlimited_data'|'voice_minutes'|'unlimited_voice'|'sms_count'|'unlimited_sms'|'download_mbps'|'upload_mbps'|'access_technology'|'roaming_zone'|'commitment_months'|'promotion_months'
export type CatalogAddonCodeV1='extra_data'|'international_calling'|'roaming'|'static_ip'|'device_financing'
export type CatalogServiceKindV1='mobile'|'fiber'|'fixed_voice'|'data_connectivity'|'other'
export interface CatalogInputMapV1{
 'operator.create':Readonly<{command_id:string;code:string;display_name:string}>
 'operator.update':Readonly<{command_id:string;id:string;expected_version:number;display_name:string}>
 'operator.activate':Readonly<{command_id:string;id:string;expected_version:number}>
 'operator.deactivate':Readonly<{command_id:string;id:string;expected_version:number}>
 'plan.create':Readonly<{command_id:string;operator_id:string;code:string;display_name:string;service_kind:CatalogServiceKindV1}>
 'plan.update_metadata':Readonly<{command_id:string;id:string;expected_version:number;display_name:string}>
 'plan.change_status':Readonly<{command_id:string;id:string;expected_version:number;status:'active'|'retired'}>
 'plan_version.create':Readonly<{command_id:string;plan_id:string;expected_version:number;valid_from:string;valid_until:string|null;currency:string;recurring_amount_minor:string;one_time_amount_minor:string;is_bundle:boolean;components:readonly CatalogComponentV1[];entitlements:readonly CatalogEntitlementV1[]}>
 'plan_version.terms_get':Readonly<{id:string}>
}
export type CatalogReceiptV1=Readonly<{contract_version:'catalog.v1';operation:Exclude<CatalogOperationV1,'plan_version.terms_get'>;command_id:string;id:string;version:number;status:'active'|'inactive'|'retired'|'published';plan_id?:string;parent_version?:number;version_number?:number}>
export type CatalogTermsV1=Readonly<{id:string;plan_id:string;version_number:number;terms_status:'published'|'unrecorded';currency:string;recurring_period:'month'|null;valid_from:string;valid_until:string|null;recurring_amount_minor:string|null;one_time_amount_minor:string|null;is_bundle:boolean|null;components:readonly(CatalogComponentV1&{position:number})[];entitlements:readonly(CatalogEntitlementV1&{value_kind:'integer'|'boolean'|'text';unit:'MiB'|'minutes'|'messages'|'Mbps'|'months'|null})[]}>
