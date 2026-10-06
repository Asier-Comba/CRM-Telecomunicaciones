import type {TeamInputsV1,TeamOperationV1,TeamReceiptV1,TeamListInputV1,TeamListV1,TeamInviteListV1} from '../contracts/team-v1'
import {isClosedObjectV1 as plain,isUuidV1 as uuid} from './product-work-runtime-v1.ts'
const version=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=1&&v<1e15
const keys=(v:Record<string,unknown>,k:string)=>Object.keys(v).sort().join(',')===k
export const TEAM_RPC_V1={'member.invite_intent':'team_v1_member_invite_intent','member.role_change':'team_v1_member_role_change','member.suspend':'team_v1_member_suspend','member.resume':'team_v1_member_resume','member.remove':'team_v1_member_remove','member.cancel_invite':'team_v1_member_cancel_invite','member.reissue_invite':'team_v1_member_reissue_invite'} as const
export function isTeamOperationV1(v:unknown):v is TeamOperationV1{return typeof v==='string'&&Object.hasOwn(TEAM_RPC_V1,v)}
export function parseTeamInputV1<O extends TeamOperationV1>(op:O,v:unknown):TeamInputsV1[O]|null{
 try{
  if(!isTeamOperationV1(op)||!plain(v)||!uuid(v.command_id))return null
  const invite=op==='member.invite_intent'
  if(!keys(v,invite?'command_id,email,role':op==='member.role_change'?'command_id,expected_version,id,role':'command_id,expected_version,id'))return null
  if(!invite&&(!uuid(v.id)||!version(v.expected_version)))return null
  if('role'in v&&!['admin','member','viewer'].includes(v.role as string))return null
  if(invite&&(typeof v.email!=='string'||v.email.length>320||v.email.length<3||v.email!==v.email.trim().toLowerCase()||/[\u0000-\u001f\u007f-\u009f]/.test(v.email)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)))return null
  return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,['id','command_id'].includes(k)?(x as string).toLowerCase():x])))as TeamInputsV1[O]
 }catch{return null}
}
export function parseTeamReceiptV1(op:TeamOperationV1,input:TeamInputsV1[TeamOperationV1],v:unknown):TeamReceiptV1|null{
 try{
  if(!plain(v)||!keys(v,op==='member.reissue_invite'?'command_id,contract_version,expires_at,id,operation,status,version':'command_id,contract_version,id,operation,status,version')||v.contract_version!=='team.v1'||v.operation!==op||v.command_id!==input.command_id||!uuid(v.id)||!version(v.version))return null
  const state=['member.invite_intent','member.reissue_invite'].includes(op)?'pending':op==='member.cancel_invite'?'cancelled':op==='member.suspend'?'suspended':op==='member.remove'?'removed':'active'
  if(v.status!==state||v.version!==('expected_version'in input?input.expected_version+1:1)||'id'in input&&v.id!==input.id)return null
  if(op==='member.reissue_invite'&&(typeof v.expires_at!=='string'||v.expires_at.length>40||!Number.isFinite(Date.parse(v.expires_at))))return null
  return Object.freeze({...v})as TeamReceiptV1
 }catch{return null}
}
export function parseTeamListInputV1(v:unknown):TeamListInputV1|null{
 try{if(!plain(v)||Object.keys(v).some(k=>!['limit','after_id'].includes(k))||'limit'in v&&(!Number.isInteger(v.limit)||(v.limit as number)<1||(v.limit as number)>100)||'after_id'in v&&!uuid(v.after_id))return null
 return Object.freeze({...v,...('after_id'in v?{after_id:(v.after_id as string).toLowerCase()}:{})})as TeamListInputV1
 }catch{return null}
}
export function parseTeamListV1(input:TeamListInputV1,v:unknown):TeamListV1|null{
 try{
  if(!plain(v)||!keys(v,'contract_version,items,next_id,operation')||v.contract_version!=='team.v1'||v.operation!=='member.list'||!Array.isArray(v.items)||Object.getPrototypeOf(v.items)!==Array.prototype||Reflect.ownKeys(v.items).length!==v.items.length+1||v.items.length>(input.limit??20))return null
  let last=input.after_id??'';const users=new Set();const rows=[]
  for(let i=0;i<v.items.length;i++){
   const descriptor=Object.getOwnPropertyDescriptor(v.items,String(i));if(!descriptor||descriptor.get||descriptor.set)return null
   const row=descriptor.value
   if(!plain(row)||!keys(row,'id,role,status,user_id,version')||!uuid(row.id)||!uuid(row.user_id)||row.id<=last||users.has(row.user_id)||!version(row.version)||!['owner','admin','member','viewer'].includes(row.role as string)||!['active','suspended','removed'].includes(row.status as string))return null
   last=row.id;users.add(row.user_id);rows.push(Object.freeze({...row}))
  }
  if(v.next_id!==null&&(v.next_id!==last||v.items.length!==(input.limit??20)))return null
  return Object.freeze({...v,items:Object.freeze(rows)})as TeamListV1
 }catch{return null}
}

export function parseTeamInviteListV1(input:TeamListInputV1,v:unknown):TeamInviteListV1|null{
 try{
 if(!plain(v)||!keys(v,'contract_version,items,next_id,operation')||v.contract_version!=='team.v1'||v.operation!=='member.invite_list'||!Array.isArray(v.items)||v.items.length>(input.limit??20))return null
 let last=input.after_id??'';const rows=[]
 for(const row of v.items){if(!plain(row)||!keys(row,'email,expires_at,id,role,status,version')||!uuid(row.id)||row.id<=last||!version(row.version)||!['admin','member','viewer'].includes(row.role as string)||!['pending','expired','cancelled'].includes(row.status as string)||typeof row.email!=='string'||row.email.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)||typeof row.expires_at!=='string'||row.expires_at.length>40||!Number.isFinite(Date.parse(row.expires_at)))return null;last=row.id;rows.push(Object.freeze({...row}))}
 if(v.next_id!==null&&(v.next_id!==last||rows.length!==(input.limit??20)))return null
 return Object.freeze({...v,items:Object.freeze(rows)})as TeamInviteListV1
 }catch{return null}
}
