import type {PortfolioInputsV1,PortfolioOperationV1,PortfolioReceiptV1,PortfolioGetInputV1,PortfolioGetV1}from '../contracts/portfolio-v1'
import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import {snapshotProductJsonV1}from './product-query-runtime-v1.ts'
import {isStrictCalendarDateV1}from './telecom-runtime-v1.ts'
const version=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0&&v<1e15
const date=(v:unknown)=>isStrictCalendarDateV1(v)&&v>='1900-01-01'&&v<='2199-12-31'
const label=(v:unknown)=>typeof v==='string'&&v.trim().length>0&&v.length<=200&&!/[\u0000-\u001f\u007f-\u009f]/.test(v)
const keys=(v:Record<string,unknown>,k:string)=>Object.keys(v).sort().join(',')===k.split(',').sort().join(',')
const serviceKinds=['mobile','fiber','fixed_voice','data_connectivity','other']
export const PORTFOLIO_RPC_V1={
 'contract.create_manual':'portfolio_v1_contract_create_manual','contract.update_allowed_metadata':'portfolio_v1_contract_update_allowed_metadata','contract.activate':'portfolio_v1_contract_activate','contract.cancel':'portfolio_v1_contract_cancel',
 'service.create_manual':'portfolio_v1_service_create_manual','service.update_label':'portfolio_v1_service_update_label','service.transition':'portfolio_v1_service_transition',
 'line.create_manual':'portfolio_v1_line_create_manual','line.update_label':'portfolio_v1_line_update_label','line.transition':'portfolio_v1_line_transition'
}as const
export function isPortfolioOperationV1(v:unknown):v is PortfolioOperationV1{return typeof v==='string'&&Object.hasOwn(PORTFOLIO_RPC_V1,v)}
export function parsePortfolioInputV1<O extends PortfolioOperationV1>(op:O,value:unknown):PortfolioInputsV1[O]|null{
 try{
  if(!isPortfolioOperationV1(op)||!plain(value)||!uuid(value.command_id))return null
  const required:Record<PortfolioOperationV1,string>={
   'contract.create_manual':'command_id,customer_id,operator_id,start_date','contract.update_allowed_metadata':'command_id,id,expected_version,assigned_user_id','contract.activate':'command_id,id,expected_version,signed_date','contract.cancel':'command_id,id,expected_version',
   'service.create_manual':'command_id,contract_id,service_kind,display_name','service.update_label':'command_id,id,expected_version,display_name','service.transition':'command_id,id,expected_version,status,effective_on',
   'line.create_manual':'command_id,service_id,display_name','line.update_label':'command_id,id,expected_version,display_name','line.transition':'command_id,id,expected_version,status,effective_on'
  }
  const req=required[op].split(','),optional=op==='contract.create_manual'?['plan_version_id','assigned_user_id']:op==='service.create_manual'?['plan_version_id']:[]
  if(req.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>![...req,...optional].includes(k)))return null
  for(const [k,v]of Object.entries(value)){
   if(v===null){if(!['plan_version_id','assigned_user_id'].includes(k))return null}
   else if(k.endsWith('_id')||k==='id'){if(!uuid(v))return null}
   else if(k==='expected_version'){if(!version(v))return null}
   else if(['start_date','signed_date','effective_on'].includes(k)){if(!date(v))return null}
   else if(k==='display_name'){if(!label(v))return null}
   else if(k==='service_kind'){if(!serviceKinds.includes(v as string))return null}
   else if(k==='status'&&!['active','suspended','ended','cancelled'].includes(v as string))return null
  }
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([k,v])=>[k,(k==='id'||k.endsWith('_id'))&&typeof v==='string'?v.toLowerCase():v])))as PortfolioInputsV1[O]
 }catch{return null}
}
export function parsePortfolioReceiptV1(op:PortfolioOperationV1,input:PortfolioInputsV1[PortfolioOperationV1],value:unknown):PortfolioReceiptV1|null{
 try{
  if(!plain(value)||!keys(value,'contract_version,operation,command_id,id,version,status,source')||value.contract_version!=='portfolio.v1'||value.operation!==op||value.command_id!==input.command_id||!uuid(value.id)||!version(value.version)||!['manual','import','integration'].includes(value.source as string))return null
  if(value.version!==('expected_version'in input?input.expected_version+1:1)||'id'in input&&value.id!==input.id)return null
  const status=op.endsWith('.create_manual')?(op.startsWith('contract.')?'draft':'pending'):op==='contract.activate'?'active':op==='contract.cancel'?'cancelled':'status'in input?input.status:null
  const allowed=op.startsWith('contract.')?['draft','active','ended','cancelled']:['pending','active','suspended','ended','cancelled']
  if(status!==null?value.status!==status:!allowed.includes(value.status as string))return null
  if(!op.endsWith('update_label')&&op!=='contract.update_allowed_metadata'&&value.source!=='manual')return null
  return Object.freeze({...value})as PortfolioReceiptV1
 }catch{return null}
}
export function parsePortfolioGetInputV1(v:unknown):PortfolioGetInputV1|null{
 try{if(!plain(v)||!keys(v,'kind,id')||!['contract','service','line'].includes(v.kind as string)||!uuid(v.id))return null;return Object.freeze({...v,id:v.id.toLowerCase()})as PortfolioGetInputV1}catch{return null}
}
export function parsePortfolioGetV1(input:PortfolioGetInputV1,value:unknown):PortfolioGetV1|null{
 try{
  const v=snapshotProductJsonV1(value)
  if(!plain(v)||!keys(v,'contract_version,kind,record')||v.contract_version!=='portfolio.v1'||v.kind!==input.kind||!plain(v.record))return null
  const r=v.record,fields={contract:'id,version,status,source,customer_id,operator_id,plan_version_id,start_date,signed_date,end_date,assigned_user_id',service:'id,version,status,source,customer_id,contract_id,operator_id,plan_version_id,service_kind,display_name,activated_on,ended_on,status_effective_on',line:'id,version,status,source,service_id,display_name,activated_on,ended_on,status_effective_on'}[input.kind]
  if(!keys(r,fields)||r.id!==input.id||!version(r.version)||!['manual','import','integration'].includes(r.source as string))return null
  for(const[k,x]of Object.entries(r)){
   if(k==='id'||k.endsWith('_id')){if(!uuid(x)&&!(x===null&&['plan_version_id','assigned_user_id'].includes(k)))return null}
   if(['start_date','signed_date','end_date','activated_on','ended_on','status_effective_on'].includes(k)&&x!==null&&!date(x))return null
  }
  if(input.kind==='contract'){
   if(!['draft','active','ended','cancelled'].includes(r.status as string)||!date(r.start_date)||r.end_date!==null&&(r.end_date as string)<(r.start_date as string)||r.status==='ended'&&r.end_date===null)return null
  }else{
   if(!['pending','active','suspended','ended','cancelled'].includes(r.status as string)||input.kind==='service'&&(!serviceKinds.includes(r.service_kind as string)||!label(r.display_name))||input.kind==='line'&&r.display_name!==null&&!label(r.display_name))return null
   if(r.status_effective_on!==null&&(r.activated_on!==null&&(r.status_effective_on as string)<(r.activated_on as string)||r.ended_on!==null&&r.status_effective_on!==r.ended_on))return null
   const st=r.status
   if(st==='pending'&&(r.activated_on!==null||r.ended_on!==null)||['active','suspended'].includes(st as string)&&(r.activated_on===null||r.ended_on!==null)||st==='ended'&&(r.activated_on===null||r.ended_on===null)||st==='cancelled'&&r.ended_on===null||r.activated_on!==null&&r.ended_on!==null&&(r.ended_on as string)<(r.activated_on as string))return null
  }
  return v as PortfolioGetV1
 }catch{return null}
}
