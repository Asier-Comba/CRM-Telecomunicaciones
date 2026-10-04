import type {ProductUserPortV1} from './product-service-v1'
import type {TeamOperationV1} from '../contracts/team-v1'
import {TEAM_RPC_V1,parseTeamInputV1,parseTeamReceiptV1,parseTeamListInputV1,parseTeamListV1} from './team-runtime-v1.ts'
import type {ProductErrorV1} from '../contracts/product-v1'
const failure=(error:ProductErrorV1)=>({ok:false as const,error})
function dbError(code?:string):ProductErrorV1{return code==='42501'?'access_denied':code==='P0002'?'not_found':['40001','23505','40P01'].includes(code??'')?'conflict':['22023','22P02','23514'].includes(code??'')?'validation':'internal_safe'}
export class TeamServiceV1{
 readonly port:ProductUserPortV1
 constructor(port:ProductUserPortV1){this.port=port}
 async execute(op:TeamOperationV1,value:unknown){
  const input=parseTeamInputV1(op,value);if(!input)return failure('validation')
  try{const context=await this.port.resolve();if(!context||!['owner','admin'].includes(context.role))return failure('access_denied')
   if('role'in input&&input.role==='admin'&&context.role!=='owner')return failure('access_denied')
   const r=await this.port.rpc(TEAM_RPC_V1[op],{p_workspace_id:context.workspaceId,p_input:input});if(r.error)return failure(dbError(r.error.code))
   const receipt=parseTeamReceiptV1(op,input,r.data);return receipt?{ok:true as const,receipt}:failure('internal_safe')
  }catch{return failure('internal_safe')}
 }
 async list(value:unknown){
  const input=parseTeamListInputV1(value);if(!input)return failure('validation')
  try{const context=await this.port.resolve();if(!context||!['owner','admin'].includes(context.role))return failure('access_denied')
   const r=await this.port.rpc('team_v1_member_list',{p_workspace_id:context.workspaceId,p_input:input});if(r.error)return failure(dbError(r.error.code))
   const data=parseTeamListV1(input,r.data);return data?{ok:true as const,data}:failure('internal_safe')
  }catch{return failure('internal_safe')}
 }
}
