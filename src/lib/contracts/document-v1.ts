export type DocumentTargetKindV1='customer'|'contract'|'service'|'line'|'service_case'|'opportunity'
export type DocumentInputsV1={
 'document.archive':{command_id:string;id:string;expected_version:number}
 'document.restore':{command_id:string;id:string;expected_version:number}
}
export type DocumentOperationV1=keyof DocumentInputsV1
export type DocumentReceiptV1={contract_version:'document.v1';operation:DocumentOperationV1;command_id:string;id:string;version:number;status:'active'|'archived'}
/** No object path, file name, digest, URL or content capability. */
export type DocumentMetadataV1={id:string;version:number;status:'active'|'archived';document_kind:'general'|'identity'|'contract'|'service'|'incident'|'billing'|'other';media_type:string|null;size_bytes:number|null;target:{kind:DocumentTargetKindV1;id:string}}
export type DocumentListInputV1={target_kind:DocumentTargetKindV1;target_id:string;status?:'active'|'archived';limit?:number;after_id?:string}
export type DocumentListV1={contract_version:'document.v1';operation:'document.list';items:readonly DocumentMetadataV1[];next_id:string|null}
export type DocumentGetInputV1={id:string}
export type DocumentGetV1={contract_version:'document.v1';operation:'document.get_metadata';record:DocumentMetadataV1}
