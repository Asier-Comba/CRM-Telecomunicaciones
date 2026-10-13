import {test} from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {observeHistoryCurrentIdentityV1} from '../../scripts/security/supabase-local/history-current-identity-observation-v1.mjs'
import {identityCursor} from '../../src/features/customers/customer-identity.ts'
const customer='10000000-0000-4000-8000-000000000001',origin='http://127.0.0.1:3109',destination=origin+'/assistant?customer='+customer
function fixture(){
 const page=new EventEmitter(),frame={},foreign={};let current='about:blank'
 Object.assign(page,{url:()=>current,mainFrame:()=>frame})
 const request=(changes:Record<string,unknown>={})=>({frame:()=>frame,method:()=> 'POST',url:()=>origin+'/api/product/v1/queries',
  postDataJSON:()=>({operation:'customer.list',input:{limit:1,sort:'id_asc',after_id:identityCursor(customer).previous}}),...changes})
 return{page,frame,foreign,request,navigate:(url:string)=>{current=url;page.emit('framenavigated',frame)},response:async(req:unknown,status:number,body:unknown)=>{
  await Promise.all(page.listeners('response').map(listener=>listener({request:()=>req,status:()=>status,json:async()=>body})))
 }}
}
test('current exact cursor records closed HTTP failure without response text IDs URLs headers or foreign requests',async()=>{
 const f=fixture(),observer=observeHistoryCurrentIdentityV1({page:f.page,destination,customerId:customer})!;f.navigate(destination)
 f.page.emit('request',f.request({frame:()=>f.foreign}));f.page.emit('request',f.request({url:()=> 'https://foreign.invalid/private'}))
 const request=f.request();f.page.emit('request',request);await f.response(request,500,{ok:false,error:'internal_safe',message:'private payload '+customer,token:'private-token'})
 const result=observer.finish();assert.ok(result);assert.equal(result.rows.length,1);assert.deepEqual(result.rows[0],{status:'server_error',failed:false,envelope:'failure',dto:'not_observed',error:'internal_safe',items:null,exact_reference:null})
 for(const value of [customer,origin,'private payload','private-token','foreign.invalid'])assert.ok(!JSON.stringify(result).includes(value))
 assert.equal(f.page.listenerCount('request'),0);assert.equal(observer.finish(),null)
})
test('validated empty identity is distinct from malformed DTO or missing response, not an authorization proof',async()=>{
 const f=fixture(),observer=observeHistoryCurrentIdentityV1({page:f.page,destination,customerId:customer})!;f.navigate(destination)
 const empty=f.request(),invalid=f.request(),pending=f.request()
 for(const req of [empty,invalid,pending])f.page.emit('request',req)
 await f.response(empty,200,{ok:true,data:{contract_version:'telecom.collections.v1',operation:'customer.list',items:[],next_id:null}})
 await f.response(invalid,200,{ok:true,data:{private:'invalid'}})
 f.page.emit('requestfailed',pending)
 const result=observer.finish();assert.ok(result);assert.equal(result.rows[0].dto,'valid');assert.equal(result.rows[0].items,0);assert.equal(result.rows[0].exact_reference,false)
 assert.equal(result.rows[1].dto,'invalid');assert.equal(result.rows[2].status,'pending');assert.equal(result.rows[2].failed,true)
})
test('navigation invalidates old-document observations and the twelve-row bound does not leak dropped inputs',async()=>{
 const f=fixture(),observer=observeHistoryCurrentIdentityV1({page:f.page,destination,customerId:customer})!;f.navigate(destination)
 for(let i=0;i<13;i++)f.page.emit('request',f.request())
 f.navigate(origin+'/assistant');const result=observer.finish();assert.ok(result)
 assert.equal(result.document_changed,true);assert.equal(result.truncated,true);assert.deepEqual(result.rows,[])
 assert.equal(observeHistoryCurrentIdentityV1({page:f.page,destination:'https://production.invalid/assistant?customer='+customer,customerId:customer}),null)
})
