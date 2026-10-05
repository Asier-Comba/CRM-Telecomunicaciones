export type ImportJobStatusV1='uploaded'|'mapping'|'validating'|'ready'|'applying'|'completed'|'failed'|'cancelled'
export type ImportJobRecordV1=Readonly<{id:string;version:number;kind:string;status:ImportJobStatusV1;total_rows:number;valid_rows:number;invalid_rows:number;applied_rows:number;failed_rows:number;checkpoint:number|null;failure_code:string|null;can_cancel:boolean;processing_status:'blocked_encrypted_staging_adapter'}>
export type ImportJobCancelInputV1=Readonly<{command_id:string;id:string;expected_version:number}>
export type ImportJobReceiptV1=Readonly<{contract_version:'importjob.v1';operation:'importjob.cancel';command_id:string;id:string;version:number;status:'cancelled'}>
export type ImportJobListInputV1=Readonly<{limit?:number;after_id?:string;status?:ImportJobStatusV1}>
