// Explicit local physical parser probe; never part of an automatic paid/model path.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {isAbsolute,join} from 'node:path'
import {createHash} from 'node:crypto'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {createReviewedPdfExtractorV1} from '../../src/assistant/document-rag-pdf-extractor-v1.ts'
import {prepareDocumentRagSourceV1,admittedDocumentRagMaterialV1} from '../../src/assistant/document-rag-source-v1.ts'

async function main(){
 const [pythonExecutable,directory]=process.argv.slice(2)
 assert.ok(pythonExecutable&&isAbsolute(pythonExecutable)&&directory&&isAbsolute(directory))
 const extract=createReviewedPdfExtractorV1({pythonExecutable})
 const bytes=await readFile(join(directory,'reviewed.pdf')),pages=await extract(bytes)
 assert.equal(pages.length,2);assert.ok(pages[0].text.includes('Fibra 600 Mbps'));assert.ok(pages[1].text.includes('Permanencia 12 meses'))
 const long=await extract(await readFile(join(directory,'long.pdf')))
 assert.equal(long.length,1);assert.ok(Buffer.byteLength(long[0].text)>4096)
 for(const name of ['encrypted.pdf','too-many-pages.pdf','too-much-text.pdf','malformed.pdf'])
  await assert.rejects(extract(await readFile(join(directory,name))),{message:'PDF_EXTRACTION_UNAVAILABLE'})
 const authority={actorId:'00000000-0000-4000-8000-000000000001',workspaceId:'00000000-0000-4000-8000-000000000002',scopeEpoch:'synthetic_pdf_probe',role:'owner'}
 const source={documentId:'00000000-0000-4000-8000-000000000003',version:1,status:'active',sha256:createHash('sha256').update(bytes).digest('hex'),sizeBytes:bytes.length,
  mediaType:'application/pdf',documentKind:'contract',indexingApproved:true,contentClass:'reviewed_knowledge'}
 const prepared=await prepareDocumentRagSourceV1('selected_document',{offeredHandles:['selected_document'],authority:async()=>authority,
  resolveDocument:async()=>source,downloadAuthorized:async()=>bytes,extractPdf:extract})
 assert.equal(prepared.status,'prepared')
 const material=admittedDocumentRagMaterialV1(prepared.handle,authority,source)
 assert.equal(material.chunks.length,2);assert.equal(material.trust,'untrusted_document_data')
 assert.equal(material.chunks.map(c=>c.text).join(''),pages.map(p=>p.text).join(''))
 assert.equal(admittedDocumentRagMaterialV1(prepared.handle,authority,{...source,version:2}),null)
 assert.equal(admittedDocumentRagMaterialV1(prepared.handle,{...authority,workspaceId:'00000000-0000-4000-8000-000000000099'},source),null)
 let exited
 const cancelled=createReviewedPdfExtractorV1({pythonExecutable,launch:(file,args,options)=>{
  const child=spawn(file,args,{...options,stdio:'pipe'});exited=once(child,'exit');return child
 }})
 const controller=new AbortController(),pending=cancelled(bytes,controller.signal)
 controller.abort();await assert.rejects(pending,{message:'PDF_EXTRACTION_UNAVAILABLE'})
 const [code,signal]=await exited;assert.equal(code,null);assert.equal(signal,'SIGKILL')
 console.log(JSON.stringify({contract:'assistant.pdf-extraction-physical.v1',parser:'pypdf6.10.0',physical_pdf:'PASS_TWO_REAL_PAGES_LONG_TEXT_ENCRYPTED_MALFORMED_PAGE_TEXT_BOUNDS',
  physical_cancel:'PASS_OWNED_PYTHON_SIGKILL_OBSERVED',source_sha256:source.sha256,source_size:bytes.length,pages:2,chunks:2,
  admission:'PASS_REAL_PARSER_SYNTHETIC_AUTH_DOWNLOAD_VERSION_TENANT_BOUNDARIES',actual_auth_storage:'NOT_RUN',index_retrieval:'NOT_IMPLEMENTED',live_model:'NOT_RUN',business_ai:'OFF',release:'NOT_ACCEPTED'}))
}
try{await main()}catch{console.error('physical_pdf_extraction_failed');process.exitCode=1}
