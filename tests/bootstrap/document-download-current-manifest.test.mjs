import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {DocumentContentServiceV1} from '../../src/lib/server/document-content-service-v1.ts'
const id='a9100000-0000-4000-8000-000000000001',ref='b9100000-0000-4000-8000-000000000001',workspace='c9100000-0000-4000-8000-000000000001'
const ticket='d9100000-0000-4000-8000-000000000001',bytes=()=>new Uint8Array([1,2,3])
const manifest=()=>({id,object_ref:ref,media_type:'application/pdf',size_bytes:3,expires_at:'2026-10-13T12:10:00Z',sha256:createHash('sha256').update(bytes()).digest('hex')})
// Controlled Storage/scope transports, not actual Auth/Storage incident evidence.
test('download cannot release binary bytes after current privileged scope is revoked',async()=>{
 let scope={workspaceId:workspace,role:'owner'},queries=0
 const service=new DocumentContentServiceV1({resolve:async()=>scope,rpc:async()=>{queries++;return{data:manifest(),error:null}},upload:async()=> 'ok',download:async()=>{scope=null;return bytes()}})
 const result=await service.download(id,ticket)
 assert.deepEqual(result,{ok:false,error:'access_denied'});assert.equal(queries,1)
})
test('changed workspace or current manifest cannot certify bytes from the preceding descriptor',async()=>{
 for(const change of ['workspace','object','mime','size','hash','removed']){
  let scope={workspaceId:workspace,role:'owner'},current=manifest(),queries=0,error=null
  const service=new DocumentContentServiceV1({resolve:async()=>scope,rpc:async()=>{queries++;return{data:current,error}},upload:async()=> 'ok',download:async()=>{
   if(change==='workspace')scope={...scope,workspaceId:'e9100000-0000-4000-8000-000000000001'}
   if(change==='object')current={...current,object_ref:'f9100000-0000-4000-8000-000000000001'}
   if(change==='mime')current={...current,media_type:'image/png'}
   if(change==='size')current={...current,size_bytes:4}
   if(change==='hash')current={...current,sha256:'0'.repeat(64)}
   if(change==='removed')error={code:'P0002'}
   return bytes()
  }})
  const result=await service.download(id,ticket)
  assert.deepEqual(result,{ok:false,error:change==='removed'?'not_found':'conflict'},change);assert.equal(queries,2)
 }
})
test('validated returned bytes are an owned snapshot independent of the storage buffer',async()=>{
 const shared=bytes(),service=new DocumentContentServiceV1({resolve:async()=>({workspaceId:workspace,role:'owner'}),rpc:async()=>({data:manifest(),error:null}),upload:async()=> 'ok',download:async()=>shared})
 const result=await service.download(id,ticket);assert.equal(result.ok,true);shared[0]=9
 assert.deepEqual([...result.bytes],[1,2,3]);assert.notEqual(result.bytes,shared)
})
test('unchanged authorized manifest preserves ordinary successful download and current role admission',async()=>{
 for(const role of ['owner','admin']){
  let reads=0
  const service=new DocumentContentServiceV1({resolve:async()=>({workspaceId:workspace,role}),rpc:async()=>({data:manifest(),error:null}),upload:async()=> 'ok',download:async()=>{reads++;return bytes()}})
  const result=await service.download(id,ticket);assert.equal(result.ok,true);assert.equal(result.mime,'application/pdf');assert.deepEqual([...result.bytes],[1,2,3])
  assert.equal(reads,1)
 }
})
