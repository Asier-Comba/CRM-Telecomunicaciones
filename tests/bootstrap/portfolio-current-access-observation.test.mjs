import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {currentPortfolioReference} from '../../scripts/security/supabase-local/product-portfolio-reference-read.mjs'
const origin='http://127.0.0.1:3109',authOrigin='http://127.0.0.1:54321',id='00000000-0000-4000-8000-000000000001'
const record={id,version:1,status:'active',source:'manual',customer_id:'00000000-0000-4000-8000-000000000002',operator_id:'00000000-0000-4000-8000-000000000003',plan_version_id:null,start_date:'2026-10-09',signed_date:null,end_date:null,assigned_user_id:null}
const envelope={ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record}}
function fixture({navigate,status=200,body=envelope}={}){
 const page=new EventEmitter(),main={url:()=>page.destination},foreign={url:()=>page.destination}
 page.mainFrame=()=>main;page.navigations=[];page.evaluate=async()=> 'not_present'
 const request=({method='GET',url=authOrigin+'/auth/v1/user',frame=main}={})=>({method:()=>method,url:()=>url,frame:()=>frame,headers:()=>{throw Error('private synthetic header must not be read')},postDataJSON:()=>{throw Error('private synthetic body must not be read')}})
 const portfolio={...request({method:'POST',url:origin+'/api/portfolio/v1/queries'}),postDataJSON:()=>({operation:'portfolio.get',input:{kind:'contract',id}}),response:async()=>({status:()=>status,json:async()=>body})}
 page.waitForRequest=predicate=>new Promise((resolve,reject)=>{
  const listener=value=>{if(predicate(value)){page.off('request',listener);resolve(value)}}
  page.on('request',listener);page.rejectPending=()=>{page.off('request',listener);reject(Error('synthetic pending request failure'))}
 })
 page.goto=async url=>{
  page.navigations.push(url);page.destination=url;if(url==='about:blank')return
  page.emit('framenavigated',main)
  if(navigate)await navigate({page,main,foreign,request,portfolio})
  page.emit('request',portfolio)
 }
 return{page,main,request}
}
const run=(f,report={w2_ui_action_step:'layout:portfolio:768:exact_reference'},extra={})=>currentPortfolioReference({page:f.page,origin,authOrigin,kind:'contract',id,report,...extra})
test('only current main-document exact auth user headers are counted; no identity, body, headers, URL or error is retained',async()=>{
 const report={w2_ui_action_step:'layout:portfolio:768:exact_reference'}
 let old
 const f=fixture({navigate:async({page,main,foreign,request})=>{
  page.emit('response',{request:()=>old,status:()=>200})
  for(const r of [request({frame:foreign}),request({url:'https://private.invalid/auth/v1/user'}),request({method:'POST'}),request({url:authOrigin+'/auth/v1/user?private=synthetic'})])page.emit('request',r)
  const r=request();page.emit('request',r);page.emit('response',{request:()=>r,status:()=>200,json:()=>{throw Error('private body must not be read')}})
  assert.equal(main,page.mainFrame())
 }})
 old=f.request();const wait=f.page.waitForRequest
 f.page.waitForRequest=predicate=>{const pending=wait(predicate);f.page.emit('request',old);return pending}
 assert.deepEqual(await run(f,report),envelope.data)
 assert.deepEqual(report.w2_portfolio_access_observations,[{scope:'CURRENT_MAIN_DOCUMENT_AUTH_USER_HEADERS_NOT_AUTHORIZATION',width:768,document_observed:true,navigation_completed:true,gate_stage:'not_present',requests:1,responses:1,failures:0,pending:0,status_counts:{ok:1,denied:0,client_error:0,server_error:0,other:0},truncated:false}])
 assert.equal(JSON.stringify(report).includes('private'),false)
 for(const event of ['framenavigated','request','response','requestfailed'])assert.equal(f.page.listenerCount(event),0)
})
test('denied/upstream headers, failed transport and pending read stay distinguishable without inferring authorization',async()=>{
 const report={w2_ui_action_step:'layout:portfolio:390:exact_reference'}
 const f=fixture({navigate:async({page,request})=>{
  for(const status of [401,503]){const r=request();page.emit('request',r);page.emit('response',{request:()=>r,status:()=>status})}
  const failed=request();page.emit('request',failed);page.emit('requestfailed',failed);page.emit('request',request())
 }})
 await run(f,report);const o=report.w2_portfolio_access_observations[0]
 assert.deepEqual([o.width,o.requests,o.responses,o.failures,o.pending],[390,4,2,1,1]);assert.deepEqual(o.status_counts,{ok:0,denied:1,client_error:0,server_error:1,other:0})
})
test('navigation rejection and a later pending-read rejection are both observed and access listeners are removed',async()=>{
 const report={},f=fixture({navigate:async({page})=>{setTimeout(()=>page.rejectPending(),5);throw Error('synthetic navigation failure')}})
 await assert.rejects(run(f,report));await new Promise(resolve=>setTimeout(resolve,20))
 assert.equal(report.w2_portfolio_access_observations[0].navigation_completed,false)
 for(const event of ['framenavigated','request','response','requestfailed'])assert.equal(f.page.listenerCount(event),0)
})
test('HTTP and current DTO refusal still fail closed and release listeners',async()=>{
 for(const configuration of [{status:503},{body:{...envelope,private:'synthetic'}},{body:{ok:true,data:{...envelope.data,record:{...record,id:record.customer_id}}}}]){
  const f=fixture(configuration),report={};await assert.rejects(run(f,report))
  for(const event of ['framenavigated','request','response','requestfailed'])assert.equal(f.page.listenerCount(event),0)
 }
})
test('non-loopback or credential/query origins are refused; instrumentation is bounded and reported as truncated',async()=>{
 for(const authOrigin of ['https://private.invalid','http://synthetic:private@127.0.0.1:54321','http://127.0.0.1:54321?private=synthetic']){
  const f=fixture();await assert.rejects(run(f,{}, {authOrigin}),/PORTFOLIO_AUTH_ORIGIN_INVALID/);assert.deepEqual(f.page.navigations,['about:blank']);assert.equal(f.page.eventNames().length,0)
 }
 const f=fixture({navigate:async({page,request})=>{for(let i=0;i<40;i++)page.emit('request',request())}}),report={}
 await run(f,report);assert.equal(report.w2_portfolio_access_observations[0].requests,32);assert.equal(report.w2_portfolio_access_observations[0].truncated,true)
})
