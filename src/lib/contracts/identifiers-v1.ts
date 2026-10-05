export type IdentifierEntityKindV1='line'|'service'|'contract'
export type IdentifierKindV1='msisdn'|'circuit_reference'|'provider_account_reference'|'provider_contract_reference'
export type IdentifierOperationV1='identifier.create_manual'|'identifier.retire'|'identifier.list'|'identifier.get'
export type IdentifierInputV1=Readonly<{command_id?:string;entity_kind?:IdentifierEntityKindV1;entity_id?:string;identifier_kind?:IdentifierKindV1;canonical_value?:string;id?:string;expected_version?:number;limit?:number;after_id?:string;status?:'active'|'retired'}>
export type IdentifierRowV1=Readonly<{id:string;entity_kind:IdentifierEntityKindV1;entity_id:string;identifier_kind:IdentifierKindV1;masked_display:string;status:'active'|'retired';source:'manual'|'import'|'integration';valid_from:string;valid_until:string|null;version:number}>
