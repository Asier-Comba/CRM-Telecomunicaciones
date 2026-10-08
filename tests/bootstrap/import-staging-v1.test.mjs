import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes,randomUUID}from 'node:crypto'
import {mkdtemp,readFile,writeFile,rm,symlink,stat}from 'node:fs/promises'
import {tmpdir}from 'node:os'
import {join}from 'node:path'
import {createDisposableImportStagingV1,importProcessingReadinessV1}from '../../src/lib/server/import-staging-disposable-v1.ts'
import {validateCustomerCsvV1}from '../../src/lib/server/import-csv-v1.ts'
const env=()=>({NODE_ENV:'test',IMPORT_STAGING_ADAPTER:'disposable-local',IMPORT_STAGING_TEST_KEY:randomBytes(32).toString('hex')})
const bytes=new TextEncoder().encode('account_kind,legal_name\r\nlegal_entity,"Synthetic, ""quoted"""\r\nsole_trader,Synthetic two\r\n')
async function fixture(){const root=await mkdtemp(join(tmpdir(),'crm-import-test-'));const scope={workspaceId:randomUUID(),actorId:randomUUID(),role:'owner'},id=randomUUID();let active=true,status='uploaded';const port={resolve:async()=>active?scope:null,job:async(w,j)=>w===scope.workspaceId&&j===id?{id,status}:null};const adapter=await createDisposableImportStagingV1(root,port,env());return{root,scope,id,adapter,revoke:()=>{active=false},terminal:()=>{status='cancelled'}}}
test('encrypted immutable staging uses fresh AEAD nonces, private permissions and atomic identical retries',async()=>{
 const f=await fixture();try{const g=await f.adapter.authorize(f.id,'stage'),object=randomUUID();const refs=await Promise.all(Array.from({length:20},()=>f.adapter.put(g,bytes,object)));assert.ok(refs.every(r=>JSON.stringify(r)===JSON.stringify(refs[0])));assert.deepEqual(Uint8Array.from(await f.adapter.get(g,refs[0])),bytes)
 const p=join(f.root,f.scope.workspaceId,f.id,object+'.aead'),stored=await readFile(p);assert.equal(stored.includes(Buffer.from('Synthetic')),false);assert.equal((await stat(p)).mode&0o777,0o600)
 const second=await f.adapter.put(g,bytes);const other=await readFile(join(f.root,f.scope.workspaceId,f.id,second.object_id+'.aead'));assert.notDeepEqual(stored.subarray(1,13),other.subarray(1,13))
 await assert.rejects(f.adapter.put(g,new TextEncoder().encode('changed'),object),/CONFLICT/)
 stored[stored.length-1]^=1;await writeFile(p,stored);await assert.rejects(f.adapter.get(g,refs[0]),/UNAVAILABLE/)
 }finally{await rm(f.root,{recursive:true,force:true})}
})
test('staging reauthorizes membership and job state; forged grants, symlink objects and forged expiry fail',async()=>{
 const f=await fixture();try{const g=await f.adapter.authorize(f.id,'stage'),r=await f.adapter.put(g,bytes);await assert.rejects(f.adapter.get({...g},r),/ACCESS_DENIED/);await assert.rejects(f.adapter.get(g,{...r,expires_at:'2099-01-01T00:00:00.000Z'}),/UNAVAILABLE/)
 const evil=randomUUID();await symlink(join(f.root,f.scope.workspaceId,f.id,r.object_id+'.aead'),join(f.root,f.scope.workspaceId,f.id,evil+'.aead'));await assert.rejects(f.adapter.put(g,bytes,evil))
 f.terminal();await assert.rejects(f.adapter.get(g,r),/ACCESS_DENIED/);const cleanup=await f.adapter.authorize(f.id,'cleanup');await f.adapter.delete(cleanup,r);await f.adapter.delete(cleanup,r);f.revoke();await assert.rejects(f.adapter.authorize(f.id,'cleanup'),/ACCESS_DENIED/)
 }finally{await rm(f.root,{recursive:true,force:true})}
})
test('CSV accepts quoted commas and escaped quotes, rejects malformed/oversized/unregistered formats, and bounds minimized preview',()=>{
 const r=validateCustomerCsvV1(bytes);assert.equal(r.valid_rows,2);assert.equal(r.rows[0].legal_name,'Synthetic, "quoted"')
 for(const s of ['bad,header\nx,y','account_kind,legal_name\nlegal_entity,"open','account_kind,legal_name\nlegal_entity,"x"junk','account_kind,legal_name\nlegal_entity,x\rz'])assert.throws(()=>validateCustomerCsvV1(new TextEncoder().encode(s)),/INVALID/)
 assert.throws(()=>validateCustomerCsvV1(new Uint8Array([0xff])),/INVALID/);assert.throws(()=>validateCustomerCsvV1(new Uint8Array(2*1024*1024+1)),/INVALID/)
 const invalid=validateCustomerCsvV1(new TextEncoder().encode('account_kind,legal_name\nlegal_entity,=secret\ninvalid,Synthetic'));assert.equal(invalid.invalid_rows,2);assert.equal(JSON.stringify(invalid).includes('secret'),false)
 const many=validateCustomerCsvV1(new TextEncoder().encode('account_kind,legal_name\n'+Array.from({length:25},()=> 'legal_entity,Synthetic').join('\n')));assert.equal(many.rows.length,20);assert.equal(many.has_more,true);assert.equal(validateCustomerCsvV1(bytes,1).rows.length,1)
})
test('production readiness cannot be established by an environment flag or a missing key',async()=>{
 assert.equal(importProcessingReadinessV1().production_ready,false)
 const root=await mkdtemp(join(tmpdir(),'crm-import-test-'));try{const port={resolve:async()=>null,job:async()=>null};await assert.rejects(createDisposableImportStagingV1(root,port,{NODE_ENV:'production',IMPORT_STAGING_ADAPTER:'disposable-local'}),/NOT_CONFIGURED/);await assert.rejects(createDisposableImportStagingV1(root,port,{NODE_ENV:'test',IMPORT_STAGING_ADAPTER:'disposable-local'}),/NOT_CONFIGURED/)}finally{await rm(root,{recursive:true,force:true})}
})
