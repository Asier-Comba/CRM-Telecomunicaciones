import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createDisposableImportStagingV1} from '../../src/lib/server/import-staging-disposable-v1.ts'
import {stageProtectedTelecomImportV1} from '../../src/lib/server/protected-telecom-import-v1.ts'
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'protected-telecom-')),workspaceId=randomUUID(),actorId=randomUUID(),jobId=randomUUID();let active=true
 const scope={workspaceId,actorId,role:'owner'},port={kind:async id=>id===jobId?'protected_identifiers':null,resolve:async()=>active?scope:null,lookup:async(w,kind,id)=>({workspaceId:w,kind,id})}
 const adapter=await createDisposableImportStagingV1(root,{resolve:port.resolve,job:async(w,id)=>w===workspaceId&&id===jobId?{id,status:'uploaded'}:null},{NODE_ENV:'test',IMPORT_STAGING_ADAPTER:'disposable-local',IMPORT_STAGING_TEST_KEY:randomBytes(32).toString('hex')})
 return {root,workspaceId,jobId,port,adapter,revoke:()=>{active=false}}
}
const csv=rows=>new TextEncoder().encode('entity_kind,entity_id,identifier_kind,canonical_value\r\n'+rows.map(r=>r.join(',')).join('\r\n'))
test('all six protected identifier types use existing validation and produce encrypted metadata-only receipts with stable retries',async()=>{
 const f=await fixture();try{
  const rows=[['line',randomUUID(),'msisdn','+34600123456'],['sim',randomUUID(),'iccid','89123456789012345678'],['sim',randomUUID(),'eid','12345678901234567890123456789012'],['service',randomUUID(),'circuit_reference','CIRCUIT-123456'],['contract',randomUUID(),'provider_account_reference','ACCOUNT-123456'],['contract',randomUUID(),'provider_contract_reference','CONTRACT-123456']]
  const bytes=csv(rows),objectId=randomUUID(),r=await stageProtectedTelecomImportV1(f.jobId,bytes,f.adapter,f.port,objectId)
  assert.equal(r.total_rows,6);assert.equal(r.production_ready,false);assert.equal(r.status,'encrypted_disposable_staging_only')
  const stored=await readFile(join(f.root,f.workspaceId,f.jobId,objectId+'.aead'))
  for(const row of rows){assert.equal(stored.includes(Buffer.from(row[3])),false);assert.equal(JSON.stringify(r).includes(row[3]),false)}
  assert.deepEqual(await stageProtectedTelecomImportV1(f.jobId,bytes,f.adapter,f.port,objectId),r)
  const grant=await f.adapter.authorize(f.jobId,'process');assert.deepEqual(Uint8Array.from(await f.adapter.get(grant,r.staging)),bytes)
 }finally{await rm(f.root,{recursive:true,force:true})}
})
test('protected input rejects ordinary/private extras, incompatible entity kinds, duplicate slots and cross-workspace ancestry without echoing values',async()=>{
 const f=await fixture();try{
  const id=randomUUID(),row=['line',id,'msisdn','+34600123456']
  for(const rows of [[row,row],[['service',id,'msisdn',row[3]]],[['line',id,'msisdn','=RAW_SECRET']],[['sim',id,'eid','123']]])await assert.rejects(stageProtectedTelecomImportV1(f.jobId,csv(rows),f.adapter,f.port),e=>/INVALID/.test(e.message)&&!e.message.includes('RAW_SECRET'))
  const extra=new TextEncoder().encode('entity_kind,entity_id,identifier_kind,canonical_value,pin\nline,'+id+',msisdn,'+row[3]+',1234')
  await assert.rejects(stageProtectedTelecomImportV1(f.jobId,extra,f.adapter,f.port),/INVALID/)
  await assert.rejects(stageProtectedTelecomImportV1(f.jobId,csv([row]),f.adapter,{...f.port,lookup:async(w,kind,id)=>({workspaceId:randomUUID(),kind,id})}),/REFERENCE_INVALID/)
 }finally{await rm(f.root,{recursive:true,force:true})}
})
test('protected seam denies revoked actors and unregistered/production adapters',async()=>{
 const f=await fixture();try{
  const bytes=csv([['line',randomUUID(),'msisdn','+34600123456']])
  await assert.rejects(stageProtectedTelecomImportV1(f.jobId,bytes,{...f.adapter,health:()=>({provider:'production',production_ready:true})},f.port),/NOT_CONFIGURED/)
  await assert.rejects(stageProtectedTelecomImportV1(f.jobId,bytes,f.adapter,{...f.port,kind:async()=>null}),/JOB_INVALID/)
  f.revoke();await assert.rejects(stageProtectedTelecomImportV1(f.jobId,bytes,f.adapter,f.port),/ACCESS_DENIED/)
 }finally{await rm(f.root,{recursive:true,force:true})}
})
