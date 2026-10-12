import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {prepareDocumentRagSourceV1,admittedDocumentRagMaterialV1} from '../../src/assistant/document-rag-source-v1.ts'
import type {ReadAuthorityV2} from '../../src/assistant/product-read-executor-v2.ts'

// Server-adapter values only. These negatives do not demonstrate an actual
// Auth/Storage incident, a real PDF parser, a live model or an active index.
const scope:ReadAuthorityV2={actorId:'actor-a',workspaceId:'workspace-a',role:'owner',scopeEpoch:'epoch-1'}
const bytes=Buffer.from('%PDF-synthetic-authority-admission')
const source={documentId:'10000000-0000-4000-8000-000000000001',version:1,status:'active' as const,
 sha256:createHash('sha256').update(bytes).digest('hex'),sizeBytes:bytes.length,mediaType:'application/pdf' as const,
 documentKind:'contract' as const,indexingApproved:true as const,contentClass:'reviewed_knowledge' as const}
function deps(authority:()=>Promise<ReadAuthorityV2|null>){
 const calls={download:0,extract:0}
 return {calls,value:{authority,offeredHandles:['doc'],resolveDocument:async()=>source,
  downloadAuthorized:async()=>{calls.download++;return bytes},extractPdf:async()=>{calls.extract++;return [{page:1,text:'Condiciones revisadas.'}]}}}
}
test('initial authority accessors are denied before document download without evaluating getters',async()=>{
 let getters=0
 const value={...scope};Object.defineProperty(value,'role',{enumerable:true,get(){getters++;return 'owner'}})
 const f=deps(async()=>value),result=await prepareDocumentRagSourceV1('doc',f.value)
 assert.equal(result.status,'not_admitted');assert.equal(result.handle,null)
 assert.equal(getters,0);assert.deepEqual(f.calls,{download:0,extract:0})
})
test('fresh authority descriptor revocation cannot be hidden by a Proxy get trap',async()=>{
 let reads=0,getters=0
 const revoked={...scope,scopeEpoch:'epoch-revoked'}
 const value=new Proxy(revoked,{get(target,key){
  // Promise resolution legitimately probes `then`; measure authority fields.
  if(!Object.hasOwn(scope,key))return Reflect.get(target,key)
  getters++;return scope[key as keyof ReadAuthorityV2]
 }})
 const f=deps(async()=>++reads===1?scope:value),result=await prepareDocumentRagSourceV1('doc',f.value)
 assert.equal(result.status,'access_changed');assert.equal(result.handle,null)
 assert.equal(getters,0);assert.deepEqual(f.calls,{download:0,extract:0})
})
test('an admitted material handle rejects an accessor authority without disclosing chunks',async()=>{
 const f=deps(async()=>scope),result=await prepareDocumentRagSourceV1('doc',f.value)
 assert.equal(result.status,'prepared');assert.ok(result.handle)
 let getters=0
 const value={...scope};Object.defineProperty(value,'workspaceId',{enumerable:true,get(){getters++;return scope.workspaceId}})
 assert.equal(admittedDocumentRagMaterialV1(result.handle,value,source),null);assert.equal(getters,0)
})
