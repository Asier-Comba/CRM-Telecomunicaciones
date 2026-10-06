import type {ProductUserPortV1}from './product-service-v1'
import type {ProductErrorV1}from '../contracts/product-v1'
import {parseSensitiveInputV1,parseSensitiveResultV1}from './sensitive-runtime-v1.ts'
export class SensitiveServiceV1{
 readonly #port:ProductUserPortV1;constructor(p:ProductUserPortV1){this.#port=p}
 async get(v:unknown){try{const i=parseSensitiveInputV1(v);if(!i)return{ok:false as const,error:'validation'as const};const c=await this.#port.resolve();if(!c||!['owner','admin','member'].includes(c.role)||i.entity_kind==='customer'&&!['owner','admin'].includes(c.role))return{ok:false as const,error:'access_denied'as const};const r=await this.#port.rpc('sensitive_v1_get',{p_workspace_id:c.workspaceId,p_input:i});if(r.error)return{ok:false as const,error:(r.error.code==='42501'?'access_denied':r.error.code==='P0002'?'not_found':['22023','22P02','23514'].includes(r.error.code??'')?'validation':'internal_safe')as ProductErrorV1};const data=parseSensitiveResultV1(i,r.data);return data?{ok:true as const,data}:{ok:false as const,error:'internal_safe'as const}}catch{return{ok:false as const,error:'internal_safe'as const}}}
}
