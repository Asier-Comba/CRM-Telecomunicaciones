export type DocumentMaintenanceOperationV1='document.verify_content'|'document.cleanup_claim'|'document.cleanup_finish'|'document.expired_list'
export type DocumentMaintenanceInputV1=Readonly<{command_id:string;id:string;expected_version:number;ticket_id?:string}>
export type DocumentMaintenanceReceiptV1=Readonly<{contract_version:'document.integrity.v1'|'document.cleanup.v1';operation:DocumentMaintenanceOperationV1;command_id:string;id:string;version:number;status:'active'|'pending'|'archived';integrity?:'verified_sha256';scan_status?:'not_scanned'}>
