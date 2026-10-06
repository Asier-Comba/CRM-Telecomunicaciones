export type InboxOperationV1='conversation.create_internal'|'message.add_internal_note'|'conversation.assign'|'conversation.link_customer'|'conversation.close'|'conversation.reopen'|'conversation.archive'|'conversation.restore'|'conversation.mark_read'|'conversation.mark_unread'
export type InboxStatusV1='open'|'closed'|'archived'
export type InboxRecordV1=Readonly<{id:string;version:number;status:InboxStatusV1;channel:'internal';source:'manual_internal';assigned_user_id:string|null;customer_id:string|null;contact_id:string|null;last_seq:number;created_at:string;updated_at:string;read_version:number;unread:boolean}>
export type InboxMessageV1=Readonly<{id:string;seq:number;kind:'internal_note';body:string;actor_user_id:string;created_at:string}>
export type InboxInputV1=Readonly<Record<string,unknown>&{command_id:string;id?:string;expected_version?:number}>
export type InboxReceiptV1=Readonly<{contract_version:'inbox.v1';operation:InboxOperationV1;command_id:string;id:string;version:number;status:InboxStatusV1|'read'|'unread'}>
export type InboxListInputV1=Readonly<{limit?:number;after_id?:string;status?:InboxStatusV1}>
export type InboxThreadInputV1=Readonly<{id:string;limit?:number;after_seq?:number}>
