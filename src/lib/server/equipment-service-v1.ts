import type{ProductUserPortV1}from './product-service-v1'
import{EQUIPMENT_RPC_V1,isEquipmentOperationV1,parseEquipmentInputV1,parseEquipmentReceiptV1,parseEquipmentReadV1}from './equipment-runtime-v1.ts'
export class EquipmentServiceV1{
 readonly port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.port=port}
 async execute(operation:unknown,value:unknown){try{
 if(!isEquipmentOperationV1(operation))return{ok:false as const,error:'validation'as const}
 const input=parseEquipmentInputV1(operation,value);if(!input)return{ok:false as const,error:'validation'as const}
 const read=['equipment.get','equipment.list','equipment.history'].includes(operation),scope=await this.port.resolve()
 if(!scope||!(read?['owner','admin','member','viewer']:['owner','admin','member']).includes(scope.role))return{ok:false as const,error:'access_denied'as const}
 const r=await this.port.rpc(EQUIPMENT_RPC_V1[operation],{p_workspace_id:scope.workspaceId,p_operation:operation,p_input:input})
 if(r.error)return{ok:false as const,error:r.error.code==='42501'?'access_denied'as const:r.error.code==='P0002'?'not_found'as const:['40001','23505'].includes(r.error.code??'')?'conflict'as const:['22023','22007','22008','22P02','23514','23503'].includes(r.error.code??'')?'validation'as const:'internal_safe'as const}
 const data=read?parseEquipmentReadV1(operation,input,r.data):parseEquipmentReceiptV1(operation,input,r.data);return data?{ok:true as const,data}:{ok:false as const,error:'internal_safe'as const}
 }catch{return{ok:false as const,error:'internal_safe'as const}}}
}
