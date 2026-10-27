import type {DocumentMetadataV1,DocumentTargetKindV1} from './document-v1'

/** Metadata only. No original filename, object reference, path, URL or byte capability. */
export type DocumentLibraryInputV2={
 status?:'active'|'archived';query?:string;customer_id?:string
 target?:{kind:DocumentTargetKindV1;id:string}
 document_kind?:DocumentMetadataV1['document_kind'];format?:'pdf'|'image'
 created_from?:string;created_before?:string;sort?:'created_desc'|'created_asc';limit?:number;cursor?:string
}
export type DocumentLibraryEntryV2={
 id:string;version:number;status:'active'|'archived';document_kind:DocumentMetadataV1['document_kind']
 display_title:string|null;title_state:'available'|'restricted'|'not_provided'
 media_type:string|null;size_bytes:number|null;created_at:string
 context:{target:{kind:DocumentTargetKindV1;id:string;label:string};customer:{id:string;label:string}|null}
}
export type DocumentLibraryPageV2={
 contract_version:'document.library.v2';operation:'document.library_list';items:readonly DocumentLibraryEntryV2[]
 next_cursor:string|null;completeness:'complete'|'partial';total_count:number|null;count_state:'exact'|'unavailable'
 capabilities:{search_fields:readonly ['title','reference','customer_label','category'];sort_fields:readonly ['created_asc','created_desc'];private_content:false;folders:false;file_name:false;consistency:'live_reauthorized_creation_cutoff'}
}
