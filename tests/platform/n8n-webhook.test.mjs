import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHmac,randomBytes} from 'node:crypto'
import {createWebhookContract} from '../../scripts/platform/n8n-webhook-contract.mjs'
const payload=()=>({registered_id:'synthetic-health-v1',tenant:'tenant-a',actor:'actor-a',nonce:'event-one',at:Date.now(),kind:'SYNTHETIC_HEALTH'})
function fixture(options={}){const key=randomBytes(32),authorize=async p=>({...p,authorized:p.tenant==='tenant-a'&&p.actor==='actor-a'}),gateway=createWebhookContract({scope:'DISPOSABLE_SIMULATION',key,authorize,...options}),sign=body=>createHmac('sha256',key).update(body).digest('hex');return {gateway,key,sign,authorize}}
test('registered closed webhook authenticates exact bytes/tenant and rejects arbitrary payload/replay',async()=>{
 const f=fixture(),p=payload(),body=JSON.stringify(p)
 for(const change of [{registered_id:'arbitrary'},{tenant:'tenant-b'},{actor:'actor-b'},{kind:'CRM_WRITE'},{private:'canary'},{at:p.at-300001}]){const b=JSON.stringify({...p,...change});await assert.rejects(()=>f.gateway.ingest(b,f.sign(b),p.at))}
 await assert.rejects(()=>f.gateway.ingest(body,'0'.repeat(64)),/SIGNATURE/);await assert.rejects(()=>f.gateway.ingest('x'.repeat(4097),'0'.repeat(64)),/SIZE/)
 const r=await f.gateway.ingest(body,f.sign(body),p.at);assert.equal(r.workflow_executed,false);await assert.rejects(()=>f.gateway.ingest(body,f.sign(body),p.at),/REPLAY/)
})
test('20 concurrent deliveries dedupe once and bounded queue/restart checkpoint preserves replay denial',async()=>{
 const f=fixture({maxQueue:1}),p=payload(),body=JSON.stringify(p),r=await Promise.allSettled(Array.from({length:20},()=>f.gateway.ingest(body,f.sign(body),p.at)));assert.equal(r.filter(r=>r.status==='fulfilled').length,1)
 const second=JSON.stringify({...p,nonce:'event-two'});await assert.rejects(()=>f.gateway.ingest(second,f.sign(second),p.at),/QUEUE_LIMIT/)
 const state=f.gateway.checkpoint();assert.ok(!JSON.stringify(state).includes('tenant-a'));const fresh=createWebhookContract({scope:'DISPOSABLE_SIMULATION',key:f.key,authorize:f.authorize,maxQueue:1});fresh.resume(state);await assert.rejects(()=>fresh.ingest(body,f.sign(body),p.at),/REPLAY/);assert.throws(()=>fresh.resume(state),/REQUIRES_EMPTY/)
})
test('authorization timeout/unavailable does not consume nonce; enabled/tampered resume fails',async()=>{
 const f=fixture({timeoutMs:5,authorize:()=>new Promise(()=>{})}),p=payload(),body=JSON.stringify(p);await assert.rejects(()=>f.gateway.ingest(body,f.sign(body),p.at),/TIMEOUT/);assert.equal(f.gateway.checkpoint().used.length,0)
 const g=fixture();for(const state of [{...g.gateway.checkpoint(),effects_enabled:true},{...g.gateway.checkpoint(),private:'canary'},{...g.gateway.checkpoint(),used:['invalid']}])assert.throws(()=>g.gateway.resume(state),/INVALID/)
 g.gateway.shutdown();await assert.rejects(()=>g.gateway.ingest(body,g.sign(body),p.at),/CLOSED/)
})
test('shutdown during authorization prevents capture after a late authority reply',async()=>{
 let complete;const f=fixture({authorize:p=>new Promise(r=>{complete=()=>r({...p,authorized:true})})}),p=payload(),body=JSON.stringify(p),pending=f.gateway.ingest(body,f.sign(body),p.at);f.gateway.shutdown();complete();await assert.rejects(()=>pending,/CLOSED/);assert.equal(f.gateway.checkpoint().queue.length,0)
})
