import {createHash} from 'node:crypto'
import {boundedAwaitV2} from './bounded-await-v2.ts'
import type {AuditDeliveryCursorV1,DurableAuditDeliveryPortV1,OriginalAuditEventV1} from './durable-audit-delivery-port.ts'

/** Private delivery orchestration only. No scheduler, provider or business effect. */
export const ORIGINAL_AUDIT_CONTENT_V1='assistant-original-audit-content.v1' as const
export type OriginalAuditPacketV1=Readonly<{event:Readonly<OriginalAuditEventV1>;digestAlgorithm:typeof ORIGINAL_AUDIT_CONTENT_V1;contentDigest:string}>
export type AuditDrainPageV1=Readonly<{
 status:'page_processed'|'empty_page'|'blocked'|'unavailable'|'cancelled'
 listed:number;delivered:number;skipped:number;uncertain:number
 blocker:null|'authority'|'version_exhausted'
 nextCursor:Readonly<AuditDeliveryCursorV1>|null
}>

// Explicit versioned field order includes original actor/request/reason/time.
// Never hash JSONB serialization, worker identity, a retry request or a claim.
export function originalAuditPacketV1(event:OriginalAuditEventV1):OriginalAuditPacketV1{
 const original=Object.freeze({eventRef:event.eventRef,workspaceId:event.workspaceId,operationRef:event.operationRef,
  operationVersion:event.operationVersion,actorId:event.actorId,capability:event.capability,argumentsDigest:event.argumentsDigest,
  event:event.event,requestId:event.requestId,createdAt:event.createdAt,reasonCode:event.reasonCode})
 const fields=[ORIGINAL_AUDIT_CONTENT_V1,original.eventRef,original.workspaceId,original.operationRef,original.operationVersion,
  original.actorId,original.capability,original.argumentsDigest,original.event,original.requestId,original.createdAt,original.reasonCode]
 return Object.freeze({event:original,digestAlgorithm:ORIGINAL_AUDIT_CONTENT_V1,
  contentDigest:createHash('sha256').update(JSON.stringify(fields),'utf8').digest('hex')})
}
function acceptedReceipt(value:unknown,packet:OriginalAuditPacketV1):string|null{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))
  ||Object.getOwnPropertySymbols(value).length)return null
 const descriptors=Object.getOwnPropertyDescriptors(value)
 if(Object.values(descriptors).some(d=>!('value'in d)||!d.enumerable)
  ||Object.keys(descriptors).sort().join(',')!=='contentDigest,digestAlgorithm,eventRef,receiptRef,status,workspaceId')return null
 const v=value as Record<string,unknown>
 return (v.status==='accepted'||v.status==='already_accepted')&&v.workspaceId===packet.event.workspaceId&&v.eventRef===packet.event.eventRef
  &&v.digestAlgorithm===packet.digestAlgorithm&&v.contentDigest===packet.contentDigest
  &&typeof v.receiptRef==='string'&&/^[A-Za-z0-9_-]{24,200}$/.test(v.receiptRef)?v.receiptRef:null
}
export function createDurableAuditDrainV1(dependencies:{
 // Compose the reviewed current-session port. It reauthorizes every list/claim/ACK.
 port:DurableAuditDeliveryPortV1
 // Trusted server sink must atomically dedup workspace/event AND exact content,
 // returning the original receipt on retry. Claim proof never reaches the sink.
 deliver:(packet:OriginalAuditPacketV1,signal:AbortSignal)=>Promise<unknown>
 timeoutMs?:number
}){
 const timeoutMs=dependencies.timeoutMs??10000
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw new Error('audit_drain_invalid_deadline')
 return {
  async processPage(after?:AuditDeliveryCursorV1,signal?:AbortSignal):Promise<AuditDrainPageV1>{
   const stop=new AbortController()
   const cancel=()=>stop.abort('cancelled')
   signal?.addEventListener('abort',cancel,{once:true})
   if(signal?.aborted)cancel()
   const timer=setTimeout(()=>stop.abort('deadline'),timeoutMs)
   let listed=0,delivered=0,skipped=0,stage:'listing'|'claim'|'sink'|'ack'='listing'
   const result=(status:AuditDrainPageV1['status'],uncertain=0,blocker:AuditDrainPageV1['blocker']=null,nextCursor:AuditDeliveryCursorV1|null=null):AuditDrainPageV1=>
    Object.freeze({status,listed,delivered,skipped,uncertain,blocker,nextCursor:nextCursor===null?null:Object.freeze({...nextCursor})})
   const current=()=>{if(stop.signal.aborted)throw new Error('audit_drain_stopped')}
   try{
    const page=await boundedAwaitV2(()=>dependencies.port.listEligible(after),stop.signal,timeoutMs)
    current()
    if(page.status==='forbidden')return result('blocked',0,'authority')
    listed=page.items.length
    for(const item of page.items){
     current()
     // Exhausted versions stay visible for operator intervention; no claim/wrap.
     if(item.version>=Number.MAX_SAFE_INTEGER-1)return result('blocked',0,'version_exhausted')
     stage='claim'
     const claimed=await boundedAwaitV2(()=>dependencies.port.claim(item.eventRef,item.version),stop.signal,timeoutMs)
     current()
     if(claimed.status==='forbidden')return result('blocked',0,'authority')
     if(claimed.status!=='applied'){skipped++;stage='listing';continue}
     stage='sink'
     const packet=originalAuditPacketV1(claimed.event)
     const receipt=acceptedReceipt(await boundedAwaitV2(()=>dependencies.deliver(packet,stop.signal),stop.signal,timeoutMs),packet)
     current()
     if(receipt===null)return result('unavailable',1)
     stage='ack'
     const acknowledged=await boundedAwaitV2(()=>dependencies.port.ack(claimed.claim,receipt),stop.signal,timeoutMs)
     current()
     if(acknowledged.status!=='applied')return result(acknowledged.status==='forbidden'?'blocked':'unavailable',1,
      acknowledged.status==='forbidden'?'authority':null)
     delivered++;stage='listing'
    }
    // A processed/empty page is an observation, never global queue emptiness.
    return result(listed===0?'empty_page':'page_processed',0,null,page.nextCursor)
   }catch{
    // Claim/sink/ACK timeout may have committed. Stop, expose no raw failure,
    // and retry from the head after current DB eligibility permits a new claim.
    return result(stop.signal.reason==='cancelled'?'cancelled':'unavailable',stage==='listing'?0:1)
   }finally{
    clearTimeout(timer);signal?.removeEventListener('abort',cancel)
   }
  },
 }
}
