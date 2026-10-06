import type{ProductUserPortV1}from './product-service-v1'
import{isTelecomReadOperationV1,parseTelecomReadInputV1,parseTelecomReadResultV1}from './telecom-reads-runtime-v1.ts'
export class TelecomReadsServiceV1{
 readonly port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.port=port}
 async execute(operation:unknown,value:unknown){try{
 if(!isTelecomReadOperationV1(operation))return{ok:false as const,error:'validation'as const}
 const input=parseTelecomReadInputV1(operation,value);if(!input)return{ok:false as const,error:'validation'as const}
 const scope=await this.port.resolve();if(!scope||!['owner','admin','member','viewer'].includes(scope.role))return{ok:false as const,error:'access_denied'as const}
 const r=await this.port.rpc('telecom_reads_v1_query',{p_workspace_id:scope.workspaceId,p_operation:operation,p_input:input})
 if(r.error)return{ok:false as const,error:r.error.code==='42501'?'access_denied'as const:r.error.code==='P0002'?'not_found'as const:['22023','22P02','22007','22008'].includes(r.error.code??'')?'validation'as const:'internal_safe'as const}
 const data=parseTelecomReadResultV1(operation,input,r.data)
 if(data&&data.operation==='customer360.summary'&&!['owner','admin'].includes(scope.role)&&'record'in data&&(data.record.documents!==null||data.record.billing!==null))return{ok:false as const,error:'internal_safe'as const}
 return data?{ok:true as const,data}:{ok:false as const,error:'internal_safe'as const}
 }catch{return{ok:false as const,error:'internal_safe'as const}}}
}
