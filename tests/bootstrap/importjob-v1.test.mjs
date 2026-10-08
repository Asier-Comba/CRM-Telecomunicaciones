import test from 'node:test'
import assert from 'node:assert/strict'
import {parseImportJobListV1,parseImportJobCancelV1,parseImportJobGetResultV1,parseImportJobListResultV1}from '../../src/lib/server/importjob-runtime-v1.ts'
import {ImportJobServiceV1}from '../../src/lib/server/importjob-service-v1.ts'
import {importJobHttpV1}from '../../src/lib/server/importjob-http-v1.ts'
const id='10000000-0000-4000-8000-000000000001'
const record={id,version:1,kind:'customers',status:'uploaded',total_rows:0,valid_rows:0,invalid_rows:0,applied_rows:0,failed_rows:0,checkpoint:null,failure_code:null,can_cancel:true,processing_status:'blocked_encrypted_staging_adapter'}
test('import management rejects raw payloads, overlarge pages and misleading progress/adapter DTOs',()=>{
 assert.equal(parseImportJobCancelV1({command_id:id,id,expected_version:1,payload:{}}),null)
 assert.equal(parseImportJobListV1({limit:101}),null)
 const r={contract_version:'importjob.v1',operation:'importjob.get',record};assert.ok(parseImportJobGetResultV1(id,r))
 for(const change of [{source_file_ref_id:id},{processing_status:'available'},{valid_rows:1},{can_cancel:false}])assert.equal(parseImportJobGetResultV1(id,{...r,record:{...record,...change}}),null)
 assert.equal(parseImportJobListResultV1({limit:1},{contract_version:'importjob.v1',operation:'importjob.list',items:[record,record],next_id:null}),null)
})
test('import membership is rechecked and the server chooses the workspace',async()=>{
 let active=true,args
 const service=new ImportJobServiceV1({resolve:async()=>active?{workspaceId:id,role:'owner'}:null,rpc:async(name,value)=>{args=value;return{error:null,data:{contract_version:'importjob.v1',operation:'importjob.get',record}}}})
 assert.equal((await service.get({id})).ok,true);assert.equal(args.p_workspace_id,id)
 active=false;assert.equal((await service.get({id})).error,'access_denied')
})
test('takeover job metadata recognizes safe telecom domains and distinct protected jobs without accepting raw values or production availability',()=>{
 for(const kind of ['entitlements','bundle_components','renewals','permanences','sims','portabilities','cases','service_locations','equipment','protected_identifiers']){
  const result={contract_version:'importjob.v1',operation:'importjob.get',record:{...record,kind}}
  assert.ok(parseImportJobGetResultV1(id,result));assert.equal(parseImportJobGetResultV1(id,{...result,record:{...result.record,canonical_value:'+34600123456'}}),null)
 }
 assert.equal(parseImportJobGetResultV1(id,{contract_version:'importjob.v1',operation:'importjob.get',record:{...record,kind:'unregistered'}}),null)
})
test('import route never registers begin/apply/resume without the encrypted adapter',async()=>{
 const req=operation=>new Request('https://synthetic.invalid/api/import/v1',{method:'POST',headers:{host:'synthetic.invalid',origin:'https://synthetic.invalid','content-type':'application/json'},body:JSON.stringify({operation,input:{id}})})
 for(const op of ['importjob.begin','importjob.validate','importjob.apply','importjob.resume'])assert.equal((await importJobHttpV1(req(op),async()=>{throw Error('must not run')},'https://synthetic.invalid')).status,400)
})
