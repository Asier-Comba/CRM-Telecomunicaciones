import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHmac,randomBytes} from 'node:crypto'
import {createMailSink} from '../../scripts/platform/mail-sink.mjs'
const input={tenant:'tenant-a',actor:'actor-a',recipient:'recipient@example.invalid',sender:'sender@example.invalid',template:'notice',idempotency_key:'operation-one'}
function fixture(){let revoked=false;const sink=createMailSink({scope:'DISPOSABLE_SIMULATION',authorize:async p=>({...p,authorized:p.tenant==='tenant-a'&&p.actor==='actor-a'&&!revoked,consent:!revoked}),allowlist:['recipient@example.invalid','other@example.invalid'],senders:{'tenant-a':'sender@example.invalid'},templates:{notice:'synthetic notice'},maxAttempts:2,maxQueue:1});return {sink,revoke:()=>{revoked=true}}}
test('tenant authorization, sender, template, consent and recipient checks precede enqueue',async()=>{
 const {sink,revoke}=fixture()
 for(const change of [{tenant:'tenant-b'},{actor:'actor-b'},{sender:'other@example.invalid'},{recipient:'external@example.com'},{template:'unapproved'},{body:'private-unapproved'}])await assert.rejects(()=>sink.enqueue({...input,...change}))
 revoke();await assert.rejects(()=>sink.enqueue(input),/AUTHORIZATION/);assert.equal(sink.metadata().pending,0)
 assert.throws(()=>createMailSink({scope:'HOSTED'}),/DISPOSABLE/)
})
test('duplicate/retry/no SMTP captures exactly once; payload conflict and queue limit block',async()=>{
 const {sink}=fixture(),r=await sink.enqueue(input)
 assert.equal((await sink.enqueue(input)).duplicate,true)
 await assert.rejects(()=>sink.enqueue({...input,recipient:'other@example.invalid'}),/CONFLICT/)
 await assert.rejects(()=>sink.enqueue({...input,idempotency_key:'second'}),/LIMIT/)
 assert.equal((await sink.dispatch(r.operation_digest,{transport:'NO_SMTP'})).status,'RETRY')
 const sent=await sink.dispatch(r.operation_digest);assert.equal(sent.status,'CAPTURED');assert.equal(sent.delivery_proven,false)
 await sink.dispatch(r.operation_digest);assert.equal(sink.capture().length,1)
 const metadata=JSON.stringify(sink.metadata());for(const secret of ['recipient@example.invalid','sender@example.invalid','actor-a','tenant-a','synthetic notice'])assert.ok(!metadata.includes(secret))
})
test('queued operations are reauthorized after revocation and retry exhaustion is terminal',async()=>{
 const {sink,revoke}=fixture(),r=await sink.enqueue(input);revoke();assert.equal((await sink.dispatch(r.operation_digest)).status,'REVOKED');assert.equal(sink.capture().length,0)
 const f=fixture(),x=await f.sink.enqueue(input);await f.sink.dispatch(x.operation_digest,{failure:'UNAVAILABLE'});assert.equal((await f.sink.dispatch(x.operation_digest,{failure:'UNAVAILABLE'})).status,'FAILED');await f.sink.dispatch(x.operation_digest);assert.equal(f.sink.capture().length,0)
})
test('concurrent dispatchers capture a queued operation once',async()=>{
 const {sink}=fixture(),r=await sink.enqueue(input)
 const results=await Promise.all(Array.from({length:20},()=>sink.dispatch(r.operation_digest)))
 assert.equal(results.filter(r=>r.status==='CAPTURED').length,1);assert.equal(sink.capture().length,1)
})
test('bounce binds message to tenant and authenticates bounded timely single-use payload',async()=>{
 const {sink}=fixture(),r=await sink.enqueue(input),sent=await sink.dispatch(r.operation_digest),key=randomBytes(32),now=Date.now()
 const payload={tenant:'tenant-a',message_id:sent.message_id,nonce:'event-one',at:now,status:'BOUNCED'},sign=body=>createHmac('sha256',key).update(body).digest('hex')
 for(const p of [{...payload,tenant:'tenant-b'},{...payload,at:now-300001},{...payload,private:'canary'}]){const body=JSON.stringify(p);assert.throws(()=>sink.bounce({body,signature:sign(body),key,now}))}
 const body=JSON.stringify(payload);assert.throws(()=>sink.bounce({body,signature:'0'.repeat(64),key,now}),/SIGNATURE/);assert.equal(sink.bounce({body,signature:sign(body),key,now}).status,'BOUNCED');assert.throws(()=>sink.bounce({body,signature:sign(body),key,now}),/REPLAY/)
})
