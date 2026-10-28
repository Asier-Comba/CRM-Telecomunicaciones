import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseDocumentLibraryInputV2 as input,parseDocumentLibraryPageV2 as page} from '../../src/lib/server/document-library-runtime-v2.ts'
import {DocumentLibraryServiceV2} from '../../src/lib/server/document-library-service-v2.ts'
import {documentLibraryHttpV2} from '../../src/lib/server/document-library-http-v2.ts'
const id='10000000-0000-4000-8000-000000000001',customer='20000000-0000-4000-8000-000000000001'
const record={id,version:1,status:'active',document_kind:'contract',display_title:'Contrato · ref 10000000',title_state:'available',media_type:'application/pdf',size_bytes:1024,created_at:'2026-10-01T10:00:00.123456Z',context:{target:{kind:'customer',id:customer,label:'Empresa · ref 20000000'},customer:{id:customer,label:'Synthetic company'}}}
const valid=()=>({contract_version:'document.library.v2',operation:'document.library_list',items:[structuredClone(record)],next_cursor:null,completeness:'complete',total_count:1,count_state:'exact',capabilities:{search_fields:['title','reference','customer_label','category'],sort_fields:['created_asc','created_desc'],private_content:false,folders:false,file_name:false,consistency:'live_reauthorized_creation_cutoff'}})
test('library input is global without a required target, closed and metadata-only',()=>{
 assert.deepEqual(input({}),{status:'active',sort:'created_desc',limit:20})
 assert.deepEqual(input({query:'  Contrato  ',format:'pdf',customer_id:customer})?.query,'Contrato')
 for(const bad of [{workspace_id:id},{actor_id:id},{role:'owner'},{file_name:'private'},{object_ref:id},{url:'https://example.invalid'}, {format:'html'},{limit:101},{query:'x'},{query:'PRIVATE\nVALUE'},{cursor:'readable'},{target:{kind:'invoice',id}},{target:{kind:'customer',id,workspace_id:id}},{created_from:'2026-02-31T00:00:00.000Z'},{created_from:'2026-10-02T00:00:00.000Z',created_before:'2026-10-01T00:00:00.000Z'}])assert.equal(input(bad),null)
})
test('library output rejects private additions, false totals, malformed dates, wrong targets and duplicate rows',()=>{
 assert.ok(page(input({})!,valid()))
 for(const field of ['file_name','storage_path','object_ref','signed_url','private_notes']){const v=valid();Object.assign(v.items[0],{[field]:'PRIVATE_SENTINEL'});assert.equal(page(input({})!,v),null)}
 const duplicate=valid();duplicate.items.push(structuredClone(record));duplicate.total_count=2;assert.equal(page(input({})!,duplicate),null)
 const count=valid();count.total_count=0;assert.equal(page(input({})!,count),null)
 const date=valid();date.items[0].created_at='PRIVATE';assert.equal(page(input({})!,date),null)
 assert.equal(page(input({customer_id:id})!,valid()),null);assert.equal(page(input({format:'image'})!,valid()),null)
 const capabilities=valid();Object.assign(capabilities.capabilities,{private_content:true});assert.equal(page(input({})!,capabilities),null)
 const partial=valid();Object.assign(partial,{completeness:'partial'});assert.equal(page(input({})!,partial),null)
})
test('library preserves microsecond keyset order and deterministic UUID tie breaks',()=>{
 const v=valid();v.items.push({...structuredClone(record),id:'10000000-0000-4000-8000-000000000002',created_at:'2026-10-01T10:00:00.123455Z'});v.total_count=2
 assert.ok(page(input({sort:'created_desc'})!,v));assert.equal(page(input({sort:'created_asc'})!,v),null)
 v.items[1].created_at=record.created_at;assert.equal(page(input({sort:'created_desc'})!,v),null);assert.ok(page(input({sort:'created_asc'})!,v))
})
test('current role is checked before RPC; no client actor or workspace becomes authority',async()=>{
 for(const role of ['member','viewer',null]){let rpc=0;const service=new DocumentLibraryServiceV2({resolve:async()=>role?{workspaceId:customer,role:role as 'member'|'viewer'}:null,rpc:async()=>{rpc++;return{data:valid(),error:null}}});assert.deepEqual(await service.list({}),{ok:false,error:'access_denied'});assert.equal(rpc,0)}
 for(const role of ['owner','admin']as const){let calls=0;const service=new DocumentLibraryServiceV2({resolve:async()=>({workspaceId:customer,role}),rpc:async(name,args)=>{calls++;assert.equal(name,'document_library_v2_list');assert.equal(args.p_workspace_id,customer);return{data:valid(),error:null}}});assert.equal((await service.list({})).ok,true);assert.equal(calls,1);assert.deepEqual(await service.list({workspace_id:id}),{ok:false,error:'validation'});assert.equal(calls,1)}
})
test('library HTTP enforces origin and closed operation before factory; errors remain safe',async()=>{
 let calls=0;const factory=async()=>{calls++;return new DocumentLibraryServiceV2({resolve:async()=>({workspaceId:customer,role:'owner'}),rpc:async()=>({data:valid(),error:null})})}
 const request=(origin:string,body:unknown)=>new Request('http://127.0.0.1:3187/api/document/library/v2/queries',{method:'POST',headers:{Host:'127.0.0.1:3187',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
 assert.equal((await documentLibraryHttpV2(request('https://example.invalid',{operation:'document.library_list',input:{}}),factory,'http://127.0.0.1:3187')).status,403);assert.equal(calls,0)
 assert.equal((await documentLibraryHttpV2(request('http://127.0.0.1:3187',{operation:'document.request_download',input:{}}),factory,'http://127.0.0.1:3187')).status,400);assert.equal(calls,0)
 const response=await documentLibraryHttpV2(request('http://127.0.0.1:3187',{operation:'document.library_list',input:{}}),factory,'http://127.0.0.1:3187');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(calls,1)
})
