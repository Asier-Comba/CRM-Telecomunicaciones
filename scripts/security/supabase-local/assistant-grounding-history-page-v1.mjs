import {parseConversationInputV2,parseConversationResultV2} from '../../../src/assistant/conversation-contract-v2.ts'
import {snapshotProductJsonV1} from '../../../src/lib/server/product-query-runtime-v1.ts'
const unavailable=()=>Error('OWNED_GROUNDING_HISTORY_UNAVAILABLE')

/** Acceptance-only consumer of the existing authorized message.page service.
 * Read the entire owned fixture ledger, at most four pages/200 messages. Never
 * publish partial results or raw replies; no retry or permission bypass. */
export async function readCompleteOwnedGroundingHistoryV1(execute,thread){
 if(typeof execute!=='function')throw unavailable()
 let cursor=0
 const items=[],ids=new Set()
 try{
  for(let page=0;page<4;page++){
   const input=parseConversationInputV2('message.page',{id:thread,limit:50,...(cursor?{after_sequence:cursor}:{})})
   if(!input)throw unavailable()
   const reply=snapshotProductJsonV1(await execute('message.page',Object.freeze(input)))
   if(!reply||typeof reply!=='object'||Array.isArray(reply)||Object.keys(reply).sort().join(',')!=='data,ok'||reply.ok!==true)throw unavailable()
   const data=parseConversationResultV2('message.page',input,reply.data)
   if(!data||data.contract!=='assistant.messages.v2')throw unavailable()
   for(const item of data.items){if(ids.has(item.id))throw unavailable();ids.add(item.id);items.push(item)}
   if(data.next_sequence===null)return{ok:true,data:{contract:'assistant.messages.v2',historical:true,items,next_sequence:null},page_count:page+1}
   cursor=data.next_sequence
  }
  throw unavailable()
 }catch{throw unavailable()}
}
