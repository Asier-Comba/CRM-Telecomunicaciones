import type {ProductUserPortV1}from './product-service-v1'
import {PORTABILITY_RPC_V1,isPortabilityOperationV1,parsePortabilityInputV1,parsePortabilityResultV1}from './portability-runtime-v1.ts'
export class PortabilityServiceV1{
 readonly port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.port=port}
 async execute(operation:unknown,value:unknown){try{
 if(!isPortabilityOperationV1(operation))return{ok:false as const,error:'validation'as const}
 const input=parsePortabilityInputV1(operation,value);if(!input)return{ok:false as const,error:'validation'as const}
 const read=operation==='portability.list'||operation==='portability.get',scope=await this.port.resolve();if(!scope||!(read?['owner','admin','member','viewer']:['owner','admin','member']).includes(scope.role))return{ok:false as const,error:'access_denied'as const}
 const r=await this.port.rpc(PORTABILITY_RPC_V1[operation],{p_workspace_id:scope.workspaceId,p_operation:operation,p_input:input})
 if(r.error)return{ok:false as const,error:r.error.code==='42501'?'access_denied'as const:r.error.code==='P0002'?'not_found'as const:['40001','23505','23P01'].includes(r.error.code??'')?'conflict'as const:['22023','23514','22P02','22007','22008'].includes(r.error.code??'')?'validation'as const:'internal_safe'as const}
 if(r.data===null)return{ok:false as const,error:'not_found'as const}
 const data=parsePortabilityResultV1(operation,input,r.data);return data?{ok:true as const,data}:{ok:false as const,error:'internal_safe'as const}
 }catch{return{ok:false as const,error:'internal_safe'as const}}}
}
