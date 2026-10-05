import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,createHash}from 'node:crypto'
import {DocumentMaintenanceServiceV1,parseDocumentMaintenanceInputV1,documentWitnessPayloadV1}from '../../src/lib/server/document-maintenance-service-v1.ts'
import {DocumentContentServiceV1}from '../../src/lib/server/document-content-service-v1.ts'
import {createDisposableDocumentScannerV1,documentScannerReadinessV1}from '../../src/lib/server/document-scanner-v1.ts'
const id='10000000-0000-4000-8000-000000000001',bytes=new TextEncoder().encode('synthetic private bytes'),input={command_id:id,id,expected_version:1,ticket_id:id}
const manifest={id,object_ref:id,media_type:'application/pdf',size_bytes:bytes.length,expires_at:'2099-01-01T00:00:00Z',sha256:null}
test('maintenance closes browser inputs and binds witnesses to actor/scope/object/command',()=>{
 assert.ok(parseDocumentMaintenanceInputV1('document.verify_content',input));assert.equal(parseDocumentMaintenanceInputV1('document.verify_content',{...input,sha256:'caller'}),null);assert.equal(parseDocumentMaintenanceInputV1('document.cleanup_claim',input),null)
 const w={object_ref:id,size_bytes:10,media_type:'application/pdf',sha256:'c'.repeat(64),measured_at:1000};assert.notEqual(documentWitnessPayloadV1(id,id,input,w),documentWitnessPayloadV1(id,id,{...input,command_id:'different'},w))
})
test('server measures actual bytes and sends a witness; required absent scanner fails closed before attestation',async()=>{
 let witnessed=null,calls=0;const port={resolve:async()=>({workspaceId:id,role:'owner'}),actor:async()=>id,witnessKey:()=>({key_id:id,key:randomBytes(32)}),download:async()=>bytes,upload:async()=> 'denied',remove:async()=>false,rpc:async(name,args)=>{if(name==='document_content_v1_manifest')return{data:manifest,error:null};calls++;witnessed=args.p_witness;return{error:null,data:{contract_version:'document.integrity.v1',operation:'document.verify_content',command_id:id,id,version:2,status:'active',integrity:'verified_sha256',scan_status:'not_scanned'}}}}
 assert.equal((await new DocumentMaintenanceServiceV1(port,true).execute('document.verify_content',input)).error,'unavailable');assert.equal(calls,0)
 const r=await new DocumentMaintenanceServiceV1(port).execute('document.verify_content',input);assert.equal(r.ok,true);assert.equal(witnessed.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(witnessed.mac.length,64);assert.equal(witnessed.scan_status,'not_scanned')
})
test('normal download rejects same-size corruption against an observed immutable digest',async()=>{
 const port={resolve:async()=>({workspaceId:id,role:'owner'}),rpc:async()=>({data:{...manifest,sha256:createHash('sha256').update(bytes).digest('hex')},error:null}),download:async()=>new Uint8Array(bytes.length),upload:async()=> 'denied'}
 assert.equal((await new DocumentContentServiceV1(port).download(id,id)).error,'conflict')
})
test('cleanup does not delete on denied scope, malformed manifest or stale preparation',async()=>{
 let deletes=0;const port={resolve:async()=>({workspaceId:id,role:'owner'}),actor:async()=>id,witnessKey:()=>null,download:async()=>null,upload:async()=> 'denied',remove:async()=>{deletes++;return true},rpc:async()=>({data:{receipt:null,object_ref:'arbitrary/path',version:1},error:null})}
 const r=await new DocumentMaintenanceServiceV1(port).execute('document.cleanup_finish',{command_id:id,id,expected_version:1});assert.equal(r.error,'internal_safe');assert.equal(deletes,0)
})
test('scanner fixture never claims antivirus cleanliness or production readiness',async()=>{
 assert.equal(documentScannerReadinessV1(true).may_claim_clean,false);assert.throws(()=>createDisposableDocumentScannerV1({NODE_ENV:'production'}),/TEST_ONLY/)
 const scanner=createDisposableDocumentScannerV1({NODE_ENV:'test'});assert.equal((await scanner.scan(bytes)).status,'fixture_only');assert.equal((await scanner.scan(new TextEncoder().encode('SYNTHETIC_REJECT_FIXTURE'))).status,'rejected')
})
