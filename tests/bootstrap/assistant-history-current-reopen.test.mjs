import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {currentHistoryReopen} from '../../scripts/security/supabase-local/assistant-history-current-reopen.mjs'
const origin='http://127.0.0.1:3109',url=origin+'/assistant',thread={id:'00000000-0000-4000-8000-000000000001',title:'Synthetic renamed history',archived:false,version:2,created_at:'2026-10-10T00:00:00Z',updated_at:'2026-10-10T00:00:00Z'}
const inputs=[['thread.list',{limit:20}],['thread.get',{id:thread.id}],['message.page',{id:thread.id,limit:20}]]
const values=[{contract:'assistant.threads.v2',items:[thread],next_id:null},{contract:'assistant.thread.v2',record:thread},{contract:'assistant.messages.v2',items:[],next_sequence:null,historical:true}]
function fixture(){
 const page=new EventEmitter(),main={url:()=>url};let predicate,resolve,reject
 page.url=()=>url;page.mainFrame=()=>main
 page.waitForResponse=fn=>{predicate=fn;return new Promise((yes,no)=>{resolve=yes;reject=no})}
 const request=(index,extra={})=>({frame:()=>main,method:()=> 'POST',url:()=>origin+'/api/assistant/v2/threads',postDataJSON:()=>({operation:inputs[index][0],input:inputs[index][1]}),...extra})
 const deliver=async(index,{emit=true,status=200,body={ok:true,data:values[index]},extra={},json}={})=>{
  const r=request(index,extra),response={request:()=>r,status:()=>status,json:json??(async()=>body)}
  if(emit)page.emit('request',r)
  if(await predicate(response))resolve(response)
 }
 return{page,main,deliver,reject:()=>reject(Error('SYNTHETIC_WAITER_DISPOSED'))}
}
const run=(f,action,extra={})=>currentHistoryReopen({page:f.page,origin,thread,action,...extra})
const clean=f=>{for(const event of ['request','framenavigated'])assert.equal(f.page.listenerCount(event),0)}
test('only new current-document exact reads are validated in order alongside the unchanged action',async()=>{
 const f=fixture(),steps=[];let actions=0
 await run(f,async()=>{
  actions++
  await f.deliver(0,{emit:false})
  await f.deliver(0,{extra:{method:()=> 'GET'}})
  await f.deliver(0,{extra:{frame:()=>({url:()=>url})}})
  await f.deliver(0,{extra:{postDataJSON:()=>({operation:'thread.list',input:{limit:20},private:'synthetic'})}})
  await Promise.all([f.deliver(0),f.deliver(1),f.deliver(2)])
 },{step:value=>steps.push(value)})
 assert.equal(actions,1);assert.deepEqual(steps,['HISTORY_REOPEN_CLICK','HISTORY_REOPEN_LIST_CURRENT_RESPONSE','HISTORY_REOPEN_GET_CURRENT_RESPONSE','HISTORY_REOPEN_MESSAGES_CURRENT_RESPONSE','HISTORY_REOPEN_CURRENT_RENDER']);clean(f)
})
test('upstream refusal and unavailable body stop with constant phase codes without leaking details',async()=>{
 for(const [configuration,code] of [[{status:500,body:'synthetic private HTML'},'HTTP_REFUSED'],[{json:async()=>{throw Error('synthetic private body')}},'BODY_UNAVAILABLE']]){
  const f=fixture();await assert.rejects(run(f,async()=>{await f.deliver(0);await f.deliver(1,configuration)}),{message:'HISTORY_REOPEN_GET_'+code});clean(f)
 }
})
test('closed envelope, current thread identity/version and typed message page remain required',async()=>{
 for(const [index,body,code] of [[0,{ok:true,data:values[0],private:'synthetic'},'LIST_ENVELOPE_INVALID'],[0,{ok:true,data:{...values[0],items:[]}},'LIST_CURRENT_THREAD_MISSING'],[1,{ok:true,data:{...values[1],record:{...thread,id:'00000000-0000-4000-8000-000000000002'}}},'GET_DTO_INVALID'],[1,{ok:true,data:{...values[1],record:{...thread,version:1}}},'GET_CURRENT_THREAD_MISSING'],[2,{ok:true,data:{...values[2],historical:false}},'MESSAGES_DTO_INVALID']]){
  const f=fixture();await assert.rejects(run(f,async()=>{for(let i=0;i<=index;i++)await f.deliver(i,{body:i===index?body:{ok:true,data:values[i]}})}),{message:'HISTORY_REOPEN_'+code});clean(f)
 }
})
test('navigation invalidates captured responses and action rejection still observes late waiter disposal',async()=>{
 const f=fixture();await assert.rejects(run(f,async()=>{
  await f.deliver(0);f.page.emit('framenavigated',f.main);await f.deliver(1);await f.deliver(2);f.reject()
 }),{message:'SYNTHETIC_WAITER_DISPOSED'});clean(f)
 const g=fixture();await assert.rejects(run(g,()=>{setImmediate(g.reject);throw Error('SYNTHETIC_RENDER_FAILED')}),{message:'SYNTHETIC_RENDER_FAILED'});await new Promise(resolve=>setImmediate(resolve));clean(g)
})
test('invalid destination/record/action is refused before observers or action',async()=>{
 for(const extra of [{origin:'http://foreign.invalid'},{thread:{...thread,archived:true}},{thread:{...thread,version:0}},{action:null}]){
  const f=fixture();let actions=0;await assert.rejects(run(f,()=>{actions++},extra));assert.equal(actions,0);clean(f)
 }
})
