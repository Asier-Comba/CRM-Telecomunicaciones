import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHistoryDataV2, historyRequestV2, HistoryClientErrorV2 } from '../../src/features/assistant/history-client-v2.ts'
const id='10000000-0000-4000-8000-000000000001', next='10000000-0000-4000-8000-000000000002', date='2026-10-08T12:00:00Z'
const row={id,title:'Conversación española',archived:false,version:1,created_at:date,updated_at:date}
const record={contract:'assistant.thread.v2',record:row}
const message={id,turn_id:next,sequence:1,role:'user',content:'<img src=x onerror=alert(1)>',created_at:date}
test('history display rejects injected fields, mismatched identities, stale CAS and false archive receipts',()=>{
 assert.deepEqual(parseHistoryDataV2('thread.get',{id},record),record)
 for(const invalid of [{...record,actor_id:id},{...record,record:{...row,id:next}},{...record,record:{...row,secret:'private'}},{...record,record:{...row,version:0}}])assert.equal(parseHistoryDataV2('thread.get',{id},invalid),null)
 assert.equal(parseHistoryDataV2('thread.rename',{id,title:'Nuevo',expected_version:1},{...record,record:{...row,title:'Nuevo'}}),null)
 assert.equal(parseHistoryDataV2('thread.archive',{id,expected_version:1},{...record,record:{...row,version:2}}),null)
 assert.ok(parseHistoryDataV2('thread.create',{id,title:'界'.repeat(120)},{...record,record:{...row,title:'界'.repeat(120)}}))
 let read=false;const hostile={...row};Object.defineProperty(hostile,'title',{enumerable:true,get(){read=true;throw Error('must not execute')}})
 assert.equal(parseHistoryDataV2('thread.get',{id},{...record,record:hostile}),null);assert.equal(read,false)
})
test('history pages preserve server cursors and reject invented completeness or unordered/duplicate rows',()=>{
 const list={contract:'assistant.threads.v2',items:[row],next_id:id}
 assert.ok(parseHistoryDataV2('thread.list',{limit:1},list))
 for(const invalid of [{...list,next_id:next},{...list,items:[{...row,archived:true}]},{...list,items:[row,row]}])assert.equal(parseHistoryDataV2('thread.list',{limit:1},invalid),null)
 assert.equal(parseHistoryDataV2('thread.list',{limit:1,after_id:id},list),null)
 const page={contract:'assistant.messages.v2',items:[message],next_sequence:1,historical:true}
 assert.ok(parseHistoryDataV2('message.page',{id,limit:1},page))
 for(const invalid of [{...page,historical:false},{...page,next_sequence:2},{...page,items:[message,{...message,sequence:2}]},{...page,items:[{...message,content:'界'.repeat(3000)}]}])assert.equal(parseHistoryDataV2('message.page',{id,limit:2},invalid),null)
 assert.equal(parseHistoryDataV2('message.page',{id,limit:1,after_sequence:1},page),null)
})
test('cookie-only browser transport uses one fixed endpoint, no-store and closed envelopes; no authority from history',async()=>{
 let seen
 const input={id,title:'Contenido histórico literal'}
 const request=async(url,options)=>{seen={url,...options};return Response.json({ok:true,data:{...record,record:{...row,title:input.title}}})}
 assert.equal((await historyRequestV2('thread.create',input,new AbortController().signal,request)).record.id,id)
 assert.equal(seen.url,'/api/assistant/v2/threads');assert.equal(seen.credentials,'same-origin');assert.equal(seen.cache,'no-store');assert.deepEqual(JSON.parse(seen.body),{operation:'thread.create',input});assert.deepEqual(Object.keys(seen.headers),['Content-Type'])
 for(const body of [{ok:true,data:record,extra:true},{ok:false,error:'foreign_error'},{ok:true,data:{...record,record:{...row,id:next}}}])await assert.rejects(()=>historyRequestV2('thread.get',{id},new AbortController().signal,async()=>Response.json(body)),error=>error instanceof HistoryClientErrorV2&&error.code==='invalid_response')
 await assert.rejects(()=>historyRequestV2('thread.get',{id},new AbortController().signal,async()=>Response.json({ok:false,error:'access_denied'},{status:403})),error=>error.code==='access_denied')
 let count=0;await assert.rejects(()=>historyRequestV2('thread.create',input,new AbortController().signal,async()=>{count++;throw Error('synthetic dropped response')}),error=>error.code==='transport_uncertain');assert.equal(count,1)
})
