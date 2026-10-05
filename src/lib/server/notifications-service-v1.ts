import type {ProductUserPortV1}from './product-service-v1'
import type {ProductErrorV1}from '../contracts/product-v1'
import type {NotificationOperationV1}from '../contracts/notifications-v1'
import {NOTIFICATIONS_RPC_V1,parseNotificationInputV1,parseNotificationReceiptV1,parseNotificationListInputV1,parseNotificationListV1,parseNotificationCountV1}from './notifications-runtime-v1.ts'
import {isClosedObjectV1 as plain}from './product-work-runtime-v1.ts'
export class NotificationServiceV1{
 readonly #port:ProductUserPortV1;constructor(p:ProductUserPortV1){this.#port=p}
 async #invoke<T>(name:string,input:unknown,parse:(v:unknown)=>T|null){try{const c=await this.#port.resolve();if(!c||!['owner','admin','member'].includes(c.role))return{ok:false as const,error:'access_denied' as const};const r=await this.#port.rpc(name,{p_workspace_id:c.workspaceId,p_input:input});if(r.error)return{ok:false as const,error:(r.error.code==='42501'?'access_denied':r.error.code==='P0002'?'not_found':['40001','23505'].includes(r.error.code??'')?'conflict':['22023','22P02','23514'].includes(r.error.code??'')?'validation':'internal_safe')as ProductErrorV1};const data=parse(r.data);return data?{ok:true as const,data}:{ok:false as const,error:'internal_safe'as const}}catch{return{ok:false as const,error:'internal_safe'as const}}}
 async execute(op:NotificationOperationV1,v:unknown){const i=parseNotificationInputV1(op,v);if(!i)return{ok:false as const,error:'validation'as const};const r=await this.#invoke(NOTIFICATIONS_RPC_V1[op],i,v=>parseNotificationReceiptV1(op,i,v));return r.ok?{ok:true as const,receipt:r.data}:r}
 async list(v:unknown){const i=parseNotificationListInputV1(v);return i?this.#invoke('notification_v1_list',i,v=>parseNotificationListV1(i,v)):{ok:false as const,error:'validation'as const}}
 async count(v:unknown){return plain(v)&&Object.keys(v).length===0?this.#invoke('notification_v1_unread_count',{},parseNotificationCountV1):{ok:false as const,error:'validation'as const}}
}
