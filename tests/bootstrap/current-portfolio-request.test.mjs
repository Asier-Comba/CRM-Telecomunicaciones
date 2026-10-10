import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {captureCurrentPortfolioRequest} from '../../scripts/security/supabase-local/current-portfolio-request.mjs'

const destination='http://127.0.0.1:3109/portfolio?kind=contract&id=synthetic'
function fixture(){
 const page=new EventEmitter();let url='about:blank',waits=0,reads=0
 const main={url:()=>url},foreign={url:()=>destination}
 page.mainFrame=()=>main
 page.waitForRequest=async predicate=>{waits++;const request={frame:()=>main,exact:true};assert.equal(predicate(request),true);return request}
 const capture=captureCurrentPortfolioRequest({page,destination,predicate:r=>{reads++;return r.exact===true}})
 const commit=(next=destination)=>{url=next;page.emit('framenavigated',main)}
 const emit=(frame=main,exact=true)=>{const request={frame:()=>frame,exact};page.emit('request',request);return request}
 return{page,main,foreign,capture,commit,emit,counts:()=>({waits,reads})}
}
const clear=f=>{f.capture.finish();for(const event of ['request','framenavigated'])assert.equal(f.page.listenerCount(event),0)}

test('navigation consumes no request budget and a read before load is retained without an additional waiter',async()=>{
 const f=fixture();assert.deepEqual(f.counts(),{waits:0,reads:0});f.commit();const first=f.emit()
 assert.equal(await f.capture.wait(),first);assert.equal(f.counts().waits,0);clear(f)
})
test('only the first current matching request is retained',async()=>{
 const f=fixture();f.commit();const first=f.emit();for(let i=0;i<100;i++)f.emit()
 assert.equal(await f.capture.wait(),first);assert.equal(f.counts().reads,1);clear(f)
})
test('precommit, foreign-frame and mismatched requests cannot supply the current reference',async()=>{
 const f=fixture();f.emit();f.commit();f.emit(f.foreign);f.emit(f.main,false);const first=f.emit()
 assert.equal(await f.capture.wait(),first);assert.deepEqual(f.counts(),{waits:0,reads:2});clear(f)
})
test('when no early request exists the ordinary default waiter starts only when requested',async()=>{
 const f=fixture();f.commit();assert.equal(f.counts().waits,0);await f.capture.wait();assert.equal(f.counts().waits,1);clear(f)
})
test('a successor document invalidates the cached reference even if it has the same URL',async()=>{
 for(const next of [destination,destination+'&changed=1']){
  const f=fixture();f.commit();f.emit();f.commit(next);f.emit();await assert.rejects(f.capture.wait(),/DOCUMENT_CHANGED/);assert.equal(f.counts().waits,0);clear(f)
 }
})
test('detached requests do not throw, publish data or evaluate private fields',async()=>{
 const f=fixture();f.commit();f.page.emit('request',{frame:()=>{throw Error('private detached detail')},get exact(){throw Error('private getter')}})
 const first=f.emit();assert.equal(await f.capture.wait(),first);clear(f)
})
test('finish is idempotent and refuses a later request wait',async()=>{
 const f=fixture();clear(f);clear(f);await assert.rejects(f.capture.wait(),/CAPTURE_FINISHED/)
})
test('non-local, credentialed, fragment and different-path destinations are refused before listeners',()=>{
 for(const destination of ['https://private.invalid/portfolio','http://synthetic:private@127.0.0.1/portfolio','http://127.0.0.1/portfolio#fragment','http://127.0.0.1/reports']){
  const page=new EventEmitter();assert.throws(()=>captureCurrentPortfolioRequest({page,destination,predicate:()=>true}),/DESTINATION_INVALID/);assert.equal(page.eventNames().length,0)
 }
})
