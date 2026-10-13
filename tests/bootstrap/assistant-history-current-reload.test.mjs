import test from 'node:test'
import assert from 'node:assert/strict'
import {currentHistoryReload} from '../../scripts/security/supabase-local/assistant-history-current-reload.mjs'

const origin='http://127.0.0.1:3108',url=origin+'/assistant?customer=synthetic'
const thread={id:'00000000-0000-4000-8000-000000000001',title:'Synthetic renamed history',archived:false,version:2,created_at:'2026-10-09T00:00:00.000Z',updated_at:'2026-10-09T00:00:00.000Z'}
const body=()=>({ok:true,data:{contract:'assistant.threads.v2',items:[{...thread}],next_id:null}})
function fixture(value=body(),status=200){
 const listeners=new Map(),frame={url:()=>url},seen=[]
 let predicate,resolveResponse
 const emit=(name,item)=>{for(const fn of listeners.get(name)??[])fn(item)}
 const request=(extra={})=>({frame:()=>frame,method:()=> 'POST',url:()=>origin+'/api/assistant/v2/threads',postDataJSON:()=>({operation:'thread.list',input:{limit:20}}),...extra})
 const response=(req)=>({request:()=>req,status:()=>status,json:async()=>value})
 const probe=(req)=>{emit('request',req);const accepted=predicate(response(req));seen.push(accepted);if(accepted)resolveResponse(response(req))}
 const page={url:()=>url,mainFrame:()=>frame,on:(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn)},off:(name,fn)=>listeners.get(name)?.delete(fn),waitForResponse:fn=>{predicate=fn;return new Promise(resolve=>{resolveResponse=resolve})},reload:async()=>{
  probe(request()) // A previous document's otherwise-valid late response.
  emit('framenavigated',{url:()=>url}) // Foreign iframe cannot arm current reads.
  probe(request())
  emit('framenavigated',frame)
  probe(request({method:()=> 'GET'}))
  probe(request({url:()=> 'http://foreign.invalid/api/assistant/v2/threads'}))
  probe(request({postDataJSON:()=>({operation:'thread.list',input:{limit:20,after_id:thread.id}})}))
  probe(request({postDataJSON:()=>({operation:'thread.list',input:{limit:20},private:'MUST_NOT_ACCEPT'})}))
  probe(request({frame:()=>({url:()=>url})}))
  probe(request())
 }}
 return {page,seen,listeners}
}
test('current document, exact ordinary list and parsed renamed record are required; no extra request or timeout',async()=>{
 const f=fixture(),steps=[]
 const value=await currentHistoryReload({page:f.page,origin,thread,step:step=>steps.push(step)})
 assert.deepEqual(value,body().data)
 assert.deepEqual(f.seen,[false,false,false,false,false,false,false,true])
 assert.deepEqual(steps,['HISTORY_RELOAD_NAVIGATION','HISTORY_RELOAD_CURRENT_RESPONSE','HISTORY_RELOAD_CURRENT_BODY','HISTORY_RELOAD_CURRENT_RENDER'])
 assert.ok([...f.listeners.values()].every(set=>set.size===0))
})
test('HTTP and closed envelope/data/current record refusal; listeners removed on every rejection',async()=>{
 const cases=[
  [body(),503,'HISTORY_RELOAD_HTTP_REFUSED'],
  [{...body(),private:'DO_NOT_ACCEPT'},200,'HISTORY_RELOAD_ENVELOPE_INVALID'],
  [{ok:false,error:'access_denied'},200,'HISTORY_RELOAD_ENVELOPE_INVALID'],
  [{ok:true,data:{...body().data,private:'DO_NOT_ACCEPT'}},200,'HISTORY_RELOAD_CURRENT_DTO_INVALID'],
  [{ok:true,data:{...body().data,items:[{...thread,private:'DO_NOT_ACCEPT'}]}},200,'HISTORY_RELOAD_CURRENT_DTO_INVALID'],
  [{ok:true,data:{...body().data,items:[{...thread,archived:true}]}},200,'HISTORY_RELOAD_CURRENT_DTO_INVALID'],
  ...[{id:'00000000-0000-4000-8000-000000000002'},{title:'Other title'},{version:1}].map(change=>[{ok:true,data:{...body().data,items:[{...thread,...change}]}},200,'HISTORY_RELOAD_CURRENT_THREAD_MISSING']),
  [{ok:true,data:{...body().data,items:[]}},200,'HISTORY_RELOAD_CURRENT_THREAD_MISSING']
 ]
 for(const [value,status,code] of cases){const f=fixture(value,status);await assert.rejects(currentHistoryReload({page:f.page,origin,thread}),error=>error.message===code);assert.ok([...f.listeners.values()].every(set=>set.size===0))}
})
test('invalid required record or foreign destination rejected before navigation/read',async()=>{
 for(const change of [{id:'invalid'},{title:''},{version:0},{archived:true},{private:'DO_NOT_ACCEPT'}]){
  const f=fixture();await assert.rejects(currentHistoryReload({page:f.page,origin,thread:{...thread,...change}}),{message:'HISTORY_RELOAD_THREAD_INVALID'});assert.equal(f.seen.length,0)
 }
 const f=fixture();await assert.rejects(currentHistoryReload({page:f.page,origin:'http://foreign.invalid',thread}),{message:'HISTORY_RELOAD_TARGET_INVALID'});assert.equal(f.seen.length,0)
})
test('failed navigation and non-JSON response clean up observers without exposing original errors',async()=>{
 const f=fixture();f.page.reload=async()=>{throw Error('SYNTHETIC_NAVIGATION_FAILED')}
 await assert.rejects(currentHistoryReload({page:f.page,origin,thread}),{message:'SYNTHETIC_NAVIGATION_FAILED'})
 assert.ok([...f.listeners.values()].every(set=>set.size===0))
 const g=fixture();const original=g.page.waitForResponse
 g.page.waitForResponse=predicate=>original(predicate).then(response=>({...response,json:async()=>{throw Error('PRIVATE_UNEXPECTED_BODY')}}))
 await assert.rejects(currentHistoryReload({page:g.page,origin,thread}),{message:'HISTORY_RELOAD_BODY_UNAVAILABLE'})
 assert.ok([...g.listeners.values()].every(set=>set.size===0))
})
