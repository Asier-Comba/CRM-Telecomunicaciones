export type DocumentContentInputsV1={
 'document.request_upload':{command_id:string;target_kind:'customer'|'contract'|'service'|'line'|'service_case'|'opportunity';target_id:string;document_kind:'general'|'identity'|'contract'|'service'|'incident'|'billing'|'other';media_type:'application/pdf'|'image/png'|'image/jpeg';size_bytes:number;file_name:string}
 'document.finalize_upload':{command_id:string;id:string;expected_version:number}
 'document.request_download':{command_id:string;id:string;expected_version:number}
}
export type DocumentContentOperationV1=keyof DocumentContentInputsV1
export type DocumentContentReceiptV1={contract_version:'document.content.v1';operation:DocumentContentOperationV1;command_id:string;id:string;version:number;status:'pending'|'active';expires_at?:string;ticket_id?:string}
/** Server port descriptor contains UUID references, never a caller path/URL. */
export type DocumentContentManifestV1={id:string;object_ref:string;media_type:'application/pdf'|'image/png'|'image/jpeg';size_bytes:number;expires_at:string;sha256?:string|null}
export type DocumentDownloadInputV1={id:string;ticket_id:string}
