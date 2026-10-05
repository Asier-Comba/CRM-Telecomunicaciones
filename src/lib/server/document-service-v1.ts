import type {ProductUserPortV1}from './product-service-v1'
import type {ProductErrorV1}from '../contracts/product-v1'
import type {DocumentOperationV1}from '../contracts/document-v1'
import {DOCUMENT_RPC_V1,parseDocumentInputV1,parseDocumentReceiptV1,parseDocumentGetInputV1,parseDocumentGetV1,parseDocumentListInputV1,parseDocumentListV1}from './document-runtime-v1.ts'
const failure=(error:ProductErrorV1)=>({ok:false as const,error})
function dbError(code?:string):ProductErrorV1{return code==='42501'?'access_denied':code==='P0002'?'not_found':['40001','23505','40P01'].includes(code??'')?'conflict':['22023','22P02','23514'].includes(code??'')?'validation':'internal_safe'}
export class DocumentServiceV1{
 readonly #port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.#port=port}
 async #invoke<T>(rpc:string,input:unknown,parse:(v:unknown)=>T|null){
  try{const context=await this.#port.resolve();if(!context||!['owner','admin'].includes(context.role))return failure('access_denied')
   const r=await this.#port.rpc(rpc,{p_workspace_id:context.workspaceId,p_input:input});if(r.error)return failure(dbError(r.error.code))
   if(r.data===null)return failure('not_found')
   const data=parse(r.data);return data?{ok:true as const,data}:failure('internal_safe')
  }catch{return failure('internal_safe')}
 }
 async execute(op:DocumentOperationV1,value:unknown){const input=parseDocumentInputV1(op,value);if(!input)return failure('validation');const r=await this.#invoke(DOCUMENT_RPC_V1[op],input,v=>parseDocumentReceiptV1(op,input,v));return r.ok?{ok:true as const,receipt:r.data}:r}
 async getMetadata(value:unknown){const input=parseDocumentGetInputV1(value);return input?this.#invoke('document_v1_get_metadata',input,v=>parseDocumentGetV1(input.id,v)):failure('validation')}
 async list(value:unknown){const input=parseDocumentListInputV1(value);return input?this.#invoke('document_v1_list',input,v=>parseDocumentListV1(input,v)):failure('validation')}
}
