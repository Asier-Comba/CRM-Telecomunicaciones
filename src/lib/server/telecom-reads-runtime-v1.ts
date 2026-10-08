import type {TelecomReadInputsV1,TelecomReadOperationV1,TelecomReadResultV1}from '../contracts/telecom-reads-v1'
import {TELECOM_READ_SPECS_V1}from './telecom-reads-specs-v1.ts'
import {snapshotProductJsonV1}from './product-query-runtime-v1.ts'
import {isClosedObjectV1 as plain,isUuidV1 as uuid}from './product-work-runtime-v1.ts'
import {isStrictCalendarDateV1}from './telecom-runtime-v1.ts'
type Rule=string|readonly string[]
type Spec=Readonly<{filters:readonly string[];required:readonly string[];fields?:Readonly<Record<string,Rule>>;record?:Readonly<Record<string,Rule>>;key?:string;unassigned?:boolean}>
const specs:Readonly<Record<string,Spec>>=TELECOM_READ_SPECS_V1
const keys=(v:Record<string,unknown>,want:readonly string[])=>Object.keys(v).sort().join(',')===[...want].sort().join(',')
const date=(v:unknown):v is string=>isStrictCalendarDateV1(v)&&v>='2000-01-01'&&v<='2100-12-31'
const month=(v:unknown):v is string=>date(v)&&v.endsWith('-01')
const count=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<1e15
const field=(rule:Rule,v:unknown):boolean=>typeof rule!=='string'?typeof v==='string'&&rule.includes(v):rule==='uuid'?uuid(v):rule==='month'?month(v):rule==='count?'?v===null||count(v):rule==='count'&&count(v)
export function isTelecomReadOperationV1(op:unknown):op is TelecomReadOperationV1{return typeof op==='string'&&Object.hasOwn(specs,op)}
export function parseTelecomReadInputV1<O extends TelecomReadOperationV1>(op:O,value:unknown):TelecomReadInputsV1[O]|null{try{
 if(!isTelecomReadOperationV1(op))return null;const v=snapshotProductJsonV1(value),s=specs[op]
 if(!plain(v)||Object.keys(v).some(k=>!s.filters.includes(k))||s.required.some(k=>!Object.hasOwn(v,k)))return null
 for(const[k,x]of Object.entries(v)){if(k==='limit'){if(typeof x!=='number'||!Number.isInteger(x)||x<1||x>100)return null}else if(k.endsWith('_id')){if(!uuid(x))return null}else if(!month(x))return null}
 if(Object.hasOwn(v,'from_month')){const from=v.from_month as string,to=v.to_month as string;if(to<from)return null;const span=(Number(to.slice(0,4))-Number(from.slice(0,4)))*12+Number(to.slice(5,7))-Number(from.slice(5,7));if(span>=24)return null}
 return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,x])=>[k,typeof x==='string'&&k.endsWith('_id')?x.toLowerCase():x])))as TelecomReadInputsV1[O]
}catch{return null}}
export function parseTelecomReadResultV1<O extends TelecomReadOperationV1>(op:O,input:TelecomReadInputsV1[O],value:unknown):TelecomReadResultV1<O>|null{try{
 if(!isTelecomReadOperationV1(op))return null;const v=snapshotProductJsonV1(value),s=specs[op],i=input as Record<string,unknown>,one=op==='customer360.summary'
 if(!plain(v)||!keys(v,one?['contract_version','operation','as_of','record']:['contract_version','operation','as_of','items','next_id',...(s.unassigned?['unassigned_counts']:[])])||v.contract_version!=='telecom.reads.v1'||v.operation!==op||!date(v.as_of))return null
 const rules=s.record??s.fields??{},rows=one?[v.record]:v.items,max=one?1:s.key==='id'?(i.limit as number??50):s.key==='month'?24:op==='report.cases_by_priority_status'?28:7
 if(!Array.isArray(rows)||rows.length>max)return null;let previous=(i.after_id as string)??'';const rowKeys:string[]=[]
 for(const row of rows){if(!plain(row)||!keys(row,Object.keys(rules))||Object.entries(rules).some(([k,r])=>!field(r,row[k])))return null
 if(one){if(row.customer_id!==i.customer_id)return null}else{const key=(s.key??'').split(',').map(k=>row[k]).join(',');if(key<=previous)return null;previous=key;rowKeys.push(key)}
 if(op==='report.operator_portfolio'&&i.operator_id!==undefined&&row.id!==i.operator_id||op==='report.pipeline_by_stage'&&i.stage_id!==undefined&&row.id!==i.stage_id||op==='report.commercial_owner_counts'&&i.owner_user_id!==undefined&&row.id!==i.owner_user_id)return null
 }
 if(!one){if(s.key==='id'){if(v.next_id!==null&&(!uuid(v.next_id)||rows.length!==max||v.next_id!==previous))return null}else{
 if(v.next_id!==null)return null
 if(s.key==='month'){const expected:string[]=[];const end=i.to_month as string;for(let m=i.from_month as string;m<=end;){expected.push(m);const d=new Date(m+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);m=d.toISOString().slice(0,10)}if(rowKeys.join('|')!==expected.join('|'))return null}
 else{const enums=(s.key??'').split(',').map(k=>rules[k]as readonly string[]);const expected=enums.length===1?[...enums[0]]:enums[0].flatMap(a=>enums[1].map(b=>a+','+b));if(rowKeys.join('|')!==expected.sort().join('|'))return null}
 }}
 if(s.unassigned&&(!plain(v.unassigned_counts)||!keys(v.unassigned_counts,['contracts','opportunities','tasks','cases'])||Object.values(v.unassigned_counts).some(x=>!count(x))))return null
 return v as TelecomReadResultV1<O>
}catch{return null}}
