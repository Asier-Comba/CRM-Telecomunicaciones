import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {PassThrough,Writable} from 'node:stream'
import {mkdtemp,realpath,readdir,rm,chmod,writeFile,readFile,lstat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {syntheticPrivateHistoryProducerV1} from './synthetic-history-producer.mjs'
import {openPrivateScanInputV1,withPrivateTransferFilesV1} from './private-scan-input.mjs'
import {pinnedHistoryObjectIdsV1} from './private-history-batch.mjs'

const linux={skip:process.platform!=='linux'?'Private materialization requires qualified Linux':false}
const values=['SYNTHETIC_STORAGE_ONE','SYNTHETIC_STORAGE_TWO','SYNTHETIC_STORAGE_THREE'].map(x=>Buffer.from(x))
const ids=values.map(bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex'))
const objects=()=>values.map((bytes,i)=>({id:ids[i],bytes:Buffer.from(bytes)}))
function child(){
 const c=new EventEmitter();c.stdout=new PassThrough();c.stderr=new PassThrough()
 c.stdin=new Writable({write(_bytes,_encoding,done){done()},final(done){done();setImmediate(()=>{
  c.stdout.once('end',()=>{c.emit('exit',0,null);c.emit('close',0,null)})
  c.stdout.end(Buffer.concat(values.map((bytes,i)=>Buffer.concat([Buffer.from(ids[i]+' blob '+bytes.length+'\n'),bytes,Buffer.from('\n')]))));c.stderr.end()
 })}})
 c.kill=()=>true;return c
}
async function parent(t){
 const path=await realpath(await mkdtemp(join(tmpdir(),'crm-synthetic-private-producer-')))
 t.after(()=>rm(path,{force:true,recursive:true}));return path
}
const produce=(path,consume)=>syntheticPrivateHistoryProducerV1({mode:'SYNTHETIC_ONLY',ids,startSyntheticChild:child,parent:path,consumeSyntheticTransfer:consume})

test('ordinary producer cannot invoke a process or materialization callback',async()=>{
 let calls=0;const result=await syntheticPrivateHistoryProducerV1({startSyntheticChild:()=>{calls++},consumeSyntheticTransfer:()=>{calls++}})
 assert.equal(result.result,'NOT_RUN');assert.equal(calls,0)
})
test('real pinned IDs cannot activate the synthetic producer',async()=>{
 let calls=0;const result=await syntheticPrivateHistoryProducerV1({mode:'SYNTHETIC_ONLY',ids:pinnedHistoryObjectIdsV1,startSyntheticChild:()=>{calls++}})
 assert.equal(result.result,'BLOCKED');assert.equal(result.error,'REAL_HISTORY_PRODUCER_NOT_CONNECTED');assert.equal(calls,0)
})
test('Linux producer materializes exclusive private files then proves owned absence',linux,async t=>{
 const root=await parent(t);let transfer
 const result=await produce(root,async path=>{
  transfer=path;const session=await openPrivateScanInputV1(path,{historyNames:ids})
  try{for(let i=0;i<ids.length;i++){const b=await session.read(ids[i],1024);assert.deepEqual(b,values[i]);b.fill(0)}assert.equal(await session.verify(),true)}finally{await session.close()}
  return true
 })
 assert.equal(result.result,'SYNTHETIC_TRANSFER_PASS');assert.equal(result.files_written,3);assert.equal(result.cleanup,'PASS');assert.equal(result.transport_process_cleanup,'PASS')
 assert.deepEqual(await readdir(root),[]);await assert.rejects(lstat(transfer),{code:'ENOENT'});assert.equal(JSON.stringify(result).includes(transfer),false)
})
test('Linux consumer exception is redacted and independent cleanup still removes owned transfer',linux,async t=>{
 const root=await parent(t),result=await produce(root,async()=>{throw Error('PRIVATE_SYNTHETIC_CONSUMER')})
 assert.equal(result.result,'BLOCKED');assert.equal(result.error,'PRIVATE_TRANSFER_BLOCKED');assert.equal(result.cleanup,'PASS');assert.equal(result.transport_process_cleanup,'PASS');assert.deepEqual(await readdir(root),[])
 assert.equal(JSON.stringify(result).includes('PRIVATE_SYNTHETIC_CONSUMER'),false)
})
test('Linux foreign file blocks cleanup acceptance and is never recursively deleted',linux,async t=>{
 const root=await parent(t);let transfer
 const result=await produce(root,async path=>{transfer=path;await writeFile(join(path,'foreign'),Buffer.from('FOREIGN'),{mode:0o600});return true})
 assert.equal(result.result,'BLOCKED');assert.equal(result.cleanup,'FAIL');assert.deepEqual(await readdir(transfer),['foreign']);assert.equal((await readFile(join(transfer,'foreign'))).toString(),'FOREIGN')
})
test('Linux replacement leaf is preserved and prevents a cleanup PASS',linux,async t=>{
 const root=await parent(t);let file
 const result=await produce(root,async path=>{file=join(path,ids[0]);await rm(file);await writeFile(file,Buffer.from('FOREIGN_REPLACEMENT'),{mode:0o600});return true})
 assert.equal(result.result,'BLOCKED');assert.equal(result.cleanup,'FAIL');assert.equal((await readFile(file)).toString(),'FOREIGN_REPLACEMENT')
})
test('Linux consumer may remove the original owned transfer without false cleanup failure',linux,async t=>{
 const root=await parent(t),result=await produce(root,async path=>{
  const session=await openPrivateScanInputV1(path,{historyNames:ids});try{await session.consumeHistory()}finally{await session.close()}return true
 })
 assert.equal(result.result,'SYNTHETIC_TRANSFER_PASS');assert.equal(result.cleanup,'PASS');assert.deepEqual(await readdir(root),[])
})
test('Linux unsafe parent mode blocks writing without changing parent or foreign files',linux,async t=>{
 const root=await parent(t);await chmod(root,0o755)
 const result=await produce(root,async()=>assert.fail('consumer must not run'))
 assert.equal(result.result,'BLOCKED');assert.equal(result.files_written,0);assert.deepEqual(await readdir(root),[])
})
test('Linux low-level writer captures names and bytes before asynchronous filesystem work',linux,async t=>{
 const root=await parent(t),rows=objects()
 const pending=withPrivateTransferFilesV1({parent:root,objects:rows,consume:async path=>{
  assert.deepEqual((await readdir(path)).sort(),[...ids].sort());assert.deepEqual(await readFile(join(path,ids[0])),values[0]);return true
 }})
 rows[0].id='../foreign';rows[0].bytes.fill(0)
 const result=await pending;assert.equal(result.result,'SYNTHETIC_TRANSFER_PASS');assert.equal(result.cleanup,'PASS');assert.deepEqual(await readdir(root),[])
})
