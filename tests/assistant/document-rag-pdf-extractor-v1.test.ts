import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import {resolve} from 'node:path'
import type {ChildProcessWithoutNullStreams,SpawnOptionsWithoutStdio} from 'node:child_process'
import {createReviewedPdfExtractorV1,type ReviewedPdfExtractorDependenciesV1} from '../../src/assistant/document-rag-pdf-extractor-v1.ts'

const executable=resolve('synthetic-private-python'),bytes=Buffer.from('%PDF-synthetic-process-input')
const pages=[{page:1,text:'Datos documentales sintéticos.'}]
function fixture(behavior:(child:ChildProcessWithoutNullStreams)=>void){
  const process=new EventEmitter() as ChildProcessWithoutNullStreams
  const input:Buffer[]=[],signals:string[]=[],invocations:{file:string;args:string[];options:SpawnOptionsWithoutStdio}[]=[]
  Object.assign(process,{stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),kill:(signal:string)=>{
    signals.push(signal);queueMicrotask(()=>process.emit('close',null,signal));return true
  }})
  process.stdin.on('data',chunk=>input.push(Buffer.from(chunk)))
  const launch:NonNullable<ReviewedPdfExtractorDependenciesV1['launch']>=(file,args,options)=>{
    invocations.push({file,args,options});queueMicrotask(()=>behavior(process));return process
  }
  return {process,input,signals,invocations,launch}
}
const complete=(child:ChildProcessWithoutNullStreams,value:unknown=pages)=>{child.stdout.emit('data',Buffer.from(JSON.stringify(value)));child.emit('close',0,null)}

test('private PDF adapter pins process configuration, snapshots bytes and requires zero close',async()=>{
  const mock=fixture(child=>complete(child)),deps={pythonExecutable:executable,launch:mock.launch}
  const extract=createReviewedPdfExtractorV1(deps),original=Buffer.from(bytes),mutable=Buffer.from(bytes)
  const pending=extract(mutable);mutable.fill(0);deps.pythonExecutable=resolve('substituted-runtime')
  assert.deepEqual(await pending,pages);assert.deepEqual(Buffer.concat(mock.input),original)
  assert.equal(mock.invocations.length,1);assert.equal(mock.invocations[0]!.file,executable)
  const {args,options}=mock.invocations[0]!
  assert.deepEqual(args.slice(0,3),['-I','-X','utf8']);assert.match(args[3]!,/extract-reviewed-pdf-v1\.py$/)
  assert.equal(options.shell,false);assert.equal(options.windowsHide,true)
  assert.ok(Object.keys(options.env as object).every(key=>['SystemRoot','PATH','TEMP','TMP'].includes(key)))
  assert.equal(mock.signals.length,0)
})
test('private PDF adapter denies premature/nonzero results and malformed or expanded page schemas',async()=>{
  const failed=fixture(child=>{child.stdout.emit('data',Buffer.from(JSON.stringify(pages)));child.emit('close',17,null)})
  await assert.rejects(createReviewedPdfExtractorV1({pythonExecutable:executable,launch:failed.launch})(bytes),{message:'PDF_EXTRACTION_UNAVAILABLE'})
  for(const value of [[],[{page:2,text:'wrong page'}],[{page:1,text:'visible',metadata:'private'}],{page:1,text:'not array'}]){
    const mock=fixture(child=>complete(child,value))
    await assert.rejects(createReviewedPdfExtractorV1({pythonExecutable:executable,launch:mock.launch})(bytes),{message:'PDF_EXTRACTION_UNAVAILABLE'})
  }
})
test('private PDF adapter caps output before parsing and kills only its own process',async()=>{
  const mock=fixture(child=>child.stdout.emit('data',Buffer.alloc(220001,65)))
  await assert.rejects(createReviewedPdfExtractorV1({pythonExecutable:executable,launch:mock.launch})(bytes),{message:'PDF_EXTRACTION_UNAVAILABLE'})
  assert.deepEqual(mock.signals,['SIGKILL'])
})
test('private PDF adapter never publishes parser/launch error content',async()=>{
  for(const phase of ['warning','error','launch']){
    const mock=fixture(child=>phase==='warning'?child.stderr.emit('data',Buffer.from('synthetic private parser detail')):child.emit('error',Error('synthetic private parser detail')))
    const launch=phase==='launch'?()=>{throw Error('synthetic private launch detail')}:mock.launch
    await assert.rejects(createReviewedPdfExtractorV1({pythonExecutable:executable,launch})(bytes),{message:'PDF_EXTRACTION_UNAVAILABLE'})
  }
})
test('private PDF adapter cancellation and timeout cannot expose partial page output',async()=>{
  const early=fixture(()=>{}),aborted=new AbortController();aborted.abort()
  await assert.rejects(createReviewedPdfExtractorV1({pythonExecutable:executable,launch:early.launch})(bytes,aborted.signal))
  assert.equal(early.invocations.length,0)
  const mock=fixture(child=>child.stdout.emit('data',Buffer.from(JSON.stringify(pages)))),controller=new AbortController()
  const pending=createReviewedPdfExtractorV1({pythonExecutable:executable,launch:mock.launch})(bytes,controller.signal)
  controller.abort();await assert.rejects(pending,{message:'PDF_EXTRACTION_UNAVAILABLE'});assert.deepEqual(mock.signals,['SIGKILL'])
  const timeout=fixture(child=>child.stdout.emit('data',Buffer.from(JSON.stringify(pages))))
  await assert.rejects(createReviewedPdfExtractorV1({pythonExecutable:executable,launch:timeout.launch,timeoutMs:50})(bytes),{message:'PDF_EXTRACTION_UNAVAILABLE'})
  assert.deepEqual(timeout.signals,['SIGKILL'])
})
test('private PDF adapter refuses invalid configuration/input before launching',async()=>{
  let invoked=false
  const bad={get pythonExecutable(){invoked=true;return executable}}
  assert.throws(()=>createReviewedPdfExtractorV1(bad));assert.equal(invoked,false)
  assert.throws(()=>createReviewedPdfExtractorV1({pythonExecutable:'relative-python'}))
  assert.throws(()=>createReviewedPdfExtractorV1({pythonExecutable:executable,timeoutMs:10001}))
  const mock=fixture(()=>{}),extract=createReviewedPdfExtractorV1({pythonExecutable:executable,launch:mock.launch})
  for(const input of [Buffer.from('bad'),Buffer.alloc(10_485_761),new Uint8Array()])await assert.rejects(extract(input),{message:'PDF_EXTRACTION_UNAVAILABLE'})
  assert.equal(mock.invocations.length,0)
})
test('private PDF adapter preserves long extracted pages up to the existing200KB admission bound',async()=>{
  const long=[{page:1,text:'Fibra de datos autorizados. '.repeat(250)}]
  assert.ok(Buffer.byteLength(long[0]!.text)>4096)
  const mock=fixture(child=>complete(child,long))
  assert.deepEqual(await createReviewedPdfExtractorV1({pythonExecutable:executable,launch:mock.launch})(bytes),long)
})
