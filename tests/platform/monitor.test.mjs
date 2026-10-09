import {test} from 'node:test'
import assert from 'node:assert/strict'
import {healthSample,createAlertSink,rotationContract} from '../../scripts/platform/monitor-contract.mjs'
test('metadata health detects unavailable/stale backups/queues/expiring TLS and strips private payloads',()=>{
 for(const [component,metrics,limits]of [['backup',{age_seconds:101},{age_seconds:100}],['mail',{queue_depth:11},{queue_depth:10}],['tls',{expiry_seconds:99},{expiry_seconds:100}]]){const s=healthSample(component,{...metrics,available:true,email:'private@example.invalid',jwt:'canary-private',deployment_sha:'a'.repeat(40)},limits);assert.equal(s.status,'DEGRADED');assert.ok(!JSON.stringify(s).includes('private'));assert.equal(s.deployment_sha,'a'.repeat(40))}
 assert.equal(healthSample('worker',{available:false},{queue_depth:10}).status,'DEGRADED')
 const ai=healthSample('ai',{available:true,request_count:4,input_tokens:101,output_tokens:10,model_revision:'a'.repeat(64),model:'private@example.invalid',prompt:'canary-private'},{input_tokens:100,output_tokens:100})
 assert.equal(ai.status,'DEGRADED');assert.equal(ai.model_revision,'a'.repeat(64));assert.ok(!JSON.stringify(ai).includes('private'));assert.deepEqual(ai.reasons,['THRESHOLD_INPUT_TOKENS']);assert.throws(()=>healthSample('ai',{available:true},{'private@example.invalid':1}),/CONTRACT_INVALID/)
})
test('local alert sink deduplicates stable failure, emits changed reason and permits recovered recurrence',()=>{
 const sink=createAlertSink({scope:'DISPOSABLE_SIMULATION'}),sample=healthSample('mail',{available:false,queue_depth:20},{queue_depth:10})
 assert.equal(sink.evaluate(sample,1).status,'CAPTURED');assert.equal(sink.evaluate(sample,2).status,'DEDUPLICATED');sink.evaluate(healthSample('mail',{available:true,queue_depth:0},{queue_depth:10}),3);assert.equal(sink.evaluate(sample,4).status,'CAPTURED');assert.equal(sink.capture().length,2)
 assert.throws(()=>sink.evaluate({...sample,reasons:['private@example.invalid']}),/INVALID/)
})
test('rotation stages new health before switch and revokes old; failure rolls back before switching',async()=>{
 for(const reference of ['SUPABASE_DB_PASSWORD','SUPABASE_SERVICE_ROLE_KEY','SMTP_PASSWORD','OPENAI_API_KEY','N8N_API_KEY','BACKUP_ENCRYPTION_KEY_HEX','N8N_WEBHOOK_SECRET','DEPLOY_PROVIDER_REFERENCE']){const calls=[];let revoked=false;const adapter={health:async(_r,v)=>v==='NEW'||!revoked,stage:async()=>calls.push('stage'),switch:async()=>calls.push('switch'),revoke:async()=>{revoked=true;calls.push('revoke')},rollback:async()=>calls.push('rollback')};assert.equal((await rotationContract({scope:'DISPOSABLE_SIMULATION',adapter,reference})).live_rotation_proven,false);assert.deepEqual(calls,['stage','switch','revoke'])}
 const calls=[],adapter={health:async(_r,v)=>v==='OLD',stage:async()=>calls.push('stage'),rollback:async()=>calls.push('rollback'),switch:async()=>calls.push('switch')};await assert.rejects(()=>rotationContract({scope:'DISPOSABLE_SIMULATION',adapter,reference:'SMTP_PASSWORD'}),/NEW_HEALTH_FAILED/);assert.deepEqual(calls,['stage','rollback'])
})

test('contradictory healthy samples cannot clear an outstanding alert',()=>{
 const sink=createAlertSink({scope:'DISPOSABLE_SIMULATION'}),sample=healthSample('backup',{available:false,age_seconds:901},{age_seconds:900})
 assert.equal(sink.evaluate(sample,100).status,'CAPTURED')
 assert.throws(()=>sink.evaluate({...sample,status:'PASS'},101),/INCONSISTENT/)
 assert.throws(()=>sink.evaluate({...sample,reasons:[]},101),/INCONSISTENT/)
 assert.equal(sink.evaluate(sample,102).status,'DEDUPLICATED')
})
test('clock rollback captures a failure again rather than silencing it until a future clock catches up',()=>{
 const sink=createAlertSink({scope:'DISPOSABLE_SIMULATION'}),sample=healthSample('backup',{available:false},{age_seconds:900})
 assert.equal(sink.evaluate(sample,100).status,'CAPTURED')
 assert.equal(sink.evaluate(sample,50).status,'CAPTURED')
 assert.equal(sink.evaluate(sample,51).status,'DEDUPLICATED')
 for(const time of [NaN,-1,Infinity,1.5])assert.throws(()=>sink.evaluate(sample,time),/CLOCK_INVALID/)
 assert.equal(sink.capture().length,2)
})
