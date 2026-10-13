import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {collectOwnedConsumerChildOutputV1} from '../../scripts/security/native-postgres/owned-consumer-child-output-v1.mjs'
function child(){const c=new EventEmitter();c.stdout=new EventEmitter();c.stderr=new EventEmitter();c.kills=0;c.kill=signal=>{assert.equal(signal,'SIGKILL');c.kills++};return c}

test('owned output remains pending after exit and includes data drained before close',async()=>{
 const c=child();let done=false
 const pending=collectOwnedConsumerChildOutputV1(c).then(value=>{done=true;return value})
 c.stdout.emit('data',Buffer.from('first\n'));c.emit('exit',0,null)
 await new Promise(resolve=>setImmediate(resolve));assert.equal(done,false)
 c.stdout.emit('data',Buffer.from('last\n'));c.emit('close',0,null)
 assert.equal(await pending,'first\nlast\n');assert.equal(c.kills,0)
})
test('overflow drained after a successful exit still rejects the closed evidence',async()=>{
 let captured
 const c=child(),pending=assert.rejects(collectOwnedConsumerChildOutputV1(c,text=>{captured=text}),{message:'OWNED_CONSUMER_CHILD_OUTPUT_UNAVAILABLE'})
 c.stdout.emit('data',Buffer.from('prior closed phase\n'));c.emit('exit',0,null);c.stdout.emit('data',Buffer.alloc(1048577));c.emit('close',0,null)
 await pending;assert.equal(c.kills,1);assert.equal(captured,'prior closed phase\n')
})
test('unobserved exit, abnormal exit and private transport errors never admit a successful close',async()=>{
 for(const kind of ['missing','code','signal','error']){
  const c=child(),pending=assert.rejects(collectOwnedConsumerChildOutputV1(c),{message:'OWNED_CONSUMER_CHILD_OUTPUT_UNAVAILABLE'})
  if(kind==='code')c.emit('exit',1,null)
  if(kind==='signal')c.emit('exit',null,'SIGKILL')
  if(kind==='error')c.emit('error',Error('private-child-material'))
  c.emit('close',0,null);await pending;assert.equal(c.kills,1)
 }
})
