export const EXTERNAL_IDENTITY_PROVIDERS_V1=['generic.telecom.v1','generic.crm.v1','local.import.v1'] as const
export const EXTERNAL_IDENTITY_KINDS_V1=['customer','contact','operator','plan','plan_version','contract','service','line','renewal','permanence','sim','portability','case','service_location','equipment'] as const
export type ExternalIdentityKindV1=typeof EXTERNAL_IDENTITY_KINDS_V1[number]
export type ExternalIdentityProviderV1=typeof EXTERNAL_IDENTITY_PROVIDERS_V1[number]
type Command=Readonly<{command_id:string}>
type Page=Readonly<{limit?:number;after_id?:string}>
export interface ExternalIdentityInputsV1 {
 'external_identity.integration_register':Command&Readonly<{integration_key:string;provider_code:ExternalIdentityProviderV1;display_name:string;source:'import'|'integration'}>
 'external_identity.bind':Command&Readonly<{integration_id:string;external_kind:string;external_id:string;local_entity_kind:ExternalIdentityKindV1;local_entity_id:string}>
 'external_identity.retire':Command&Readonly<{id:string;expected_version:number}>
 'external_identity.list':Page&Readonly<{local_entity_kind:ExternalIdentityKindV1;local_entity_id:string;integration_id?:string;status?:'active'|'retired'}>
 'external_identity.integration_list':Page
}
export type ExternalIdentityOperationV1=keyof ExternalIdentityInputsV1
export type ExternalIdentityReceiptV1=Readonly<{contract_version:'external_identity.v1';operation:ExternalIdentityOperationV1;command_id:string;id:string;version:number;status:'active'|'retired';external_effect:'disabled'}>
export type ExternalIntegrationRowV1=Readonly<{id:string;integration_key:string;provider_code:ExternalIdentityProviderV1;display_name:string;source:'import'|'integration';status:'active';version:1;created_at:string;external_effect:'disabled'}>
export type ExternalIdentityRowV1=Readonly<{id:string;integration_id:string;external_kind:string;external_id:string;local_entity_kind:ExternalIdentityKindV1;local_entity_id:string;source:'import'|'integration';status:'active'|'retired';version:number;created_at:string;updated_at:string;retired_at:string|null}>
export type ExternalIdentityReadV1=Readonly<{contract_version:'external_identity.v1';operation:'external_identity.integration_list';items:readonly ExternalIntegrationRowV1[];next_id:string|null}>|Readonly<{contract_version:'external_identity.v1';operation:'external_identity.list';items:readonly ExternalIdentityRowV1[];next_id:string|null}>
