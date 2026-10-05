import type {ProductUserPortV1}from './product-service-v1'
import type {ProductErrorV1}from '../contracts/product-v1'
import {parseImportJobCancelV1,parseImportJobIdV1,parseImportJobListV1,parseImportJobReceiptV1,parseImportJobGetResultV1,parseImportJobListResultV1}from './importjob-runtime-v1.ts'
const fail=(error:ProductErrorV1)=>({ok:false as const,error})
const error=(code?:string):ProductErrorV1=>code==='42501'?'access_denied':code==='P0002'?'not_found':['40001','23505'].includes(code??'')?'conflict':['22023','22P02','23514'].includes(code??'')?'validation':'internal_safe'
export class ImportJobServiceV1{
 readonly #port:ProductUserPortV1;constructor(port:ProductUserPortV1){this.#port=port}
 async #invoke<T>(name:string,input:unknown,parse:(v:unknown)=>T|null){try{const context=await this.#port.resolve();if(!context||!['owner','admin'].includes(context.role))return fail('access_denied');const r=await this.#port.rpc(name,{p_workspace_id:context.workspaceId,p_input:input});if(r.error)return fail(error(r.error.code));if(r.data===null)return fail('not_found');const data=parse(r.data);return data?{ok:true as const,data}:fail('internal_safe')}catch{return fail('internal_safe')}}
 async get(value:unknown){const i=parseImportJobIdV1(value);return i?this.#invoke('importjob_v1_get',i,v=>parseImportJobGetResultV1(i.id,v)):fail('validation')}
 async list(value:unknown){const i=parseImportJobListV1(value);return i?this.#invoke('importjob_v1_list',i,v=>parseImportJobListResultV1(i,v)):fail('validation')}
 async cancel(value:unknown){const i=parseImportJobCancelV1(value);if(!i)return fail('validation');const r=await this.#invoke('importjob_v1_cancel',i,v=>parseImportJobReceiptV1(i,v));return r.ok?{ok:true as const,receipt:r.data}:r}
}
