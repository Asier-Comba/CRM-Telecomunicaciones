import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {PassThrough,Writable} from 'node:stream'
import {createHash} from 'node:crypto'
import {spawn} from 'node:child_process'
import {setTimeout} from 'node:timers/promises'
import {collectSyntheticHistoryTransportV1,producePinnedHistoryTransferV1} from './synthetic-history-transport.mjs'
import {pinnedHistoryObjectIdsV1} from './private-history-batch.mjs'

const values=['SYNTHETIC_TRANSPORT_ONE','SYNTHETIC_TRANSPORT_TWO','SYNTHETIC_TRANSPORT_THREE'].map(x=>Buffer.from(x))
const oid=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'),ids=values.map(oid)
const batch=()=>Buffer.concat(values.map((bytes,i)=>Buffer.concat([Buffer.from(ids[i]+' blob '+bytes.length+'\n'),bytes,Buffer.from('\n')])))
function fixture(action,{ignoreKill=false}={}){
 const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.signals=[];child.done=false
 child.stdin=new Writable({write(bytes,_encoding,done){assert.equal(bytes.toString(),ids.join('\n')+'\n');done()},final(done){done();setImmediate(()=>action(child))}})
 child.finish=(bytes=Buffer.alloc(0),code=0,signal=null)=>{
  if(child.done)return;child.done=true
  child.stdout.once('end',()=>{if(!child.exited)child.emit('exit',code,signal);child.emit('close',code,signal)})
  child.stdout.end(bytes);child.stderr.end()
 }
 child.kill=signal=>{child.signals.push(signal);if(!ignoreKill)setImmediate(()=>child.finish(Buffer.alloc(0),null,signal));return true}
 return child
}
const invoke=(child,extra={})=>collectSyntheticHistoryTransportV1({mode:'SYNTHETIC_ONLY',ids,startSyntheticChild:()=>child,milliseconds:1000,terminationMilliseconds:10,...extra})
const wipe=rows=>rows.forEach(row=>row.bytes.fill(0))

