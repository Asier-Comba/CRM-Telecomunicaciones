import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID}from 'node:crypto'
import {parseDocumentInputV1,parseDocumentReceiptV1,parseDocumentListInputV1,parseDocumentListV1,parseDocumentGetV1}from '../../src/lib/server/document-runtime-v1.ts'
import {DocumentServiceV1}from '../../src/lib/server/document-service-v1.ts'
import {documentHttpV1}from '../../src/lib/server/document-http-v1.ts'
const id=randomUUID(),target=randomUUID(),command_id=randomUUID(),record={id,version:1,status:'active',document_kind:'identity',media_type:'application/pdf',size_bytes:100,target:{kind:'customer',id:target}}
test('document metadata parsers reject capabilities, object paths, names, hashes and mismatched targets',()=>{
 const r={contract_version:'document.v1',operation:'document.get_metadata',record}
 assert.ok(parseDocumentGetV1(id,r))
 for(const field of ['file_name','storage_path','storage_bucket','sha256_hex','signed_url','content'])assert.equal(parseDocumentGetV1(id,{...r,record:{...record,[field]:'private'}}),null)
 const input={target_kind:'customer',target_id:target,limit:1}
 assert.ok(parseDocumentListV1(input,{contract_version:'document.v1',operation:'document.list',items:[record],next_id:id}))
 assert.equal(parseDocumentListV1({...input,target_id:randomUUID()},{contract_version:'document.v1',operation:'document.list',items:[record],next_id:id}),null)
 for(const patch of [{limit:101},{workspace_id:id},{after_id:3},{target_kind:'bucket'},{status:'pending_scan'}])assert.equal(parseDocumentListInputV1({...input,...patch}),null)
})
test('document archive/restore validate closed CAS and replay receipts',()=>{
 const input={command_id,id,expected_version:1}
 assert.ok(parseDocumentInputV1('document.archive',input))
 const receipt={contract_version:'document.v1',operation:'document.archive',command_id,id,version:2,status:'archived'}
 assert.ok(parseDocumentReceiptV1('document.archive',input,receipt))
 for(const patch of [{status:'active'},{version:1},{signed_url:'private'},{id:randomUUID()}])assert.equal(parseDocumentReceiptV1('document.archive',input,{...receipt,...patch}),null)
 for(const patch of [{expected_version:0},{storage_path:'arbitrary'},{actor_id:id},{delete:true}])assert.equal(parseDocumentInputV1('document.archive',{...input,...patch}),null)
 let getter=false;const hostile={...input};Object.defineProperty(hostile,'id',{enumerable:true,get(){getter=true;return id}})
 assert.equal(parseDocumentInputV1('document.archive',hostile),null);assert.equal(getter,false)
})
test('document service uses fresh protected identity and closed errors',async()=>{
 let role='owner',calls=0
 const service=new DocumentServiceV1({resolve:async()=>({workspaceId:target,role}),rpc:async(name,args)=>{calls++;assert.equal(args.p_workspace_id,target);assert.equal(name,'document_v1_get_metadata');return{data:{contract_version:'document.v1',operation:'document.get_metadata',record},error:null}}})
 assert.equal((await service.getMetadata({id})).ok,true)
 role='member';assert.deepEqual(await service.getMetadata({id}),{ok:false,error:'access_denied'});assert.equal(calls,1)
})
test('document HTTP closed operations cannot mint upload/download capabilities',async()=>{
 const origin='http://127.0.0.1:3108',request=new Request(origin+'/api/document/v1/commands',{method:'POST',headers:{host:'127.0.0.1:3108',origin,'content-type':'application/json'},body:JSON.stringify({operation:'document.request_upload',input:{id}})})
 let invoked=false;const r=await documentHttpV1(request,'commands',async()=>{invoked=true;return null},origin)
 assert.equal(r.status,400);assert.equal(invoked,false)
})
