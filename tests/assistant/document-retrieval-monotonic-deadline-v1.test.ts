import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {prepareDocumentRagSourceV1} from '../../src/assistant/document-rag-source-v1.ts'
import {retrieveAdmittedDocumentChunksV1} from '../../src/assistant/document-rag-retrieval-v1.ts'
const scope={actorId:'actor-a',workspaceId:'workspace-a',scopeEpoch:'epoch-1',role:'owner'}
async function fixture(){
 const bytes=Buffer.from('%PDF-synthetic-retrieval-clock'),document={documentId:'10000000-0000-4000-8000-000000000001',version:1,status:'active',
  sha256:createHash('sha256').update(bytes).digest('hex'),sizeBytes:bytes.length,mediaType:'application/pdf',documentKind:'contract',indexingApproved:true,contentClass:'reviewed_knowledge'}
 const prepared=await prepareDocumentRagSourceV1('doc',{authority:async()=>scope,offeredHandles:['doc'],resolveDocument:async()=>document,
  downloadAuthorized:async()=>bytes,extractPdf:async()=>[{page:1,text:'Fibra 600 Mbps.'}]})
 assert.equal(prepared.status,'prepared');assert.ok(prepared.handle)
 return{authority:async()=>scope,sources:[{reference:'doc',prepared:prepared.handle}],resolveCurrentDocument:async()=>document}
}
// Controlled monotonic clock/adapters, not a real stalled SDK, PDF parser,
// Auth/Storage, live model or production latency measurement.
test('two blocking-like resolver advances cannot return citations beyond the ten-second budget before timer delivery',async context=>{
 const deps=await fixture();let clock=0
 context.mock.method(performance,'now',()=>clock)
 const resolve=deps.resolveCurrentDocument;deps.resolveCurrentDocument=async()=>{clock+=6000;return resolve()}
 const result=await retrieveAdmittedDocumentChunksV1('fibra',deps)
 assert.equal(result.status,'unavailable');assert.deepEqual(result.citations,[])
})
test('initial authorization and resolver share the monotonic budget at the exact boundary',async context=>{
 const deps=await fixture();let clock=0,reads=0
 context.mock.method(performance,'now',()=>clock)
 deps.authority=async()=>{if(++reads===1)clock=6000;return scope}
 const resolve=deps.resolveCurrentDocument;deps.resolveCurrentDocument=async()=>{clock+=4000;return resolve()}
 const result=await retrieveAdmittedDocumentChunksV1('fibra',deps)
 assert.equal(result.status,'unavailable');assert.deepEqual(result.citations,[])
})
test('a within-budget retrieval retains exact quotes and reviewed source hash',async context=>{
 const deps=await fixture();let clock=0
 context.mock.method(performance,'now',()=>clock)
 const resolve=deps.resolveCurrentDocument;deps.resolveCurrentDocument=async()=>{clock+=4000;return resolve()}
 const result=await retrieveAdmittedDocumentChunksV1('fibra',deps)
 assert.equal(result.status,'matched');assert.equal(result.citations.length,1)
 assert.equal(result.citations[0].text,'Fibra 600 Mbps.');assert.equal(result.citations[0].sha256,createHash('sha256').update('Fibra 600 Mbps.').digest('hex'))
})
