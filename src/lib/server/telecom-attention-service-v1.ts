import type{ProductUserPortV1}from './product-service-v1'
import{parseTelecomAttentionInputV1,parseTelecomAttentionResultV1}from './telecom-attention-runtime-v1.ts'
export class TelecomAttentionServiceV1{
 readonly port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.port=port}
 async execute(operation:unknown,value:unknown){try{
 if(operation!=='telecom.attention')return{ok:false as const,error:'validation'as const}
 const input=parseTelecomAttentionInputV1(value);if(!input)return{ok:false as const,error:'validation'as const}
 const scope=await this.port.resolve();if(!scope||!['owner','admin','member','viewer'].includes(scope.role))return{ok:false as const,error:'access_denied'as const}
 const r=await this.port.rpc('telecom_attention_v1_query',{p_workspace_id:scope.workspaceId,p_input:input})
 if(r.error)return{ok:false as const,error:r.error.code==='42501'?'access_denied'as const:r.error.code==='P0002'?'not_found'as const:['22023','22P02','22007','22008'].includes(r.error.code??'')?'validation'as const:'internal_safe'as const}
 const data=parseTelecomAttentionResultV1(input,r.data);return data?{ok:true as const,data}:{ok:false as const,error:'internal_safe'as const}
 }catch{return{ok:false as const,error:'internal_safe'as const}}}
}
