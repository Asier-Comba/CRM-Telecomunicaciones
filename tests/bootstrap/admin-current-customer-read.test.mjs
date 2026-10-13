import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {readAdminCustomerResponse,reloadAdminCustomer} from '../../scripts/security/supabase-local/admin-current-customer-read.mjs'
const origin='http://127.0.0.1:3109',id='10000000-0000-4000-8000-000000000001',receipt={id,version:2}
const data={contract_version:'product.v1',id,version:2,account_kind:'legal_entity',legal_name:'W2 Admin Synthetic Company',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}
class Page extends EventEmitter {
 constructor(action){super();this.action=action;this.address=origin+'/clients/'+id;this.reloads=0;this.waits=0;this.bodyReads=0}
 mainFrame(){return this}
 url(){return this.address}
 waitForResponse(predicate,options){assert.equal(options,undefined);this.waits++;return new Promise(resolve=>{const listener=r=>{if(predicate(r)){this.off('response',listener);resolve(r)}};this.on('response',listener)})}
 async reload(options){assert.equal(options,undefined);this.reloads++;await this.action(this)}
}
function request(page,overrides={}){return {frame:()=>page,method:()=> 'POST',url:()=>origin+'/api/product/v1/queries',postDataJSON:()=>({operation:'customer.editor',input:{id}}),...overrides}}
function response(page,req=request(page),body={ok:true,data},status=200){return {request:()=>req,status:()=>status,json:async()=>{page.bodyReads++;return body}}}
function emit(page,r){page.emit('request',r.request());page.emit('response',r)}
test('reload ignores previous-document requests even when their response arrives after navigation',async()=>{
 let oldReads=0
 const page=new Page(p=>{
  const old=request(p);p.emit('request',old)
  p.emit('framenavigated',p)
  p.emit('response',{request:()=>old,status:()=>200,json:async()=>{oldReads++;throw Error('private-synthetic-cookie')}})
  emit(p,response(p))
 })
 const foreignListener=()=>{};page.on('request',foreignListener)
 assert.deepEqual(await reloadAdminCustomer({page,origin,receipt}),data)
 assert.equal(oldReads,0);assert.equal(page.bodyReads,1);assert.equal(page.reloads,1);assert.equal(page.waits,1)
 assert.deepEqual(page.listeners('request'),[foreignListener]);assert.equal(page.listenerCount('framenavigated'),0)
})
test('fresh same-document request must match frame, method, path, operation and exact customer input',async()=>{
 let rejectedBodies=0
 const page=new Page(p=>{
  p.emit('framenavigated',p)
  for(const override of [{frame:()=>({})},{method:()=> 'GET'},{url:()=>origin+'/other'},{postDataJSON:()=>({operation:'customer.list',input:{id}})},{postDataJSON:()=>({operation:'customer.editor',input:{id:'20000000-0000-4000-8000-000000000002'}})},{postDataJSON:()=>({operation:'customer.editor',input:{id,extra:true}})}]){
   const req=request(p,override);emit(p,{request:()=>req,json:async()=>{rejectedBodies++;return {ok:true,data}}})
  }
  emit(p,response(p))
 })
 assert.deepEqual(await reloadAdminCustomer({page,origin,receipt}),data);assert.equal(rejectedBodies,0)
})
test('another main-document navigation invalidates earlier requests to the same URL',async()=>{
 let discarded=0
 const page=new Page(p=>{
  p.emit('framenavigated',p);const prior=request(p);p.emit('request',prior)
  p.emit('framenavigated',p)
  p.emit('response',{request:()=>prior,json:async()=>{discarded++;throw Error('old document')}})
  emit(p,response(p))
 })
 assert.deepEqual(await reloadAdminCustomer({page,origin,receipt}),data);assert.equal(discarded,0)
})
test('unavailable current response body fails closed without private error content or automatic reread',async()=>{
 const page=new Page(p=>{p.emit('framenavigated',p);const req=request(p);emit(p,{request:()=>req,json:async()=>{throw Error('synthetic-private-cookie')},status:()=>200})})
 await assert.rejects(reloadAdminCustomer({page,origin,receipt}),error=>error.message==='ADMIN_CUSTOMER_BODY_UNAVAILABLE'&&!error.cause&&!JSON.stringify(error).includes('synthetic-private-cookie'))
 assert.equal(page.reloads,1);assert.equal(page.waits,1);assert.equal(page.listenerCount('request'),0);assert.equal(page.listenerCount('framenavigated'),0)
})
test('receipt and current customer checks still reject denial, wrong ID, stale version and changed identity',async()=>{
 const page=new Page(()=>{}),variants=[{body:{ok:false,error:'access_denied'},status:403},{body:{ok:true,data:{...data,id:'20000000-0000-4000-8000-000000000002'}}},{body:{ok:true,data:{...data,version:1}}},{body:{ok:true,data:{...data,legal_name:'Other company'}}},{body:{ok:true,data:{...data,source:'import'}}},{body:{ok:true,data:{...data,status:'archived'}}},{body:{ok:true,data,extra:true}}]
 for(const variant of variants)await assert.rejects(readAdminCustomerResponse(response(page,request(page),variant.body,variant.status??200),receipt),{message:'ADMIN_NORMAL_CUSTOMER_READ_FAILED'})
 assert.equal(page.reloads,0)
})
test('foreign reload target is rejected before navigation, requests or listeners',async()=>{
 const page=new Page(()=>{});page.address='http://127.0.0.1:9999/clients/'+id
 await assert.rejects(reloadAdminCustomer({page,origin,receipt}),{message:'ADMIN_RELOAD_TARGET_INVALID'})
 assert.equal(page.reloads,0);assert.equal(page.waits,0);assert.equal(page.listenerCount('request'),0)
})
