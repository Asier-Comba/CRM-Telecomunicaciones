import type {ProductUserPortV1}from './product-service-v1'
import type {ProductErrorV1}from '../contracts/product-v1'
import type {AutomationOperationV1}from '../contracts/automations-v1'
import {AUTOMATIONS_RPC_V1,parseAutomationInputV1,parseAutomationReceiptV1,parseAutomationReadInputV1,parseAutomationReadV1}from './automations-runtime-v1.ts'
export class AutomationServiceV1{
 readonly #port:ProductUserPortV1;constructor(p:ProductUserPortV1){this.#port=p}
 async #invoke<T>(name:string,input:unknown,parse:(v:unknown)=>T|null){try{const c=await this.#port.resolve();if(!c||!['owner','admin'].includes(c.role))return{ok:false as const,error:'access_denied'as const};const r=await this.#port.rpc(name,{p_workspace_id:c.workspaceId,p_input:input});if(r.error)return{ok:false as const,error:(r.error.code==='42501'?'access_denied':r.error.code==='P0002'?'not_found':['40001','23505'].includes(r.error.code??'')?'conflict':['22023','22P02','23514'].includes(r.error.code??'')?'validation':'internal_safe')as ProductErrorV1};if(r.data===null)return{ok:false as const,error:'not_found'as const};const data=parse(r.data);return data?{ok:true as const,data}:{ok:false as const,error:'internal_safe'as const}}catch{return{ok:false as const,error:'internal_safe'as const}}}
 async execute(op:AutomationOperationV1,v:unknown){const i=parseAutomationInputV1(op,v);if(!i)return{ok:false as const,error:'validation'as const};const r=await this.#invoke(AUTOMATIONS_RPC_V1[op],i,v=>parseAutomationReceiptV1(op,i,v));return r.ok?{ok:true as const,receipt:r.data}:r}
 async read(op:string,v:unknown){const i=parseAutomationReadInputV1(op,v);return i?this.#invoke('automation_v1_'+op.slice(11),i,v=>parseAutomationReadV1(op,i,v)):{ok:false as const,error:'validation'as const}}
}
