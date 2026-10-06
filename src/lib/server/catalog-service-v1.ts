import type {ProductUserPortV1}from './product-service-v1'
import {CATALOG_RPC_V1,isCatalogOperationV1,parseCatalogInputV1,parseCatalogResultV1}from './catalog-runtime-v1.ts'
export class CatalogServiceV1{
 readonly port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.port=port}
 async execute(operation:unknown,value:unknown){try{
 if(!isCatalogOperationV1(operation))return{ok:false as const,error:'validation'as const}
 const input=parseCatalogInputV1(operation,value);if(!input)return{ok:false as const,error:'validation'as const}
 const read=operation==='plan_version.terms_get',scope=await this.port.resolve();if(!scope||!(read?['owner','admin','member','viewer']:['owner','admin']).includes(scope.role))return{ok:false as const,error:'access_denied'as const}
 const r=await this.port.rpc(CATALOG_RPC_V1[operation],read?{p_workspace_id:scope.workspaceId,p_input:input}:{p_workspace_id:scope.workspaceId,p_operation:operation,p_input:input})
 if(r.error)return{ok:false as const,error:r.error.code==='42501'?'access_denied'as const:r.error.code==='P0002'?'not_found'as const:['40001','23505','23P01'].includes(r.error.code??'')?'conflict'as const:['22023','23514','22P02','22007','22008'].includes(r.error.code??'')?'validation'as const:'internal_safe'as const}
 if(r.data===null)return{ok:false as const,error:'not_found'as const}
 const data=parseCatalogResultV1(operation,input,r.data);return data?{ok:true as const,data}:{ok:false as const,error:'internal_safe'as const}
 }catch{return{ok:false as const,error:'internal_safe'as const}}}
}
