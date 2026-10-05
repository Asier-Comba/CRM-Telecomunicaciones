import type {ProductUserPortV1}from './product-service-v1'
import type {ProductErrorV1}from '../contracts/product-v1'
import type {InboxOperationV1}from '../contracts/inbox-v1'
import {INBOX_RPC_V1,parseInboxInputV1,parseInboxReceiptV1,parseInboxListInputV1,parseInboxListResultV1,parseInboxThreadInputV1,parseInboxThreadResultV1,parseInboxUnreadV1}from './inbox-runtime-v1.ts'
import {isClosedObjectV1 as plain}from './product-work-runtime-v1.ts'
const fail=(error:ProductErrorV1)=>({ok:false as const,error})
const error=(code?:string):ProductErrorV1=>code==='42501'?'access_denied':code==='P0002'?'not_found':['40001','23505'].includes(code??'')?'conflict':['22023','22P02','23514'].includes(code??'')?'validation':'internal_safe'
export class InboxServiceV1{
 readonly #port:ProductUserPortV1;constructor(p:ProductUserPortV1){this.#port=p}
 async #invoke<T>(name:string,input:unknown,parse:(v:unknown)=>T|null){try{const c=await this.#port.resolve();if(!c||!['owner','admin','member'].includes(c.role))return fail('access_denied');const r=await this.#port.rpc(name,{p_workspace_id:c.workspaceId,p_input:input});if(r.error)return fail(error(r.error.code));if(r.data===null)return fail('not_found');const data=parse(r.data);return data?{ok:true as const,data}:fail('internal_safe')}catch{return fail('internal_safe')}}
 async execute(op:InboxOperationV1,value:unknown){const i=parseInboxInputV1(op,value);if(!i)return fail('validation');const r=await this.#invoke(INBOX_RPC_V1[op],i,v=>parseInboxReceiptV1(op,i,v));return r.ok?{ok:true as const,receipt:r.data}:r}
 async list(value:unknown){const i=parseInboxListInputV1(value);return i?this.#invoke('inbox_v1_list',i,v=>parseInboxListResultV1(i,v)):fail('validation')}
 async thread(value:unknown){const i=parseInboxThreadInputV1(value);return i?this.#invoke('inbox_v1_get_thread',i,v=>parseInboxThreadResultV1(i,v)):fail('validation')}
 async unread(value:unknown){return plain(value)&&Object.keys(value).length===0?this.#invoke('inbox_v1_unread_summary',{},parseInboxUnreadV1):fail('validation')}
}
