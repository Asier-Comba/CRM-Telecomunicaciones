export type ProvenanceKindV1='customer'|'contact'|'opportunity'|'contract'|'service'|'line'|'renewal'|'permanence'
export type ProvenanceInputV1=Readonly<{kind:ProvenanceKindV1;id:string}>
export type ProvenanceResultV1=Readonly<{contract_version:'provenance.v1';operation:'provenance.get';kind:ProvenanceKindV1;id:string;declared_source:'manual'|'import'|'integration'|'unrecorded';confidence:'verified_new_manual'|'declared_legacy_manual'|'declared_external'|'unverified_legacy';verified_at:string|null}>
