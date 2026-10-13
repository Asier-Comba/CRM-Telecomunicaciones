import {test} from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {requestOwnedResourceRestartV1,bindOwnedResourceRestartV1} from '../../scripts/security/native-postgres/owned-resource-restart-channel-v1.mjs'
function channels(){const parent=new EventEmitter(),worker=new EventEmitter();parent.connected=worker.connected=true;parent.exitCode=null;let killed=0
 parent.send=(p,cb)=>{queueMicrotask(()=>worker.emit('message',p));cb?.()};worker.send=(p,cb)=>{queueMicrotask(()=>parent.emit('message',p));cb?.()};parent.kill=()=>{killed++;worker.emit('disconnect')}
 return{parent,worker,killed:()=>killed}}
test('owned restart relay performs exactly one captured callback with no target or row packets',async()=>{
 const f=channels();let calls=0;const relay=bindOwnedResourceRestartV1(f.parent,async()=>{calls++})
 await requestOwnedResourceRestartV1(f.worker);assert.equal(calls,1);assert.equal(f.worker.listenerCount('message'),0)
 await assert.rejects(requestOwnedResourceRestartV1(f.worker));assert.equal(calls,1);assert.equal(f.killed(),1);await relay.close()
})
test('owned restart relay refuses foreign payload fields before owner action',async()=>{
 const f=channels();let calls=0;const relay=bindOwnedResourceRestartV1(f.parent,async()=>{calls++})
 f.parent.emit('message',{kind:'OWNED_RESOURCE_RESTART_V1',request:'a'.repeat(32),target:'foreign'});assert.equal(calls,0);assert.equal(f.killed(),1);await relay.close()
})
test('owned restart client rejects mismatched replies and removes handlers without retry',async()=>{
 const f=channels();let sends=0;f.worker.send=(_p,cb)=>{sends++;cb();queueMicrotask(()=>f.worker.emit('message',{kind:'OWNED_RESOURCE_RESTARTED_V1',request:'0'.repeat(32)}))}
 await assert.rejects(requestOwnedResourceRestartV1(f.worker),{message:'OWNED_RESOURCE_RESTART_CHANNEL_UNAVAILABLE'});assert.equal(sends,1);assert.equal(f.worker.listenerCount('message'),0)
})
test('owned restart callback failure stays closed without exporting original errors',async()=>{
 const f=channels();const relay=bindOwnedResourceRestartV1(f.parent,async()=>{throw Error('synthetic private detail')})
 await assert.rejects(requestOwnedResourceRestartV1(f.worker),{message:'OWNED_RESOURCE_RESTART_CHANNEL_UNAVAILABLE'});await relay.close()
})
test('owned restart close discards late completion and absent IPC never invokes an owner',async()=>{
 const f=channels();let release;const relay=bindOwnedResourceRestartV1(f.parent,()=>new Promise(resolve=>{release=resolve}))
 const result=requestOwnedResourceRestartV1(f.worker);await new Promise(resolve=>setImmediate(resolve));const closed=relay.close();f.worker.emit('disconnect');release();await closed;await assert.rejects(result)
 await assert.rejects(requestOwnedResourceRestartV1({connected:false}),{message:'OWNED_RESOURCE_RESTART_CHANNEL_UNAVAILABLE'})
})
test('lost parent IPC reply cannot prevent relay cleanup or trigger another owner restart',async()=>{
 const f=channels();let calls=0;f.parent.send=()=>{throw Error('closed synthetic IPC')}
 const relay=bindOwnedResourceRestartV1(f.parent,async()=>{calls++})
 f.parent.emit('message',{kind:'OWNED_RESOURCE_RESTART_V1',request:'a'.repeat(32)})
 await new Promise(resolve=>setImmediate(resolve));await relay.close();assert.equal(calls,1);assert.equal(f.parent.listenerCount('message'),0)
})
