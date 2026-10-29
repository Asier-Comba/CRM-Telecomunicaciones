import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
const ts=createRequire(import.meta.url)('typescript')

// Execute the actual handler, without rewriting its body. Request/page and
// promise collectors are doubles; no browser, headers or network are real.
function observer(request,urlAtEvent='http://127.0.0.1:3000/auth/callback#access_token=SYNTHETIC'){
 const source=readFileSync(new URL('../../tools/asier_auth_recovery/real-acceptance.mjs',import.meta.url),'utf8')
 const file=ts.createSourceFile('real-acceptance.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
 const candidates=[]
 function visit(node){
  if(ts.isVariableDeclaration(node)&&node.name.getText(file)==='observePairRequest'&&ts.isArrowFunction(node.initializer))candidates.push(node.initializer)
  if(ts.isCallExpression(node)&&node.expression.getText(file)==='trial.page.on'&&node.arguments[0]?.text==='request'&&ts.isArrowFunction(node.arguments[1]))candidates.push(node.arguments[1])
  ts.forEachChild(node,visit)
 }
 visit(file);assert.equal(candidates.length,1)
 const evidence={refresh_requests:0,password_writes:0,credential_url_at_auth_request:false,original_access_requests:0,header_observation_failure:false}
 const headerObservations=[],pendingHeaderObservations=[],state={failed:false};let address=urlAtEvent
 const handler=new Function('url','access','trial','evidence','headerObservations','pendingHeaderObservations','headerObservationState','return '+candidates[0].getText(file))('http://127.0.0.1:54321','SYNTHETIC_ACCESS',{page:{url:()=>address}},evidence,headerObservations,pendingHeaderObservations,state)
 handler(request)
 return{evidence,state,headerObservations,pendingHeaderObservations,navigate:value=>{address=value},settle:()=>Promise.all(pendingHeaderObservations)}
}
const get=allHeaders=>({url:()=> 'http://127.0.0.1:54321/auth/v1/user',method:()=> 'GET',headers:()=>({}),allHeaders})

test('sensitive header omitted by headers() still positively covers the original access request',async()=>{
 const h=observer(get(async()=>({authorization:'Bearer SYNTHETIC_ACCESS'})))
 await h.settle();assert.equal(h.evidence.original_access_requests,1);assert.equal(h.evidence.credential_url_at_auth_request,true)
 assert.equal(h.evidence.header_observation_failure,false);assert.equal(JSON.stringify(h.evidence).includes('SYNTHETIC_ACCESS'),false)
})
test('URL timing is captured before the complete-header await, even after navigation changes',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve})
 const h=observer(get(async()=>{await gate;return{authorization:'Bearer SYNTHETIC_ACCESS'}}))
 h.navigate('http://127.0.0.1:3000/login');release();await h.settle()
 assert.equal(h.evidence.original_access_requests,1);assert.equal(h.evidence.credential_url_at_auth_request,true)
})
test('header observation rejection is settled and fails closed without private diagnostics',async()=>{
 const h=observer(get(async()=>{throw Error('PRIVATE_HEADER_CANARY')}));await h.settle()
 assert.equal(h.state.failed,true);assert.equal(h.evidence.header_observation_failure,true);assert.equal(h.evidence.original_access_requests,0)
 assert.equal(JSON.stringify({state:h.state,evidence:h.evidence}).includes('PRIVATE_HEADER_CANARY'),false)
})
test('an unrelated prior-session access is not counted as admission of the incoming link',async()=>{
 const h=observer(get(async()=>({authorization:'Bearer SYNTHETIC_OTHER_USER'})));await h.settle()
 assert.equal(h.evidence.original_access_requests,0);assert.equal(h.evidence.credential_url_at_auth_request,false);assert.equal(h.state.failed,false)
})
