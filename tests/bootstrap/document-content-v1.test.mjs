import test from 'node:test'
import assert from 'node:assert/strict'
import {parseDocumentContentInputV1,parseDocumentContentReceiptV1}from '../../src/lib/server/document-content-runtime-v1.ts'
import {DocumentContentServiceV1}from '../../src/lib/server/document-content-service-v1.ts'
import {documentContentHttpV1}from '../../src/lib/server/document-content-http-v1.ts'
const id='a9100000-0000-4000-8000-000000000001',ref='b9100000-0000-4000-8000-000000000001',workspace='c9100000-0000-4000-8000-000000000001',command='d9100000-0000-4000-8000-000000000001'
const upload={command_id:command,target_kind:'customer',target_id:id,document_kind:'general',media_type:'application/pdf',size_bytes:3,file_name:'Synthetic.pdf'}
test('successful content HTTP commands expose receipt while binary upload exposes data',async()=>{
 const origin='https://crm.example.invalid',headers={host:'crm.example.invalid',origin,'content-type':'application/json'}
 const prepared={contract_version:'document.content.v1',operation:'document.request_upload',command_id:command,id,version:1,status:'pending',expires_at:'2026-10-05T12:10:00Z'}
 const finalized={contract_version:'document.content.v1',operation:'document.finalize_upload',command_id:command,id,version:2,status:'active'}
 const service=new DocumentContentServiceV1({resolve:async()=>({workspaceId:workspace,role:'owner'}),rpc:async name=>({error:null,data:name==='document_content_v1_request_upload'?prepared:name==='document_content_v1_finalize_upload'?finalized:{id,object_ref:ref,media_type:'application/pdf',size_bytes:3,expires_at:'2026-10-05T12:10:00Z'}}),upload:async()=> 'ok',download:async()=>null})
 for(const [operation,input,receipt]of [['document.request_upload',upload,prepared],['document.finalize_upload',{command_id:command,id,expected_version:1},finalized]]){
  const response=await documentContentHttpV1(new Request(origin+'/api/document/v1/content/commands',{method:'POST',headers,body:JSON.stringify({operation,input})}),'commands',async()=>service,origin)
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,receipt})
 }
 const response=await documentContentHttpV1(new Request(origin+'/api/document/v1/content/upload?id='+id,{method:'POST',headers:{...headers,'content-type':'application/pdf','content-length':'3'},body:new Uint8Array([1,2,3])}),'upload',async()=>service,origin)
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,data:{id,uploaded:true,finalized:false}})
})
test('content contracts reject authority, locators, arbitrary media and oversized intents',()=>{
 assert.ok(parseDocumentContentInputV1('document.request_upload',upload))
 for(const extra of [{storage_path:'arbitrary'},{workspace_id:workspace},{size_bytes:10485761},{file_name:'../x.pdf'},{media_type:'text/html'},{size_bytes:0}])assert.equal(parseDocumentContentInputV1('document.request_upload',{...upload,...extra}),null)
 const input={command_id:command,id,expected_version:1},receipt={contract_version:'document.content.v1',operation:'document.finalize_upload',command_id:command,id,version:2,status:'active'}
 assert.ok(parseDocumentContentReceiptV1('document.finalize_upload',input,receipt))
 for(const extra of [{version:3},{id:ref},{storage_path:'arbitrary'}])assert.equal(parseDocumentContentReceiptV1('document.finalize_upload',input,{...receipt,...extra}),null)
})
test('upload port gets a server-derived path, no upsert; existing-object retry must match bytes',async()=>{
 const manifest={id,object_ref:ref,media_type:'application/pdf',size_bytes:3,expires_at:'2026-10-05T12:10:00Z'},seen=[]
 let prior=new Uint8Array([1,2,3])
 const s=new DocumentContentServiceV1({resolve:async()=>({workspaceId:workspace,role:'owner'}),rpc:async(name,args)=>{seen.push([name,args]);return{data:manifest,error:null}},upload:async(path)=>{seen.push(path);return'exists'},download:async()=>prior})
 assert.equal((await s.upload(id,new Uint8Array([1,2,3]),'application/pdf')).ok,true)
 assert.equal(seen[1],workspace+'/documents/'+id+'/'+ref)
 assert.equal(JSON.stringify(seen).includes('service_role'),false)
 prior=new Uint8Array([3,2,1]);assert.equal((await s.upload(id,new Uint8Array([1,2,3]),'application/pdf')).error,'conflict')
 assert.equal((await s.upload(id,new Uint8Array([1]),'application/pdf')).error,'validation')
})
test('commercial/viewer content rights are denied before RPC/Storage and foreign descriptors fail closed',async()=>{
 for(const role of ['member','viewer']){
 const s=new DocumentContentServiceV1({resolve:async()=>({workspaceId:workspace,role}),rpc:async()=>{throw Error('unexpected RPC')},upload:async()=>{throw Error('unexpected Storage')},download:async()=>{throw Error('unexpected Storage')}})
 assert.equal((await s.execute('document.request_upload',upload)).error,'access_denied');assert.equal((await s.download(id,ref)).error,'access_denied')
 }
 const s=new DocumentContentServiceV1({resolve:async()=>({workspaceId:workspace,role:'owner'}),rpc:async()=>({data:{id:ref,object_ref:ref,media_type:'application/pdf',size_bytes:3,expires_at:'2026-10-05T12:10:00Z'},error:null}),upload:async()=>{throw Error('unexpected Storage')},download:async()=>null})
 assert.equal((await s.upload(id,new Uint8Array([1,2,3]),'application/pdf')).error,'internal_safe')
})
test('binary transport bounds dishonest/missing lengths and requires exact Host/Origin before service creation',async()=>{
 const origin='https://crm.example.invalid',factory=async()=>{throw Error('unexpected service')}
 const request=(headers,body)=>new Request(origin+'/api/document/v1/content/upload?id='+id,{method:'POST',headers:{host:'crm.example.invalid',origin,'content-type':'application/pdf',...headers},body,duplex:'half'})
 assert.equal((await documentContentHttpV1(request({origin:'https://foreign.example.invalid'},new Uint8Array([1])),'upload',factory,origin)).status,403)
 assert.equal((await documentContentHttpV1(request({'content-length':'1'},new Uint8Array(10485761)),'upload',factory,origin)).status,413)
 assert.equal((await documentContentHttpV1(request({},new Uint8Array(10485761)),'upload',factory,origin)).status,413)
 assert.equal((await documentContentHttpV1(request({'content-type':'text/html'},new Uint8Array([1])),'upload',factory,origin)).status,415)
})
