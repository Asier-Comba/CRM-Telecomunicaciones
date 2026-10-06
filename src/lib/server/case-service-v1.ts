import type {ProductUserPortV1}from './product-service-v1'
import {CASE_RPC_V1,isCaseOperationV1,parseCaseInputV1,parseCaseResultV1}from './case-runtime-v1.ts'
export class CaseServiceV1{
 readonly port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.port=port}
 async execute(operation:unknown,value:unknown){try{
 if(!isCaseOperationV1(operation))return{ok:false as const,error:'validation'as const}
 const input=parseCaseInputV1(operation,value);if(!input)return{ok:false as const,error:'validation'as const}
 const read=operation==='case.list'||operation==='case.get'||operation==='case.note_list',scope=await this.port.resolve();if(!scope||!(read&&operation!=='case.note_list'?['owner','admin','member','viewer']:['owner','admin','member']).includes(scope.role))return{ok:false as const,error:'access_denied'as const}
 const r=await this.port.rpc(CASE_RPC_V1[operation],{p_workspace_id:scope.workspaceId,p_operation:operation,p_input:input})
 if(r.error)return{ok:false as const,error:r.error.code==='42501'?'access_denied'as const:r.error.code==='P0002'?'not_found'as const:['40001','23505','23P01'].includes(r.error.code??'')?'conflict'as const:['22023','23514','22P02','22007','22008'].includes(r.error.code??'')?'validation'as const:'internal_safe'as const}
 if(r.data===null)return{ok:false as const,error:'not_found'as const}
 const data=parseCaseResultV1(operation,input,r.data);return data?{ok:true as const,data}:{ok:false as const,error:'internal_safe'as const}
 }catch{return{ok:false as const,error:'internal_safe'as const}}}
}
