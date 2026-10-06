export type IdentifierEntityKindV1='line'|'service'|'contract'|'sim'
export type IdentifierKindV1='msisdn'|'circuit_reference'|'provider_account_reference'|'provider_contract_reference'|'iccid'|'eid'
export type IdentifierOperationV1='identifier.create_manual'|'identifier.retire'|'identifier.list'|'identifier.get'
export type IdentifierInputV1=Readonly<{command_id?:string;entity_kind?:IdentifierEntityKindV1;entity_id?:string;identifier_kind?:IdentifierKindV1;canonical_value?:string;id?:string;expected_version?:number;limit?:number;after_id?:string;status?:'active'|'retired'}>
export type IdentifierRowV1=Readonly<{id:string;entity_kind:IdentifierEntityKindV1;entity_id:string;identifier_kind:IdentifierKindV1;masked_display:string;status:'active'|'retired';source:'manual'|'import'|'integration';valid_from:string;valid_until:string|null;version:number}>
export type IdentifierReceiptV1=Readonly<{contract_version:'identifiers.v1';operation:'identifier.create_manual'|'identifier.retire';command_id:string;id:string;version:number;status:'active'|'retired'}>
