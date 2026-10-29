import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {setTimeout} from 'node:timers/promises'
import {syntheticGitBatchDecoderV1,pinnedHistoryBatchDecoderV1,pinnedHistoryObjectIdsV1,pinnedHistoryRequestV1} from './private-history-batch.mjs'

const values=[Buffer.from('SYNTHETIC_ONLY_ONE'),Buffer.from([0,255,10,13,83,89,78,84,72,69,84,73,67]),Buffer.from('SYNTHETIC_ONLY_THREE')]
const oid=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex')
const ids=values.map(oid)
const record=(bytes,index)=>Buffer.concat([Buffer.from(ids[index]+' blob '+bytes.length+'\n'),bytes,Buffer.from('\n')])
const fixture=()=>Buffer.concat(values.map(record))
const safe=error=>error.message==='PRIVATE_HISTORY_BATCH_BLOCKED'&&!error.message.includes('PRIVATE_CANARY')
const parse=bytes=>{const decoder=syntheticGitBatchDecoderV1(ids);decoder.feed(bytes);return decoder.finish()}
const wipe=rows=>rows.forEach(row=>row.bytes.fill(0))

test('binary batch preserves exact synthetic object bytes across arbitrary boundaries',()=>{
 for(const chunk of [1,7,64,65536]){
  const decoder=syntheticGitBatchDecoderV1(ids),batch=fixture()
  for(let i=0;i<batch.length;i+=chunk)decoder.feed(batch.subarray(i,i+chunk))
  const rows=decoder.finish();assert.deepEqual(rows.map(row=>row.id),ids);assert.deepEqual(rows.map(row=>row.bytes),values);wipe(rows)
 }
})
test('owned intake copies isolate caller mutation and outputs from source buffers',()=>{
 const decoder=syntheticGitBatchDecoderV1(ids),batch=fixture();decoder.feed(batch);batch.fill(0)
 const rows=decoder.finish();assert.deepEqual(rows.map(row=>row.bytes),values);wipe(rows);assert.ok(values[0].some(Boolean))
})
test('missing objects and malformed private diagnostics never escape as error text',()=>{
 for(const body of [ids[0]+' missing\n','PRIVATE_CANARY\n',ids[0]+' excluded\n',ids[0]+' ambiguous\n'])assert.throws(()=>parse(Buffer.from(body)),safe)
})
test('reordered or duplicate replies cannot substitute the three requested objects',()=>{
 assert.throws(()=>parse(Buffer.concat([record(values[1],1),record(values[0],0),record(values[2],2)])),safe)
 assert.throws(()=>parse(Buffer.concat([record(values[0],0),record(values[0],0),record(values[2],2)])),safe)
})
test('tree, commit and unsupported headers are rejected before payload admission',()=>{
 for(const type of ['tree','commit','tag','blob PRIVATE_CANARY','blob\t'])assert.throws(()=>parse(Buffer.from(fixture().toString('latin1').replace(' blob ',' '+type+' '),'latin1')),safe)
})
test('noncanonical zero negative leading-zero and oversized lengths fail closed',()=>{
 for(const size of ['0','-1','01','1048577','99999999999999999','1 PRIVATE_CANARY'])assert.throws(()=>parse(Buffer.from(ids[0]+' blob '+size+'\n')),safe)
})
test('same framing with mutated payload does not pass original Git object identity',()=>{
 const batch=fixture(),start=batch.indexOf(10)+1;batch[start]^=1;assert.throws(()=>parse(batch),safe)
})
test('truncated object, missing newline and trailing records are not silently ignored',()=>{
 const batch=fixture()
 for(const bytes of [batch.subarray(0,batch.length-1),batch.subarray(0,50),Buffer.concat([batch,Buffer.from('PRIVATE_CANARY')])])assert.throws(()=>parse(bytes),safe)
 const delimiter=Buffer.from(batch);delimiter[delimiter.indexOf(10)+1+values[0].length]=0;assert.throws(()=>parse(delimiter),safe)
})
test('binary protocol headers cannot hide non-ASCII high bits',()=>{
 const batch=fixture();batch[0]|=128;assert.throws(()=>parse(batch),safe)
})
test('byte and chunk bounds terminate and reject late input',()=>{
 for(const [limits,input] of [[{bytes:10},[Buffer.alloc(11)]],[{chunks:1},[Buffer.from('x'),Buffer.from('y')]]]){
  const decoder=syntheticGitBatchDecoderV1(ids,limits)
  assert.throws(()=>{for(const b of input)decoder.feed(b)},safe);assert.throws(()=>decoder.finish(),safe)
 }
})
test('elapsed deadline terminates before admitting later bytes',async()=>{
 const decoder=syntheticGitBatchDecoderV1(ids,{milliseconds:1});await setTimeout(10);assert.throws(()=>decoder.feed(fixture()),safe);assert.throws(()=>decoder.finish(),safe)
})
test('terminal sessions cannot finish twice or resume after explicit abort',()=>{
 const decoder=syntheticGitBatchDecoderV1(ids);decoder.feed(fixture());wipe(decoder.finish());assert.throws(()=>decoder.finish(),safe);assert.throws(()=>decoder.feed(fixture()),safe)
 const aborted=syntheticGitBatchDecoderV1(ids);aborted.feed(Buffer.from('PRIVATE_CANARY'));aborted.abort();assert.throws(()=>aborted.finish(),safe);assert.throws(()=>aborted.feed(fixture()),safe)
})
test('limits and arbitrary object requests cannot relax the production pinned request',()=>{
 for(const limits of [{bytes:99999999},{chunks:1025},{milliseconds:30001},{unknown:1},{bytes:0}])assert.throws(()=>syntheticGitBatchDecoderV1(ids,limits),safe)
 for(const request of [[],ids.slice(0,2),[ids[0],ids[0],ids[2]],['x',ids[1],ids[2]]])assert.throws(()=>syntheticGitBatchDecoderV1(request),safe)
 assert.equal(Object.isFrozen(pinnedHistoryObjectIdsV1),true);assert.equal(pinnedHistoryObjectIdsV1.length,3)
 assert.equal(pinnedHistoryRequestV1().toString('ascii'),pinnedHistoryObjectIdsV1.join('\n')+'\n')
 const decoder=pinnedHistoryBatchDecoderV1();decoder.feed(fixture());assert.throws(()=>decoder.finish(),safe)
})
