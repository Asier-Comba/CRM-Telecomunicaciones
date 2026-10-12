import {test} from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {observePortfolioBoundedSearchV1} from '../../scripts/security/supabase-local/portfolio-bounded-search-observation-v1.mjs'
const origin='http://127.0.0.1:3109',id='10000000-0000-4000-8000-000000000001',customer='20000000-0000-4000-8000-000000000001',query='Synthetic private query'
function fixture(){const page=new EventEmitter(),frame={};let href=origin+'/portfolio';page.url=()=>href;page.mainFrame=()=>frame
 const observe=()=>observePortfolioBoundedSearchV1({page,origin,query,expectedContractId:id})
 const request=(operation,input,other={})=>({frame:()=>frame,method:()=>other.method??'POST',url:()=>other.url??origin+'/api/product/v1/queries',postDataJSON:()=>({operation,input})})
 const response=async(req,body,status=200)=>{page.emit('response',{request:()=>req,status:()=>status,json:async()=>body});await new Promise(resolve=>setImmediate(resolve))}
 return{page,frame,observe,request,response,navigate:()=>{href=origin+'/portfolio?other=private';page.emit('framenavigated',frame)}}
}
test('passive observer distinguishes current search and exact expected record without publishing any private field',async()=>{
 const f=fixture(),o=f.observe(),search=f.request('global.search',{query}),get=f.request('portfolio.get',{kind:'contract',id})
 f.page.emit('request',search);await f.response(search,{ok:true,data:{contract_version:'product.v1',items:[{kind:'contract',id,customer_id:customer,label:'Contrato '+query,status:'draft'}]}})
 f.page.emit('request',get);await f.response(get,{ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record:{id,version:1,status:'draft',source:'manual',customer_id:customer,operator_id:'30000000-0000-4000-8000-000000000001',plan_version_id:null,start_date:'2026-10-01',signed_date:null,end_date:null,assigned_user_id:null}}})
 const result=o.finish();assert.deepEqual(result.rows.map(r=>[r.kind,r.status,r.dto,r.expected_reference]),[['search','ok','valid',true],['expected_contract','ok','valid',true]])
 for(const value of [id,customer,query,origin,'operator_id','label','cookie','Authorization'])assert.ok(!JSON.stringify(result).includes(value))
 assert.equal(result.rows[0].candidates,1);assert.equal(f.page.listenerCount('request'),0);assert.equal(o.finish(),null)
})
test('old foreign and unrelated requests cannot supply current-document evidence; navigation discards prior DTOs',async()=>{
 const f=fixture(),old=f.request('global.search',{query});f.page.emit('request',old)
 const o=f.observe();await f.response(old,{ok:true,data:{contract_version:'product.v1',items:[]}})
 for(const req of [f.request('global.search',{query:'other'}),f.request('portfolio.get',{kind:'contract',id:customer}),f.request('global.search',{query},{url:'http://127.0.0.1:4000/api/product/v1/queries'})])f.page.emit('request',req)
 assert.equal(o.finish().rows.length,0)
 const changed=f.observe(),current=f.request('global.search',{query});f.page.emit('request',current);f.navigate();await f.response(current,{ok:true,data:{contract_version:'product.v1',items:[]}})
 assert.equal(changed.finish().document_changed,true)
})
test('invalid DTO pending transport failure and request bound are retained as safe enums without repair or retries',async()=>{
 const f=fixture(),o=f.observe(),bad=f.request('global.search',{query});f.page.emit('request',bad);await f.response(bad,{ok:true,data:{contract_version:'product.v1',items:[],private_body:'synthetic-private-payload'}})
 const denied=f.request('portfolio.get',{kind:'contract',id});f.page.emit('request',denied);await f.response(denied,{private_cookie:'synthetic-cookie'},403)
 const failed=f.request('global.search',{query});f.page.emit('request',failed);f.page.emit('requestfailed',failed)
 for(let i=0;i<20;i++)f.page.emit('request',f.request('global.search',{query}))
 const result=o.finish();assert.equal(result.rows.length,12);assert.equal(result.truncated,true)
 assert.equal(result.rows[0].dto,'invalid');assert.equal(result.rows[1].status,'client_error');assert.equal(result.rows[2].failed,true);assert.equal(result.rows[3].status,'pending')
 assert.ok(!JSON.stringify(result).includes('synthetic-private'));assert.ok(!JSON.stringify(result).includes('synthetic-cookie'))
 assert.equal(observePortfolioBoundedSearchV1({page:f.page,origin:'https://production.example',query,expectedContractId:id}),null)
})
