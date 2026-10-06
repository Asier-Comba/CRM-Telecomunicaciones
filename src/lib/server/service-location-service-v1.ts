import type{ProductUserPortV1}from './product-service-v1'
import{SERVICE_LOCATION_RPC_V1,isServiceLocationOperationV1,parseServiceLocationInputV1,parseServiceLocationReceiptV1,parseServiceLocationReadV1}from './service-location-runtime-v1.ts'
export class ServiceLocationServiceV1{
 readonly port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.port=port}
 async execute(operation:unknown,value:unknown){try{
 if(!isServiceLocationOperationV1(operation))return{ok:false as const,error:'validation'as const}
 const input=parseServiceLocationInputV1(operation,value);if(!input)return{ok:false as const,error:'validation'as const}
 const read=['service_location.get','service_location.list'].includes(operation),scope=await this.port.resolve()
 if(!scope||!(read?['owner','admin','member','viewer']:['owner','admin','member']).includes(scope.role))return{ok:false as const,error:'access_denied'as const}
 const r=await this.port.rpc(SERVICE_LOCATION_RPC_V1[operation],{p_workspace_id:scope.workspaceId,p_operation:operation,p_input:input})
 if(r.error)return{ok:false as const,error:r.error.code==='42501'?'access_denied'as const:r.error.code==='P0002'?'not_found'as const:['40001','23505'].includes(r.error.code??'')?'conflict'as const:['22023','22007','22008','22P02','23514','23503'].includes(r.error.code??'')?'validation'as const:'internal_safe'as const}
 const data=read?parseServiceLocationReadV1(operation,input,r.data):parseServiceLocationReceiptV1(operation,input,r.data);return data?{ok:true as const,data}:{ok:false as const,error:'internal_safe'as const}
 }catch{return{ok:false as const,error:'internal_safe'as const}}}
}