test('ordinary and real modes never invoke a child or create transfer data',async()=>{
 let invoked=0
 for(const mode of [undefined,'ORDINARY','PINNED_REAL'])assert.equal((await collectSyntheticHistoryTransportV1({mode,startSyntheticChild:()=>{invoked++}})).result,'NOT_RUN')
 assert.equal((await producePinnedHistoryTransferV1()).error,'REAL_HISTORY_PRODUCER_NOT_CONNECTED');assert.equal(invoked,0)
})
test('synthetic mode rejects pinned real object requests and invalid budgets before invocation',async()=>{
 let invoked=0
 for(const extra of [{ids:pinnedHistoryObjectIdsV1},{milliseconds:30001},{terminationMilliseconds:5001},{ids:[]}]){
  const result=await collectSyntheticHistoryTransportV1({mode:'SYNTHETIC_ONLY',ids,startSyntheticChild:()=>{invoked++},...extra})
  assert.equal(result.result,'BLOCKED')
 }
 assert.equal(invoked,0)
})
test('complete synthetic output is available only after stdout end and child close',async()=>{
 const child=fixture(c=>c.finish(batch())),result=await invoke(child)
 assert.equal(result.result,'SYNTHETIC_ONLY_PASS');assert.equal(result.process_cleanup,'PASS');assert.equal(result.exit_observed,true);assert.equal(result.stdout_end,true);assert.equal(result.close_observed,true)
 assert.equal(JSON.stringify(result).includes('SYNTHETIC_TRANSPORT_ONE'),false)
 const objects=result.takeObjects();assert.deepEqual(objects.map(x=>x.bytes),values);wipe(objects);assert.throws(()=>result.takeObjects(),/TERMINAL/)
})
test('exit before delayed stdout cannot prematurely accept or discard final bytes',async()=>{
 let enter;const entered=new Promise(done=>{enter=done}),output=batch(),half=Math.floor(output.length/2)
 const child=fixture(c=>{c.stdout.write(output.subarray(0,half));c.exited=true;c.emit('exit',0,null);enter()})
 let settled=false;const pending=invoke(child).then(result=>{settled=true;return result})
 await entered;await setTimeout(1);assert.equal(settled,false)
 child.finish(output.subarray(half));const result=await pending;assert.equal(result.result,'SYNTHETIC_ONLY_PASS');wipe(result.takeObjects())
})
test('process close without stdout completion cannot qualify',async()=>{
 const result=await invoke(fixture(c=>{c.emit('exit',0,null);c.emit('close',0,null)}))
 assert.equal(result.result,'BLOCKED');assert.equal(result.stdout_end,false);assert.equal(result.takeObjects,undefined)
})
test('malformed output and stderr canaries remain redacted while child cleanup completes',async()=>{
 const child=fixture(c=>{c.stderr.write(Buffer.from('PRIVATE_SYNTHETIC_STDERR'));c.stdout.write(Buffer.from('PRIVATE_SYNTHETIC_OUTPUT'))})
 const result=await invoke(child,{milliseconds:10});assert.equal(result.result,'BLOCKED');assert.equal(result.process_cleanup,'PASS');assert.equal(JSON.stringify(result).includes('PRIVATE_'),false)
})
test('nonzero exit blocks even a syntactically complete batch',async()=>{
 const result=await invoke(fixture(c=>c.finish(batch(),1)))
 assert.equal(result.result,'BLOCKED');assert.equal(result.error,'SYNTHETIC_TRANSPORT_PROCESS');assert.equal(result.process_cleanup,'PASS')
})
test('stdin and stdout errors are handled and do not orphan rejection',async()=>{
 for(const stream of ['stdin','stdout','stderr']){
  const result=await invoke(fixture(c=>c[stream].emit('error',Error('PRIVATE_SYNTHETIC_IO'))))
  assert.equal(result.result,'BLOCKED');assert.equal(result.error,'SYNTHETIC_TRANSPORT_IO');assert.equal(result.process_cleanup,'PASS');assert.equal(JSON.stringify(result).includes('PRIVATE_'),false)
 }
})
test('oversized output is bounded during receipt and terminates the own child',async()=>{
 const child=fixture(c=>c.stdout.write(Buffer.alloc(3*(1024*1024+100)+1)))
 const result=await invoke(child);assert.equal(result.error,'SYNTHETIC_TRANSPORT_OUTPUT');assert.equal(result.process_cleanup,'PASS');assert.ok(child.signals.includes('SIGTERM'))
})
test('timeout escalation with unconfirmed close is BLOCKED, never a transfer',async()=>{
 const child=fixture(()=>{},{ignoreKill:true}),result=await invoke(child,{milliseconds:5,terminationMilliseconds:5})
 assert.equal(result.result,'BLOCKED');assert.equal(result.process_cleanup,'UNKNOWN');assert.deepEqual(child.signals,['SIGTERM','SIGKILL']);assert.equal(result.takeObjects,undefined)
 child.stdout.write(Buffer.from('PRIVATE_LATE_OUTPUT'));child.emit('error',Error('PRIVATE_LATE_ERROR'));child.finish(batch())
 assert.equal(JSON.stringify(result).includes('PRIVATE_'),false);assert.equal(result.close_observed,false)
})
test('spawn rejection exposes no raw error or private invocation detail',async()=>{
 const result=await collectSyntheticHistoryTransportV1({mode:'SYNTHETIC_ONLY',ids,startSyntheticChild:()=>{throw Error('PRIVATE_SYNTHETIC_SPAWN')}})
 assert.equal(result.result,'BLOCKED');assert.equal(result.process_cleanup,'NOT_CREATED');assert.equal(JSON.stringify(result).includes('PRIVATE_'),false)
})
test('disposing an untaken receipt prevents later retrieval',async()=>{
 const result=await invoke(fixture(c=>c.finish(batch())));result.dispose();assert.throws(()=>result.takeObjects(),/TERMINAL/);result.dispose()
})
test('actual owned Node fixture confirms process and binary stream closure without Git',async()=>{
 const script="process.stdin.resume();process.stdin.on('end',()=>{process.stderr.write('PRIVATE_SYNTHETIC_STDERR');process.stdout.end(Buffer.from("+JSON.stringify(batch().toString('base64'))+",'base64'));})"
 const result=await collectSyntheticHistoryTransportV1({mode:'SYNTHETIC_ONLY',ids,startSyntheticChild:()=>spawn(process.execPath,['-e',script],{stdio:['pipe','pipe','pipe'],env:{},windowsHide:true}),milliseconds:5000,terminationMilliseconds:100})
 assert.equal(result.result,'SYNTHETIC_ONLY_PASS');assert.equal(result.process_cleanup,'PASS');assert.equal(JSON.stringify(result).includes('PRIVATE_'),false);wipe(result.takeObjects())
})
test('synchronous close during termination cannot schedule another kill or leak an exception',async()=>{
 const c=fixture(child=>child.stdout.write(Buffer.alloc(3*(1024*1024+100)+1)));let kills=0
 c.kill=()=>{kills++;c.emit('error',Error('PRIVATE_SYNTHETIC_KILL'));c.emit('close',null,'SIGTERM');return true}
 const result=await invoke(c);await setTimeout(25)
 assert.equal(result.result,'BLOCKED');assert.equal(result.close_observed,true);assert.equal(kills,1);c.stdout.destroy();c.stderr.destroy()
})
test('actual child exit precedes delayed inherited stdout while collection waits for close',{skip:process.platform!=='linux'?'Linux inherited-stdout fixture required; Windows observed close without descendant output':false},async()=>{
 const writer="setTimeout(()=>process.stdout.end(Buffer.from("+JSON.stringify(batch().toString('base64'))+",'base64')),75)"
 const script="const{spawn}=require('node:child_process');process.stdin.resume();process.stdin.on('end',()=>{spawn(process.execPath,['-e',"+JSON.stringify(writer)+"],{stdio:['ignore',process.stdout,'ignore'],env:{},windowsHide:true});process.exit(0)})"
 let settled=false,sawExit=false
 const result=await collectSyntheticHistoryTransportV1({mode:'SYNTHETIC_ONLY',ids,startSyntheticChild:()=>{
  const c=spawn(process.execPath,['-e',script],{stdio:['pipe','pipe','pipe'],env:{},windowsHide:true});c.on('exit',()=>{sawExit=!settled});return c
 },milliseconds:5000,terminationMilliseconds:100}).then(receipt=>{settled=true;return receipt})
 assert.equal(sawExit,true);assert.equal(result.result,'SYNTHETIC_ONLY_PASS');assert.equal(result.stdout_end,true);assert.equal(result.close_observed,true);wipe(result.takeObjects())
})
