import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readCompleteOwnedGroundingHistoryV1} from '../../scripts/security/supabase-local/assistant-grounding-history-page-v1.mjs'
const uuid=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0'),thread=uuid(900)
const rows=(first,count)=>Array.from({length:count},(_,i)=>({id:uuid(first+i),sequence:first+i,turn_id:uuid(800),role:i%2?'assistant':'user',content:'Synthetic historical text',created_at:'2026-10-13T00:00:00Z'}))
const reply=(items,next_sequence=null)=>({ok:true,data:{contract:'assistant.messages.v2',historical:true,items,next_sequence}})

test('complete owned history crosses the fifty-message page without dropping records or changing scope',async()=>{
 const calls=[]
 const result=await readCompleteOwnedGroundingHistoryV1(async(op,input)=>{calls.push([op,input]);return input.after_sequence?reply(rows(51,5)):reply(rows(1,50),50)},thread)
 assert.equal(result.data.items.length,55);assert.equal(result.page_count,2)
 assert.deepEqual(result.data.items.map(r=>r.sequence),Array.from({length:55},(_,i)=>i+1))
 assert.deepEqual(calls,[['message.page',{id:thread,limit:50}],['message.page',{id:thread,limit:50,after_sequence:50}]])
})

test('late denial repeated identity and malformed cursor cannot become accepted partial history',async()=>{
 for(const mode of ['deny','repeat','cursor']){
  let calls=0
  await assert.rejects(readCompleteOwnedGroundingHistoryV1(async()=>{
   calls++;if(calls===1)return reply(rows(1,50),50)
   if(mode==='deny')return{ok:false,error:'access_changed'}
   if(mode==='repeat')return reply([{...rows(51,1)[0],id:uuid(1)}])
   return reply(rows(51,1),50)
  },thread),{message:'OWNED_GROUNDING_HISTORY_UNAVAILABLE'})
  assert.equal(calls,2)
 }
})

test('owned history has a hard four-page bound and rejects bad thread before calling the port',async()=>{
 let calls=0
 await assert.rejects(readCompleteOwnedGroundingHistoryV1(async()=>{const first=++calls*50-49;return reply(rows(first,50),first+49)},thread),{message:'OWNED_GROUNDING_HISTORY_UNAVAILABLE'})
 assert.equal(calls,4)
 await assert.rejects(readCompleteOwnedGroundingHistoryV1(async()=>{calls++;throw Error('private fixture reply')},'raw-not-a-thread'),{message:'OWNED_GROUNDING_HISTORY_UNAVAILABLE'})
 assert.equal(calls,4)
})
