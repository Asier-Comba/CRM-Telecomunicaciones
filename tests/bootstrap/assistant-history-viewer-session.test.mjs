import test from 'node:test'
import assert from 'node:assert/strict'
import {withHistoryViewerSession} from '../../scripts/security/supabase-local/assistant-history-viewer-session.mjs'

function fixture({newPageFailure=false,closeFailure=false}={}) {
 const calls=[];let closed=false
 const viewer={isClosed:()=>closed,setDefaultTimeout:value=>calls.push(['timeout',value])}
 const context={addCookies:async value=>calls.push(['cookies',value]),newPage:async()=>{if(newPageFailure)throw Error('new-page');return viewer},
  close:async()=>{calls.push(['close']);closed=true;if(closeFailure)throw Error('cleanup')}}
 const browser={newContext:async value=>{calls.push(['context',value]);return context}}
 return {calls,viewer,browser,closed:()=>closed}
}
test('viewer failure is captured on the current open page before cleanup and retains its original error',async()=>{
 const f=fixture(),failure=Error('actual-viewer-timeout'),owner={isClosed:()=>false}
 await assert.rejects(withHistoryViewerSession({browser:f.browser,origin:'http://127.0.0.1:9999',cookie:'synthetic=value=tail; second=two',
  run:async page=>{assert.equal(page,f.viewer);throw failure},captureFailure:async page=>{
   assert.notEqual(page,owner);assert.equal(page,f.viewer);assert.equal(page.isClosed(),false);f.calls.push(['capture'])
  }}),error=>error===failure)
 assert.deepEqual(f.calls.slice(-2),[['capture'],['close']]);assert.equal(f.closed(),true)
 assert.equal(f.calls[1][1][0].value,'value=tail');assert.equal(f.calls[2][1],30000)
})
test('failure capture and cleanup refusals cannot turn a failed viewer check into success or replace it',async()=>{
 for(const synchronous of [false,true]){
  const f=fixture({closeFailure:true}),failure=Error('viewer-check')
  await assert.rejects(withHistoryViewerSession({browser:f.browser,origin:'http://127.0.0.1:9999',cookie:'synthetic=value',
   run:async()=>{throw failure},captureFailure:()=>{if(synchronous)throw Error('capture');return Promise.reject(Error('capture'))}}),error=>error===failure)
  assert.equal(f.closed(),true)
 }
})
test('successful viewer check closes its own context without a failure capture; page setup failures still clean up',async()=>{
 const f=fixture();let captures=0
 assert.equal(await withHistoryViewerSession({browser:f.browser,origin:'http://127.0.0.1:9999',cookie:'synthetic=value',
  run:async()=> 'checked',captureFailure:async()=>{captures++}}),'checked')
 assert.equal(captures,0);assert.equal(f.closed(),true)
 const cleanup=fixture({closeFailure:true})
 await assert.rejects(withHistoryViewerSession({browser:cleanup.browser,origin:'http://127.0.0.1:9999',cookie:'synthetic=value',
  run:async()=> 'checked',captureFailure:async()=>assert.fail('no check failure')}),/cleanup/)
 const failed=fixture({newPageFailure:true})
 await assert.rejects(withHistoryViewerSession({browser:failed.browser,origin:'http://127.0.0.1:9999',cookie:'synthetic=value',
  run:async()=>assert.fail('not reached'),captureFailure:async()=>assert.fail('no page')}),/new-page/)
 assert.equal(failed.closed(),true)
})
