import { isBillingQueryV1,parseBillingQueryV1,parseBillingReadV1,BILLING_QUERY_RPC_V1 } from './billing-query-runtime-v1.ts'
import type { ProductUserPortV1 } from './product-service-v1'
import type { BillingOperationV1, BillingQueryV1 } from '../contracts/billing-v1'
import { isBillingOperationV1,parseBillingInputV1,parseBillingReceiptV1,BILLING_RPC_V1 } from './billing-runtime-v1.ts'
export class BillingServiceV1 {
 readonly port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.port=port}
 async execute(op:BillingOperationV1,value:unknown) {
  if(!isBillingOperationV1(op))return {ok:false as const,error:'validation' as const}
  const input=parseBillingInputV1(op,value);if(input===null)return {ok:false as const,error:'validation' as const}
  try{const context=await this.port.resolve();if(context===null||!['owner','admin'].includes(context.role))return {ok:false as const,error:'access_denied' as const}
   const response=await this.port.rpc(BILLING_RPC_V1[op],{p_workspace_id:context.workspaceId,p_input:input})
   if(response.error)return {ok:false as const,error:response.error.code==='42501'?'access_denied' as const:response.error.code==='P0002'?'not_found' as const:['40001','23505'].includes(response.error.code??'')?'conflict' as const:['22023','22007','22008','22P02','23514','23503'].includes(response.error.code??'')?'validation' as const:'internal_safe' as const}
   const receipt=parseBillingReceiptV1(op,input,response.data);return receipt===null?{ok:false as const,error:'internal_safe' as const}:{ok:true as const,receipt}
  }catch{return {ok:false as const,error:'internal_safe' as const}}
 }
 async read(q:BillingQueryV1,value:unknown) {
  if(!isBillingQueryV1(q))return {ok:false as const,error:'validation' as const}
  const input=parseBillingQueryV1(q,value);if(input===null)return {ok:false as const,error:'validation' as const}
  try{const context=await this.port.resolve();if(context===null||!['owner','admin'].includes(context.role))return {ok:false as const,error:'access_denied' as const}
   const response=await this.port.rpc(BILLING_QUERY_RPC_V1[q],{p_workspace_id:context.workspaceId,p_input:input})
   if(response.error)return {ok:false as const,error:response.error.code==='42501'?'access_denied' as const:'internal_safe' as const}
   if(response.data===null)return {ok:false as const,error:'not_found' as const}
   const data=parseBillingReadV1(q,input,response.data);return data===null?{ok:false as const,error:'internal_safe' as const}:{ok:true as const,data}
  }catch{return {ok:false as const,error:'internal_safe' as const}}
 }

}
