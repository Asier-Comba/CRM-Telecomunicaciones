export type SensitiveInputV1=Readonly<{entity_kind:'contact'|'customer';entity_id:string;fields:readonly('email'|'phone'|'fiscal_id')[]}>
export type SensitiveResultV1=Readonly<{contract_version:'sensitive.v1';operation:'sensitive.get';entity_kind:'contact'|'customer';entity_id:string;values:Readonly<Partial<Record<'email'|'phone'|'fiscal_id',string|null>>>}>
