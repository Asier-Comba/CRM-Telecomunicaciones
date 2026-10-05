import {createHash,randomUUID,timingSafeEqual}from 'node:crypto'
import type {ProductUserPortV1}from './product-service-v1'
import type {ProductErrorV1}from '../contracts/product-v1'
import {BillingServiceV1}from './billing-service-v1.ts'
import {DocumentServiceV1}from './document-service-v1.ts'
import type {DocumentContentServiceV1}from './document-content-service-v1'
import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import {parseBillingArtifactInputV1,parseBillingArtifactReceiptV1,parseBillingArtifactReferenceV1,renderFrozenInvoicePdfV1,billingArtifactChildCommandV1}from './billing-artifact-runtime-v1.ts'
const fail=(error:ProductErrorV1)=>({ok:false as const,error})
const dbError=(code?:string):ProductErrorV1=>code==='42501'?'access_denied':code==='P0002'?'not_found':['40001','23505'].includes(code??'')?'conflict':['22023','22P02','23514'].includes(code??'')?'validation':'internal_safe'
export class BillingArtifactServiceV1{
 readonly #port:ProductUserPortV1;readonly #content:DocumentContentServiceV1;readonly #billing:BillingServiceV1;readonly #docs:DocumentServiceV1
 constructor(port:ProductUserPortV1,content:DocumentContentServiceV1){this.#port=port;this.#content=content;this.#billing=new BillingServiceV1(port);this.#docs=new DocumentServiceV1(port)}
 async #rpc(name:string,input:unknown){const context=await this.#port.resolve();if(!context||!['owner','admin'].includes(context.role))return fail('access_denied');const r=await this.#port.rpc(name,{p_workspace_id:context.workspaceId,p_input:input});return r.error?fail(dbError(r.error.code)):{ok:true as const,data:r.data}}
 async persist(value:unknown){
  try{const input=parseBillingArtifactInputV1(value);if(!input)return fail('validation')
   const replay=await this.#rpc('billing_artifact_v1_replay',input);if(!replay.ok)return replay;if(replay.data!==null){const receipt=parseBillingArtifactReceiptV1(input,replay.data);return receipt?{ok:true as const,receipt}:fail('internal_safe')}
   const source=await this.#billing.read('invoice.get',{id:input.id});if(!source.ok)return source;if(source.data.operation!=='invoice.get')return fail('internal_safe')
   if(source.data.invoice.version!==input.expected_version)return fail('conflict');const bytes=renderFrozenInvoicePdfV1(source.data.invoice);if(!bytes)return fail('validation')
   const child=(step:string)=>billingArtifactChildCommandV1(input.command_id,input.id,step)
   const request=await this.#content.execute('document.request_upload',{command_id:child('request'),target_kind:'customer',target_id:source.data.invoice.customer_id,document_kind:'billing',media_type:'application/pdf',size_bytes:bytes.byteLength,file_name:'invoice.pdf'});if(!request.ok)return request
   const document=request.receipt.id,finalizeInput={command_id:child('finalize'),id:document,expected_version:1}
   // A completed child command can be replayed after the document became active.
   let finalize=await this.#content.execute('document.finalize_upload',finalizeInput)
   if(!finalize.ok){if(finalize.error!=='validation')return finalize;const upload=await this.#content.upload(document,bytes,'application/pdf');if(!upload.ok)return upload;finalize=await this.#content.execute('document.finalize_upload',finalizeInput);if(!finalize.ok)return finalize}
   const linked=await this.#rpc('billing_artifact_v1_attach',{...input,document_id:document});if(!linked.ok)return linked
   const receipt=parseBillingArtifactReceiptV1(input,linked.data);return receipt?{ok:true as const,receipt}:fail('internal_safe')
  }catch{return fail('internal_safe')}
 }
 async reference(value:unknown){
  try{if(!plain(value)||Object.keys(value).join(',')!=='id'||!uuid(value.id))return fail('validation');const id=value.id.toLowerCase(),r=await this.#rpc('billing_artifact_v1_get',{id});if(!r.ok)return r;if(r.data===null)return fail('not_found');const data=parseBillingArtifactReferenceV1(id,r.data);return data?{ok:true as const,data}:fail('internal_safe')}catch{return fail('internal_safe')}
 }
 async download(value:unknown){
  try{const ref=await this.reference(value);if(!ref.ok)return ref;if(ref.data.document_status!=='active')return fail('access_denied')
   const source=await this.#billing.read('invoice.get',{id:ref.data.invoice_id});if(!source.ok)return source;if(source.data.operation!=='invoice.get')return fail('internal_safe');const expected=renderFrozenInvoicePdfV1(source.data.invoice);if(!expected)return fail('internal_safe')
   const metadata=await this.#docs.getMetadata({id:ref.data.document_id});if(!metadata.ok)return metadata;if(metadata.data.record.status!=='active')return fail('access_denied')
   const ticket=await this.#content.execute('document.request_download',{command_id:randomUUID(),id:ref.data.document_id,expected_version:metadata.data.record.version});if(!ticket.ok)return ticket;if(!ticket.receipt.ticket_id)return fail('internal_safe')
   const result=await this.#content.download(ref.data.document_id,ticket.receipt.ticket_id);if(!result.ok)return result
   if(expected.byteLength!==result.bytes.byteLength||!timingSafeEqual(createHash('sha256').update(expected).digest(),createHash('sha256').update(result.bytes).digest()))return fail('conflict')
   return{ok:true as const,bytes:result.bytes}
  }catch{return fail('internal_safe')}
 }
}
