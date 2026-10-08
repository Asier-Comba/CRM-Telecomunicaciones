import type {ProductUserPortV1} from './product-service-v1'
import {isExternalIdentityOperationV1,parseExternalIdentityInputV1,parseExternalIdentityReadV1,parseExternalIdentityReceiptV1} from './external-identity-runtime-v1.ts'
export class ExternalIdentityServiceV1{
 readonly port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.port=port}
 async execute(operation:unknown,value:unknown){try{
  if(!isExternalIdentityOperationV1(operation))return {ok:false as const,error:'validation' as const}
  const input=parseExternalIdentityInputV1(operation,value);if(!input)return {ok:false as const,error:'validation' as const}
  const scope=await this.port.resolve();if(!scope||!['owner','admin'].includes(scope.role))return {ok:false as const,error:'access_denied' as const}
  const read=['external_identity.list','external_identity.integration_list'].includes(operation)
  const r=await this.port.rpc(read?'external_identity_v1_query':'external_identity_v1_command',{p_workspace_id:scope.workspaceId,p_operation:operation,p_input:input})
  if(r.error)return {ok:false as const,error:r.error.code==='42501'?'access_denied' as const:r.error.code==='P0002'?'not_found' as const:['40001','23505'].includes(r.error.code??'')?'conflict' as const:['22023','23514','23503','22P02'].includes(r.error.code??'')?'validation' as const:'internal_safe' as const}
  const data=read?parseExternalIdentityReadV1(operation,input,r.data):parseExternalIdentityReceiptV1(operation,input,r.data)
  return data?{ok:true as const,data}:{ok:false as const,error:'internal_safe' as const}
 }catch{return {ok:false as const,error:'internal_safe' as const}}}
}
