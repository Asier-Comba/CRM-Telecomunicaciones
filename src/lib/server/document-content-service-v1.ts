import {createHash}from 'node:crypto'
import type {ProductUserPortV1}from './product-service-v1'
import type {ProductErrorV1}from '../contracts/product-v1'
import type {DocumentContentOperationV1}from '../contracts/document-content-v1'
import {DOCUMENT_CONTENT_RPC_V1,parseDocumentContentInputV1,parseDocumentContentReceiptV1,parseDocumentContentManifestV1}from './document-content-runtime-v1.ts'
import {isUuidV1}from './product-work-runtime-v1.ts'
export interface DocumentContentPortV1 extends ProductUserPortV1{
 upload(path:string,bytes:Uint8Array,mime:string):Promise<'ok'|'exists'|'denied'|'failed'>
 download(path:string):Promise<Uint8Array|null>
}
const fail=(error:ProductErrorV1)=>({ok:false as const,error})
const dbError=(code?:string):ProductErrorV1=>code==='42501'?'access_denied':code==='P0002'?'not_found':['40001','23505'].includes(code??'')?'conflict':['22023','22P02','23514'].includes(code??'')?'validation':'internal_safe'
export class DocumentContentServiceV1{
 readonly #port:DocumentContentPortV1
 constructor(port:DocumentContentPortV1){this.#port=port}
 async execute(op:DocumentContentOperationV1,value:unknown){
  try{const input=parseDocumentContentInputV1(op,value);if(!input)return fail('validation');const context=await this.#port.resolve();if(!context||!['owner','admin'].includes(context.role))return fail('access_denied')
   const r=await this.#port.rpc(DOCUMENT_CONTENT_RPC_V1[op],{p_workspace_id:context.workspaceId,p_input:input});if(r.error)return fail(dbError(r.error.code));const receipt=parseDocumentContentReceiptV1(op,input,r.data);return receipt?{ok:true as const,receipt}:fail('internal_safe')
  }catch{return fail('internal_safe')}
 }
 async #manifest(id:string,ticket?:string){
  if(!isUuidV1(id)||ticket!==undefined&&!isUuidV1(ticket))return fail('validation')
  const context=await this.#port.resolve();if(!context||!['owner','admin'].includes(context.role))return fail('access_denied')
  const r=await this.#port.rpc('document_content_v1_manifest',{p_workspace_id:context.workspaceId,p_input:{id:id.toLowerCase(),...(ticket?{ticket_id:ticket.toLowerCase()}:{})}});if(r.error)return fail(dbError(r.error.code))
  const manifest=parseDocumentContentManifestV1(id.toLowerCase(),r.data);if(!manifest)return fail('internal_safe')
  return {ok:true as const,manifest,path:context.workspaceId+'/documents/'+manifest.id+'/'+manifest.object_ref}
 }
 async upload(id:string,bytes:Uint8Array,mime:string){
  try{const r=await this.#manifest(id);if(!r.ok)return r;if(bytes.byteLength!==r.manifest.size_bytes||mime!==r.manifest.media_type)return fail('validation')
   const result=await this.#port.upload(r.path,bytes,mime);if(result==='denied')return fail('access_denied');if(result==='failed')return fail('unavailable')
   if(result==='exists'){const old=await this.#port.download(r.path);if(!old||old.byteLength!==bytes.byteLength||old.some((b,i)=>b!==bytes[i]))return fail('conflict')}
   return{ok:true as const,data:{id:r.manifest.id,uploaded:true as const,finalized:false as const}}
  }catch{return fail('internal_safe')}
 }
 async download(id:string,ticket:string){
  try{const r=await this.#manifest(id,ticket);if(!r.ok)return r;const bytes=await this.#port.download(r.path);if(!bytes)return fail('access_denied');if(bytes.byteLength!==r.manifest.size_bytes)return fail('internal_safe');if(r.manifest.sha256&&createHash('sha256').update(bytes).digest('hex')!==r.manifest.sha256)return fail('conflict');return{ok:true as const,bytes,mime:r.manifest.media_type}}
  catch{return fail('internal_safe')}
 }
}
