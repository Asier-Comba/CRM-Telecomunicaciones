import type{ProductUserPortV1}from './product-service-v1'
import{isBillingAnalyticsOperationV1,parseBillingAnalyticsInputV1,parseBillingAnalyticsResultV1}from './billing-analytics-runtime-v1.ts'
export class BillingAnalyticsServiceV1{
 readonly port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.port=port}
 async execute(operation:unknown,value:unknown){try{
 if(!isBillingAnalyticsOperationV1(operation))return{ok:false as const,error:'validation'as const}
 const input=parseBillingAnalyticsInputV1(operation,value);if(!input)return{ok:false as const,error:'validation'as const}
 const scope=await this.port.resolve();if(!scope||!['owner','admin'].includes(scope.role))return{ok:false as const,error:'access_denied'as const}
 const r=await this.port.rpc('billing_analytics_v1_query',{p_workspace_id:scope.workspaceId,p_operation:operation,p_input:input})
 if(r.error)return{ok:false as const,error:r.error.code==='42501'?'access_denied'as const:r.error.code==='P0002'?'not_found'as const:['22023','22P02','22007','22008'].includes(r.error.code??'')?'validation'as const:'internal_safe'as const}
 const data=parseBillingAnalyticsResultV1(operation,input,r.data)
 return data?{ok:true as const,data}:{ok:false as const,error:'internal_safe'as const}
 }catch{return{ok:false as const,error:'internal_safe'as const}}}
}
