import assert from 'node:assert/strict'
import test from 'node:test'
import {parseAssistantDocumentListInputV1,projectAuthorizedDocumentMetadataListV1} from '../../src/assistant/document-metadata-read-projection-v1.ts'
import {createAssistantDocumentListReaderV1} from '../../src/lib/server/assistant-document-list-reader-v1.ts'
import type {ProductUserPortV1} from '../../src/lib/server/product-service-v1.ts'

const customer='10000000-0000-4000-8000-000000000001',foreign='10000000-0000-4000-8000-000000000002',id='20000000-0000-4000-8000-000000000001'
const input={customer_id:customer}
const row={id,version:2,status:'active',document_kind:'contract',media_type:'application/pdf',size_bytes:1000,target:{kind:'customer',id:customer}}
const wire=(items:unknown[]=[row],next_id:unknown=null)=>({contract_version:'document.v1',operation:'document.list',items,next_id})
test('metadata reader bounds one selected customer without caller targets or content admission',()=>{
 assert.deepEqual(parseAssistantDocumentListInputV1(input),{target_kind:'customer',target_id:customer,limit:20})
 for(const raw of [{},{limit:20},{...input,limit:21},{...input,target_kind:'service'},{...input,target_id:foreign},{...input,workspace_id:foreign},{...input,indexingApproved:true},{...input,query:'private text'}])assert.equal(parseAssistantDocumentListInputV1(raw),null)
 let reads=0;assert.equal(parseAssistantDocumentListInputV1({get customer_id(){reads++;return customer}}),null);assert.equal(reads,0)
})
test('metadata projection preserves only bounded registered facts and refuses private wire additions',()=>{
 const result=projectAuthorizedDocumentMetadataListV1(input,wire())
 assert.deepEqual(result,{contract_version:'assistant.document-metadata-list.v1',operation:'document.list',items:[{id,document_kind:'contract',status:'active',media_type:'application/pdf',size_bytes:1000}],next_id:null})
 for(const field of ['version','target','file_name','storage_path','object_ref','sha256','ticket_id','signed_url','indexingApproved','contentClass'])assert.ok(!JSON.stringify(result).includes(JSON.stringify(field)+':'))
 for(const field of ['file_name','storage_path','signed_url','content'])assert.equal(projectAuthorizedDocumentMetadataListV1(input,wire([{...row,[field]:'PRIVATE_FIXTURE'}])),null)
})
test('metadata projection rejects changed target/status, malformed facts and fabricated pagination',()=>{
 for(const bad of [{...row,target:{kind:'customer',id:foreign}},{...row,target:{kind:'service',id:customer}},{...row,status:'archived'},{...row,version:0},{...row,size_bytes:-1}])assert.equal(projectAuthorizedDocumentMetadataListV1(input,wire([bad])),null)
 assert.equal(projectAuthorizedDocumentMetadataListV1(input,wire([row,row])),null)
 assert.equal(projectAuthorizedDocumentMetadataListV1(input,wire([row],id)),null)
 assert.equal(projectAuthorizedDocumentMetadataListV1({...input,after_id:id},wire()),null)
 assert.deepEqual(projectAuthorizedDocumentMetadataListV1(input,wire([]))?.items,[])
 const page=Array.from({length:20},(_,i)=>({...row,id:'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0')}))
 assert.equal(projectAuthorizedDocumentMetadataListV1(input,wire(page,page.at(-1)!.id))?.next_id,page.at(-1)!.id)
 assert.equal(projectAuthorizedDocumentMetadataListV1({...input,status:'archived'},wire([{...row,status:'archived',size_bytes:null,media_type:null}]))?.items instanceof Array,true)
})
test('metadata seam rejects all other operations and raw targets before resolving scope',async()=>{
 let calls=0;const reader=createAssistantDocumentListReaderV1({resolve:async()=>{calls++;return null},rpc:async()=>{calls++;throw Error('PRIVATE_FIXTURE')}} as ProductUserPortV1)
 for(const op of ['document.get_metadata','document.archive','document.restore','document.request_download','document.download','document.request_upload','document.finalize_upload'])assert.deepEqual(await reader(op,input),{ok:false,error:'validation'})
 assert.deepEqual(await reader('document.list',{target_kind:'customer',target_id:customer}),{ok:false,error:'validation'});assert.equal(calls,0)
})
test('metadata seam keeps current W1 owner/admin roles and propagates scoped refusal without data',async()=>{
 for(const role of ['owner','admin','member','viewer'] as const){
  let calls=0;const reader=createAssistantDocumentListReaderV1({resolve:async()=>({workspaceId:foreign,role}),rpc:async(name,args)=>{calls++;assert.equal(name,'document_v1_list');assert.deepEqual(args,{p_workspace_id:foreign,p_input:{target_kind:'customer',target_id:customer,limit:20}});return{data:wire(),error:null}}} as ProductUserPortV1)
  const result=await reader('document.list',input);assert.equal(result.ok,role==='owner'||role==='admin');assert.equal(calls,role==='owner'||role==='admin'?1:0)
 }
 const denied=createAssistantDocumentListReaderV1({resolve:async()=>({workspaceId:foreign,role:'owner'}),rpc:async()=>({data:null,error:{code:'42501',message:'PRIVATE_FIXTURE'}})} as ProductUserPortV1)
 assert.deepEqual(await denied('document.list',input),{ok:false,error:'access_denied'})
})
test('metadata reader snapshots input descriptors instead of Proxy get substitutions',()=>{
 let gets=0;const raw=new Proxy(input,{get(){gets++;return foreign}})
 assert.equal(parseAssistantDocumentListInputV1(raw)?.target_id,customer);assert.equal(gets,0)
})
