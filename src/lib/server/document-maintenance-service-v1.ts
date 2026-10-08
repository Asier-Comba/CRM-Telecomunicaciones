import {createHash,createHmac}from 'node:crypto'
import type {DocumentContentPortV1}from './document-content-service-v1'
import type {DocumentScannerV1}from './document-scanner-v1'
import type {ProductErrorV1}from '../contracts/product-v1'
import type {DocumentMaintenanceInputV1,DocumentMaintenanceOperationV1,DocumentMaintenanceReceiptV1}from '../contracts/document-maintenance-v1'
import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import {parseDocumentContentManifestV1}from './document-content-runtime-v1.ts'
import {parseTeamListInputV1}from './team-runtime-v1.ts'
export interface DocumentMaintenancePortV1 extends DocumentContentPortV1{
 actor():Promise<string|null>
 remove(path:string):Promise<boolean>
 witnessKey():Readonly<{key_id:string;key:Uint8Array}>|null
}
export const DOCUMENT_MAINTENANCE_RPC_V1={'document.verify_content':'document_integrity_v1_verify','document.cleanup_claim':'document_cleanup_v1_claim','document.cleanup_finish':'document_cleanup_v1_finish','document.expired_list':'document_cleanup_v1_expired_list'}as const
const fail=(error:ProductErrorV1)=>({ok:false as const,error})
const err=(c?:string):ProductErrorV1=>c==='42501'?'access_denied':c==='P0002'?'not_found':['40001','23505'].includes(c??'')?'conflict':['22023','22P02','23514'].includes(c??'')?'validation':'internal_safe'
export function parseDocumentMaintenanceInputV1(op:DocumentMaintenanceOperationV1,v:unknown):DocumentMaintenanceInputV1|null{
 try{return Object.hasOwn(DOCUMENT_MAINTENANCE_RPC_V1,op)&&op!=='document.expired_list'&&plain(v)&&Object.keys(v).sort().join(',')===(op==='document.verify_content'?'command_id,expected_version,id,ticket_id':'command_id,expected_version,id')&&uuid(v.command_id)&&uuid(v.id)&&Number.isSafeInteger(v.expected_version)&&(v.expected_version as number)>0&&(v.expected_version as number)<1e15&&(op!=='document.verify_content'||uuid(v.ticket_id))?Object.freeze({...v,command_id:v.command_id.toLowerCase(),id:v.id.toLowerCase(),...(op==='document.verify_content'?{ticket_id:(v.ticket_id as string).toLowerCase()}:{})})as DocumentMaintenanceInputV1:null}catch{return null}
}
export function parseDocumentMaintenanceReceiptV1(op:DocumentMaintenanceOperationV1,i:DocumentMaintenanceInputV1,v:unknown):DocumentMaintenanceReceiptV1|null{
 try{const integrity=op==='document.verify_content';if(!plain(v)||Object.keys(v).sort().join(',')!==(integrity?'command_id,contract_version,id,integrity,operation,scan_status,status,version':'command_id,contract_version,id,operation,status,version')||v.contract_version!==(integrity?'document.integrity.v1':'document.cleanup.v1')||v.operation!==op||v.command_id!==i.command_id||v.id!==i.id||v.version!==i.expected_version+1||v.status!==(integrity?'active':op==='document.cleanup_claim'?'pending':'archived')||integrity&&(v.integrity!=='verified_sha256'||v.scan_status!=='not_scanned'))return null;return Object.freeze({...v})as DocumentMaintenanceReceiptV1}catch{return null}
}
export function documentWitnessPayloadV1(workspace:string,actor:string,i:DocumentMaintenanceInputV1,w:Readonly<{object_ref:string;size_bytes:number;media_type:string;sha256:string;measured_at:number}>){return['document.integrity.v1',workspace,actor,i.command_id,i.id,i.expected_version,i.ticket_id,w.object_ref,w.size_bytes,w.media_type,w.sha256,w.measured_at,'not_scanned'].join('|')}
export class DocumentMaintenanceServiceV1{
 readonly #port:DocumentMaintenancePortV1;readonly #required:boolean;readonly #scanner:DocumentScannerV1|null
 constructor(port:DocumentMaintenancePortV1,required=false,scanner:DocumentScannerV1|null=null){this.#port=port;this.#required=required;this.#scanner=scanner}
 async execute(op:DocumentMaintenanceOperationV1,value:unknown){
  try{
   if(op==='document.expired_list'){
    const i=parseTeamListInputV1(value);if(!i)return fail('validation');const c=await this.#port.resolve();if(!c||!['owner','admin'].includes(c.role))return fail('access_denied')
    const r=await this.#port.rpc('document_cleanup_v1_expired_list',{p_workspace_id:c.workspaceId,p_input:i});if(r.error)return fail(err(r.error.code))
    const v=r.data;if(!plain(v)||Object.keys(v).sort().join(',')!=='contract_version,items,next_id,operation'||v.contract_version!=='document.cleanup.v1'||v.operation!==op||!Array.isArray(v.items)||v.items.length>(i.limit??20))return fail('internal_safe')
    let last=i.after_id??'';for(const row of v.items){if(!plain(row)||Object.keys(row).sort().join(',')!=='id,version'||!uuid(row.id)||row.id<=last||!Number.isSafeInteger(row.version)||(row.version as number)<1)return fail('internal_safe');last=row.id}
    if(v.next_id!==null&&(v.next_id!==last||v.items.length!==(i.limit??20)))return fail('internal_safe')
    return{ok:true as const,data:v}
   }
   const i=parseDocumentMaintenanceInputV1(op,value);if(!i)return fail('validation');const c=await this.#port.resolve();if(!c||!['owner','admin'].includes(c.role))return fail('access_denied')
   let rpc=op==='document.cleanup_claim'?'document_cleanup_v1_claim':'document_cleanup_v1_finish',args:Record<string,unknown>={p_workspace_id:c.workspaceId,p_input:i}
   if(op==='document.verify_content'){
    const key=this.#port.witnessKey(),actor=await this.#port.actor();if(!key||!uuid(key.key_id)||key.key.length!==32)return fail('unavailable');if(!actor||!uuid(actor))return fail('access_denied')
    const r=await this.#port.rpc('document_content_v1_manifest',{p_workspace_id:c.workspaceId,p_input:{id:i.id,ticket_id:i.ticket_id}});if(r.error)return fail(err(r.error.code));const m=parseDocumentContentManifestV1(i.id,r.data);if(!m)return fail('internal_safe')
    const bytes=await this.#port.download(c.workspaceId+'/documents/'+i.id+'/'+m.object_ref);if(!bytes)return fail('access_denied');if(bytes.byteLength!==m.size_bytes)return fail('validation')
    if(this.#scanner){const s=await this.#scanner.scan(bytes);if(s.status==='rejected')return fail('validation')}
    // No production scanner is registered; fixtures cannot establish cleanliness.
    if(this.#required)return fail('unavailable')
    const w={key_id:key.key_id,object_ref:m.object_ref,size_bytes:m.size_bytes,media_type:m.media_type,sha256:createHash('sha256').update(bytes).digest('hex'),measured_at:Date.now(),scan_status:'not_scanned'}
    const witness={...w,mac:createHmac('sha256',key.key).update(documentWitnessPayloadV1(c.workspaceId,actor,i,w)).digest('hex')}
    rpc='document_integrity_v1_verify';args={...args,p_witness:witness}
   }else if(op==='document.cleanup_finish'){
    const p=await this.#port.rpc('document_cleanup_v1_prepare_finish',args);if(p.error)return fail(err(p.error.code))
    const v=p.data;if(!plain(v)||Object.keys(v).sort().join(',')!=='object_ref,receipt,version')return fail('internal_safe')
    if(v.receipt!==null){const receipt=parseDocumentMaintenanceReceiptV1(op,i,v.receipt);return receipt?{ok:true as const,receipt}:fail('internal_safe')}
    if(!uuid(v.object_ref)||v.version!==i.expected_version)return fail('internal_safe')
    if(!await this.#port.remove(c.workspaceId+'/documents/'+i.id+'/'+v.object_ref)){
     // A concurrent finisher may have archived the row and removed DELETE eligibility.
     // Reauthorize and recover only this exact durable intent; absence is never success.
     const recovered=await this.#port.rpc('document_cleanup_v1_prepare_finish',args)
     if(recovered.error)return fail(err(recovered.error.code))
     const x=recovered.data
     if(!plain(x)||Object.keys(x).sort().join(',')!=='object_ref,receipt,version'||x.receipt===null)return fail('unavailable')
     const receipt=parseDocumentMaintenanceReceiptV1(op,i,x.receipt)
     return receipt?{ok:true as const,receipt}:fail('internal_safe')
    }
   }
   const r=await this.#port.rpc(rpc,args);if(r.error)return fail(err(r.error.code));const receipt=parseDocumentMaintenanceReceiptV1(op,i,r.data);return receipt?{ok:true as const,receipt}:fail('internal_safe')
  }catch{return fail('internal_safe')}
 }
}
