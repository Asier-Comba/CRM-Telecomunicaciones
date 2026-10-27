import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {responseForAction} from '../../tools/asier_compat62/response-action.mjs'

const source=readFileSync(new URL('../../tools/asier_compat62/guided-revocation.mjs',import.meta.url),'utf8')
const implementation=source.slice(source.indexOf('export async function revokedGuidedSave')).replace('export async function','async function')
const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0')
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}}

// Execute the actual helper body with deterministic I/O barriers. This checks
// cleanup lifetime; it never counts as a JWT/server authorization acceptance.
for(const blocked of ['header','session'])test(`retiring the barrier during ${blocked} prevents a later SQL suspension`,async()=>{
  const entered=deferred(),release=deferred(),response=deferred()
  let status='active',lateSuspensions=0,continues=0,handler,handlerTask,unrouted=false
  const request={method:()=> 'POST',postDataJSON:()=>({operation:'invoice.create_draft',input:{customer_id:id(3),opportunity_id:id(4),command_id:id(5)}}),headerValue:async()=>{
    if(blocked==='header'){entered.resolve();await release.promise}return'synthetic=opaque'
  }}
  const route={request:()=>request,abort:async()=>{},continue:async()=>{continues++}}
  const page={route:async(_url,value)=>{handler=value},unroute:async()=>{unrouted=true},waitForResponse:()=>response.promise}
  const sql=text=>{
    if(text.startsWith('select status'))return status
    if(text.startsWith('select (select count'))return'7|9|0'
    if(text.startsWith('select count'))return'1'
    if(text.startsWith("update public.workspace_members set status='suspended'")){lateSuspensions++;status='suspended';return status}
    if(text.startsWith("update public.workspace_members set status='active'")){status='active';return status}
    throw Error('UNEXPECTED_SQL')
  }
  const createServerClient=()=>({auth:{getSession:async()=>{
    if(blocked==='session'){entered.resolve();await release.promise}
    return{data:{session:{access_token:'synthetic-not-a-jwt',expires_at:Date.now()/1000+3600}}}
  }}})
  const helper=runInNewContext('('+implementation+')',{createServerClient,responseForAction,process:{env:{CI:'true',GITHUB_ACTIONS:'true'}},expect:()=>{throw Error('UNEXPECTED_UI_ASSERTION')}})
  let outcome
  const task=helper({origin:'http://127.0.0.1:3182',url:'http://127.0.0.1:54321',anon:'synthetic',wa:id(1),users:{ownerA:{id:id(2)}},sql,check:ok=>assert.ok(ok)},{page,customerId:id(3),opportunityId:id(4),save:async()=>{handlerTask=handler(route)},report:{}}).catch(error=>{outcome=error.message})
  await entered.promise;response.reject(Error('SYNTHETIC_RESPONSE_TIMEOUT'));await task
  const cleanBeforeRelease=unrouted&&status==='active'
  release.resolve();await handlerTask
  assert.equal(outcome,'SYNTHETIC_RESPONSE_TIMEOUT')
  assert.equal(cleanBeforeRelease,true)
  assert.equal(lateSuspensions,0,'a retired handler must not modify membership')
  assert.equal(status,'active')
  assert.equal(continues,0)
})
