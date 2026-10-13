import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createAssistantPortabilityListReaderV1} from '../../src/lib/server/assistant-portability-list-reader-v1.ts'
import type {ProductUserPortV1} from '../../src/lib/server/product-service-v1.ts'
const customer='10000000-0000-4000-8000-000000000001',workspace='20000000-0000-4000-8000-000000000001'
function fixture(role='owner'){
 let resolves=0;const calls:Array<{name:string;input:unknown}>=[]
 // The revoked case deliberately supplies an invalid runtime role through the
 // typed server seam; this cast is confined to the negative test fixture.
 const port:ProductUserPortV1={resolve:async()=>{resolves++;return{workspaceId:workspace,role:role as 'owner'|'admin'|'member'|'viewer'}},
  rpc:async(name,input)=>{calls.push({name,input});return{data:{contract_version:'portability.v1',operation:'portability.list',items:[],next_id:null},error:null}}}
 return{reader:createAssistantPortabilityListReaderV1(port),calls,resolves:()=>resolves}
}
test('runtime reader gate denies get writes malformed operation and missing customer before any authorization or RPC',async()=>{
 const f=fixture()
 for(const op of ['portability.get','portability.create','portability.update_draft','portability.assign','portability.transition','portability.complete',null,{}]){
  assert.deepEqual(await f.reader(op,{customer_id:customer}),{ok:false,error:'validation'})
 }
 assert.deepEqual(await f.reader('portability.list',{}),{ok:false,error:'validation'});assert.equal(f.resolves(),0);assert.deepEqual(f.calls,[])
})
test('twenty-row and selected customer restriction rejects wide private filters before RPC',async()=>{
 const f=fixture()
 for(const extra of [{limit:21},{workspace_id:workspace},{number_identifier_id:customer},{line_id:customer},{operator_id:customer}])assert.equal((await f.reader('portability.list',{customer_id:customer,...extra})).ok,false)
 assert.equal(f.resolves(),0);assert.deepEqual(f.calls,[])
})
test('existing four read roles dispatch only W1 list with fresh server workspace and explicit bound',async()=>{
 for(const role of ['owner','admin','member','viewer']){
  const f=fixture(role),result=await f.reader('portability.list',{customer_id:customer})
  assert.equal(result.ok,true);assert.equal(f.resolves(),1)
  assert.deepEqual(f.calls,[{name:'portability_v1_query',input:{p_workspace_id:workspace,p_operation:'portability.list',p_input:{customer_id:customer,limit:20}}}])
 }
})
test('unknown or revoked role is denied without an RPC and backend failure remains unavailable to the caller',async()=>{
 const f=fixture('revoked');assert.deepEqual(await f.reader('portability.list',{customer_id:customer}),{ok:false,error:'access_denied'});assert.deepEqual(f.calls,[])
 const missing=createAssistantPortabilityListReaderV1({resolve:async()=>null,rpc:async()=>{throw Error('should not call')}})
 assert.deepEqual(await missing('portability.list',{customer_id:customer}),{ok:false,error:'access_denied'})
 const failed=createAssistantPortabilityListReaderV1({resolve:async()=>({workspaceId:workspace,actorId:'actor-a',role:'owner'}),rpc:async()=>({data:null,error:{code:'42501'}})})
 assert.deepEqual(await failed('portability.list',{customer_id:customer}),{ok:false,error:'access_denied'})
})
