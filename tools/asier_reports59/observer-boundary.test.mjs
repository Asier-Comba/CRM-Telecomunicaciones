import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { observeReports59 } from './observe-initial-read.mjs'

const origin='http://127.0.0.1:31999'
function page(){const value=new EventEmitter(),frame={};value.mainFrame=()=>frame;return value}
function request(target,overrides={}){return {frame:()=>target.mainFrame(),url:()=>origin+'/api/product/v1/queries',method:()=> 'POST',resourceType:()=> 'fetch',postDataJSON:()=>({operation:'dashboard.get',input:{period:'month',audience:'my'}}),...overrides}}

test('observer refuses remote, alternate host, TLS and credential-bearing origins before hooks',()=>{
  for(const value of ['https://example.invalid','http://localhost:31999','https://127.0.0.1:31999','http://user:pass@127.0.0.1:31999']){
    const target=page();assert.throws(()=>observeReports59({page:target,origin:value}),/DISPOSABLE_LOOPBACK_REQUIRED/);assert.deepEqual(target.eventNames(),[])
  }
})
test('report target is preserved while snapshots exclude arbitrary target fields and marker payloads',()=>{
  const target=page(),report={private_marker:'synthetic-not-for-snapshot'}
  const observer=observeReports59({page:target,origin,report})
  observer.report.w2_ui_action_step='reports:initial_read'
  observer.mark('scope_switch',{dimension:'actor',private_marker:'synthetic-not-for-snapshot'})
  observer.mark('unrecognized',{private_marker:'synthetic-not-for-snapshot'})
  assert.equal(report.w2_ui_action_step,'reports:initial_read')
  const snapshot=observer.stop()
  assert.equal(snapshot.events.length,2)
  assert.ok(!JSON.stringify(snapshot).includes('synthetic-not-for-snapshot'))
})
test('another frame and another origin never contribute dashboard observations',()=>{
  const target=page(),observer=observeReports59({page:target,origin})
  target.emit('request',request(target,{frame:()=>({})}))
  target.emit('request',request(target,{url:()=> 'https://example.invalid/api/product/v1/queries'}))
  assert.equal(observer.stop().reads.length,0)
})
test('request observations are bounded and stop removes every registered listener',()=>{
  const target=page(),observer=observeReports59({page:target,origin})
  for(let i=0;i<13;i++)target.emit('request',request(target))
  const snapshot=observer.stop();assert.equal(snapshot.reads.length,12);assert.equal(snapshot.truncated,true)
  assert.deepEqual(target.eventNames(),[])
  target.emit('request',request(target));assert.equal(observer.snapshot().reads.length,12)
})
