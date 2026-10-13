import type {ReadAuthorityV2} from './product-read-executor-v2.ts'

/** Server-owned ledger/policy observation. This module neither books a reserve
 * nor authorizes provider dispatch. Never load it from browser/model input. */
export type TenantAiBudgetSnapshotV1={workspaceId:string;scopeEpoch:string;revision:number;
 periodStart:string;periodEnd:string;observedAt:string;ceilingMicrousd:string;spentMicrousd:string;
 reservedMicrousd:string;unsettledCalls:number;inputMicrousdPerMillion:number;outputMicrousdPerMillion:number}
declare const admitted:unique symbol
export type PreparedTenantAiBudgetV1=Readonly<{[admitted]:true}>
const observations=new WeakMap<object,{scope:ReadAuthorityV2;source:Readonly<TenantAiBudgetSnapshotV1>}>()
function record(raw:unknown,keys:string):Record<string,unknown>|null{
 try{
  if(!raw||typeof raw!=='object'||Object.getPrototypeOf(raw)!==Object.prototype)return null
  const fields=Object.getOwnPropertyDescriptors(raw)
  if(Reflect.ownKeys(fields).length!==keys.split(',').length||Object.keys(fields).sort().join(',')!==keys
   ||Object.values(fields).some(d=>!d.enumerable||!('value' in d)))return null
  return Object.fromEntries(keys.split(',').map(key=>[key,fields[key].value]))
 }catch{return null}
}
const identity=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(v)
const count=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=10_000_000
const money=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(v)&&BigInt(v)<=BigInt('1000000000000000000')
function instant(raw:unknown):number|null{
 if(typeof raw!=='string')return null
 const ms=Date.parse(raw)
 return Number.isFinite(ms)&&new Date(ms).toISOString()===raw?ms:null
}
function authority(raw:unknown):ReadAuthorityV2|null{
 const value=record(raw,'actorId,role,scopeEpoch,workspaceId')
 return value&&identity(value.actorId)&&identity(value.workspaceId)&&identity(value.scopeEpoch)
  &&typeof value.role==='string'&&['owner','admin','member','viewer'].includes(value.role)?Object.freeze(value) as ReadAuthorityV2:null
}
const same=(a:ReadAuthorityV2,b:ReadAuthorityV2)=>a.actorId===b.actorId&&a.workspaceId===b.workspaceId&&a.scopeEpoch===b.scopeEpoch&&a.role===b.role

export function prepareTenantAiBudgetV1(raw:unknown,scope:ReadAuthorityV2):PreparedTenantAiBudgetV1|null{
 const current=authority(scope),value=record(raw,'ceilingMicrousd,inputMicrousdPerMillion,observedAt,outputMicrousdPerMillion,periodEnd,periodStart,reservedMicrousd,revision,scopeEpoch,spentMicrousd,unsettledCalls,workspaceId')
 if(!current||!value||value.workspaceId!==current.workspaceId||value.scopeEpoch!==current.scopeEpoch
  ||!Number.isSafeInteger(value.revision)||Number(value.revision)<1||!count(value.unsettledCalls)
  ||!count(value.inputMicrousdPerMillion)||!count(value.outputMicrousdPerMillion)
  ||!money(value.ceilingMicrousd)||!money(value.spentMicrousd)||!money(value.reservedMicrousd))return null
 const start=instant(value.periodStart),end=instant(value.periodEnd),observed=instant(value.observedAt)
 if(start===null||end===null||observed===null||end<=start||end-start>32*86400000||observed<start||observed>=end)return null
 const handle=Object.freeze({}) as PreparedTenantAiBudgetV1
 observations.set(handle,{scope:current,source:Object.freeze(value) as TenantAiBudgetSnapshotV1})
 return handle
}
export type TenantAiBudgetQuoteV1={status:'reservation_required';revision:number;periodEnd:string;
 maxCostMicrousd:string;availableMicrousd:string;afterReservationMicrousd:string;dispatchAuthorized:false}
 |{status:'unavailable'|'budget_exceeded'|'not_billable';dispatchAuthorized:false}

/** An affordable quote is NOT a reusable ticket. A future atomic backend must
 * recheck revision/scope/period, reserve, then settle measured or unknown usage.
 * Missing charges fail closed; repeated/concurrent quotes spend nothing. */
export function quoteTenantAiCallV1(handle:PreparedTenantAiBudgetV1,scope:ReadAuthorityV2,
 request:unknown,nowMs:number):TenantAiBudgetQuoteV1{
 const denied=(status:'unavailable'|'budget_exceeded'|'not_billable'):TenantAiBudgetQuoteV1=>({status,dispatchAuthorized:false})
 const current=authority(scope),entry=observations.get(handle),input=record(request,'inputTokenCeiling,mode,outputTokenCeiling')
 if(!entry||!current||!same(current,entry.scope)||!input||!count(input.inputTokenCeiling)||!count(input.outputTokenCeiling)
  ||!Number.isSafeInteger(nowMs)||typeof input.mode!=='string'||!['reference','mock','llm'].includes(input.mode))return denied('unavailable')
 if(input.mode!=='llm')return denied('not_billable')
 const source=entry.source,start=instant(source.periodStart)!,end=instant(source.periodEnd)!,observed=instant(source.observedAt)!
 if(nowMs<start||nowMs>=end||nowMs<observed||nowMs-observed>60000||source.unsettledCalls!==0)return denied('unavailable')
 const available=BigInt(source.ceilingMicrousd)-BigInt(source.spentMicrousd)-BigInt(source.reservedMicrousd)
 const numerator=BigInt(input.inputTokenCeiling)*BigInt(source.inputMicrousdPerMillion)
  +BigInt(input.outputTokenCeiling)*BigInt(source.outputMicrousdPerMillion)
 const cost=(numerator+BigInt(999999))/BigInt(1000000)
 if(available<BigInt(0)||cost>available)return denied('budget_exceeded')
 return Object.freeze({status:'reservation_required',revision:source.revision,periodEnd:source.periodEnd,
  maxCostMicrousd:cost.toString(),availableMicrousd:available.toString(),afterReservationMicrousd:(available-cost).toString(),dispatchAuthorized:false})
}
