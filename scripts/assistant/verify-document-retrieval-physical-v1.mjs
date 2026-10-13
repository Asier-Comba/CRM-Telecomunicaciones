// Explicit local bridge probe. All authority/download metadata are synthetic;
// parser and retrieval execute real code. No Auth/Storage/index/model claim.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {isAbsolute} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {prepareDocumentRagSourceV1} from '../../src/assistant/document-rag-source-v1.ts'
import {retrieveAdmittedDocumentChunksV1} from '../../src/assistant/document-rag-retrieval-v1.ts'

async function main(){
 const [pythonExecutable,extractorModule,pdfFixture]=process.argv.slice(2)
 assert.ok([pythonExecutable,extractorModule,pdfFixture].every(p=>p&&isAbsolute(p)))
 const {createReviewedPdfExtractorV1}=await import(pathToFileURL(extractorModule).href)
 const extract=createReviewedPdfExtractorV1({pythonExecutable}),bytes=await readFile(pdfFixture)
 const authority={actorId:'synthetic-actor',workspaceId:'synthetic-workspace',role:'owner',scopeEpoch:'physical_pdf_retrieval_probe'}
 const source={documentId:'10000000-0000-4000-8000-000000000001',version:1,status:'active',sha256:createHash('sha256').update(bytes).digest('hex'),sizeBytes:bytes.length,
  mediaType:'application/pdf',documentKind:'contract',indexingApproved:true,contentClass:'reviewed_knowledge'}
 const prepared=await prepareDocumentRagSourceV1('reviewed_doc',{offeredHandles:['reviewed_doc'],authority:async()=>authority,
  resolveDocument:async()=>source,downloadAuthorized:async()=>bytes,extractPdf:extract})
 assert.equal(prepared.status,'prepared')
 const deps={authority:async()=>authority,sources:[{reference:'reviewed_doc',prepared:prepared.handle}],resolveCurrentDocument:async()=>source}
 const first=await retrieveAdmittedDocumentChunksV1('Fibra 600 Mbps',deps)
 assert.equal(first.status,'matched');assert.equal(first.citations.length,1);assert.equal(first.citations[0].page,1)
 assert.equal(first.citations[0].documentSha256,source.sha256);assert.ok(first.citations[0].text.includes('Fibra 600 Mbps'))
 assert.equal(first.citations[0].sha256,createHash('sha256').update(first.citations[0].text).digest('hex'))
 const compact=await retrieveAdmittedDocumentChunksV1('Fibra 600Mbps',deps)
 assert.equal(compact.status,'matched');assert.deepEqual(compact.citations,first.citations)
 for(const question of ['Fibra 600MBps','Fibra 601Mbps','Fibra 600Gbps']){
  const refused=await retrieveAdmittedDocumentChunksV1(question,deps)
  assert.equal(refused.status,'no_match');assert.equal(refused.citations.length,0)
 }
 const second=await retrieveAdmittedDocumentChunksV1('Permanencia 12 meses',deps)
 assert.equal(second.status,'matched');assert.equal(second.citations.length,1);assert.equal(second.citations[0].page,2)
 assert.ok(second.citations[0].text.includes('Permanencia 12 meses'));assert.equal(second.trust,'untrusted_document_data')
 const absent=await retrieveAdmittedDocumentChunksV1('portabilidad',deps)
 assert.equal(absent.status,'no_match');assert.equal(absent.scope,'selected_admitted_chunks_only');assert.equal(absent.citations.length,0)
 const withdrawn=await retrieveAdmittedDocumentChunksV1('fibra',{...deps,resolveCurrentDocument:async()=>({...source,version:2})})
 assert.equal(withdrawn.status,'access_changed');assert.equal(withdrawn.citations.length,0)
 console.log(JSON.stringify({contract:'assistant.document-retrieval-physical.v1',parser:'pypdf6.10.0',source_sha256:source.sha256,
  physical_retrieval:'PASS_REAL_PDF_TEXT_LEXICAL_PAGE1_PAGE2_EXACT_QUOTE_HASH_NO_MATCH_SELECTED_SCOPE_WITHDRAWAL',
  telecom_compact_rate:'PASS_EXACT_600MBPS_PAGE1_NO_MAGNITUDE_UNIT_OR_BYTE_RATE_CONVERSION',
  auth_download:'SYNTHETIC_SEAMS',actual_auth_storage:'NOT_RUN',persistent_index_embeddings:'NOT_IMPLEMENTED',live_model:'NOT_RUN',business_ai:'OFF',release:'NOT_ACCEPTED'}))
}
try{await main()}catch{console.error('physical_document_retrieval_failed');process.exitCode=1}
