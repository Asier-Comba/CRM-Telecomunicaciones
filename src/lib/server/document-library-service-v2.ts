import type {ProductUserPortV1} from './product-service-v1'
import type {ProductErrorV1} from '../contracts/product-v1'
import {parseDocumentLibraryInputV2,parseDocumentLibraryPageV2} from './document-library-runtime-v2.ts'
const failure=(error:ProductErrorV1)=>({ok:false as const,error})
export class DocumentLibraryServiceV2{
 constructor(private readonly port:ProductUserPortV1){}
 async list(value:unknown){
  const input=parseDocumentLibraryInputV2(value);if(!input)return failure('validation')
  try{
   const context=await this.port.resolve();if(!context||!['owner','admin'].includes(context.role))return failure('access_denied')
   const result=await this.port.rpc('document_library_v2_list',{p_workspace_id:context.workspaceId,p_input:input})
   if(result.error)return failure(result.error.code==='42501'?'access_denied':result.error.code==='PT503'?'unavailable':['22023','22P02','23514'].includes(result.error.code??'')?'validation':'internal_safe')
   const data=parseDocumentLibraryPageV2(input,result.data);return data?{ok:true as const,data}:failure('internal_safe')
  }catch{return failure('internal_safe')}
 }
}
