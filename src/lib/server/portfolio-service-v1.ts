import type {ProductUserPortV1} from './product-service-v1'
import type {PortfolioOperationV1} from '../contracts/portfolio-v1'
import {PORTFOLIO_RPC_V1,parsePortfolioInputV1,parsePortfolioReceiptV1,parsePortfolioGetInputV1,parsePortfolioGetV1} from './portfolio-runtime-v1.ts'
import type {ProductErrorV1} from '../contracts/product-v1'
const failure=(error:ProductErrorV1)=>({ok:false as const,error})
function dbError(code?:string):ProductErrorV1{return code==='42501'?'access_denied':code==='P0002'?'not_found':['40001','23505','40P01'].includes(code??'')?'conflict':['22023','22P02','23514','23503','22007'].includes(code??'')?'validation':'internal_safe'}
export class PortfolioServiceV1{
 readonly port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.port=port}
 async execute(op:PortfolioOperationV1,value:unknown){
  const input=parsePortfolioInputV1(op,value);if(!input)return failure('validation')
  try{const context=await this.port.resolve();if(!context||!['owner','admin','member'].includes(context.role))return failure('access_denied')
   const r=await this.port.rpc(PORTFOLIO_RPC_V1[op],{p_workspace_id:context.workspaceId,p_input:input});if(r.error)return failure(dbError(r.error.code))
   const receipt=parsePortfolioReceiptV1(op,input,r.data);return receipt?{ok:true as const,receipt}:failure('internal_safe')
  }catch{return failure('internal_safe')}
 }
 async get(value:unknown){
  const input=parsePortfolioGetInputV1(value);if(!input)return failure('validation')
  try{const context=await this.port.resolve();if(!context||!['owner','admin','member','viewer'].includes(context.role))return failure('access_denied')
   const r=await this.port.rpc('portfolio_v1_get',{p_workspace_id:context.workspaceId,p_input:input});if(r.error)return failure(dbError(r.error.code))
   if(r.data===null)return failure('not_found')
   const data=parsePortfolioGetV1(input,r.data);return data?{ok:true as const,data}:failure('internal_safe')
  }catch{return failure('internal_safe')}
 }
}
