import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

// Installed SDK and actual component effect; hook/JSX and ALL network I/O are
// synthetic. No real Auth, browser, email, credential or hosted acceptance.
const source=`
import {createBrowserClient} from '@supabase/ssr';
import {screen} from './tests/helpers/auth-screen.mjs';
const mode=JSON.parse(process.argv[1]);
globalThis.BroadcastChannel=undefined;
globalThis.document={visibilityState:'visible',addEventListener(){},removeEventListener(){}};
let address=new URL('http://127.0.0.1:3000/login');
globalThis.window={document,get location(){return address},history:{replaceState(_a,_b,url){address=new URL(url,address)}},localStorage:{removeItem(){}},addEventListener(){},removeEventListener(){}};
// The two clients model a full document navigation in this isolated process.
// Suppress only the SDK's multi-client warning; no credential diagnostics.
console.warn=()=>{};
const cookies=new Map();let recover=0,exchange=0,manual=0,denied=0;
const uid='00000000-0000-4000-8000-000000000063',sid='00000000-0000-4000-8000-000000000064';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'synthetic@example.invalid',created_at:new Date().toISOString()};
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const access=enc({alg:'none'})+'.'+enc({sub:uid,session_id:sid,exp:Math.floor(Date.now()/1000)+3600})+'.c3ludGhldGlj';
const fixture={access_token:access,refresh_token:'SYNTHETIC_REFRESH',token_type:'bearer',expires_in:3600,user};
const fetch=async(input)=>{
 const url=new URL(typeof input==='string'?input:input.url);
 if(url.origin!=='http://127.0.0.1:54321'){denied++;throw Error('NETWORK_FORBIDDEN')}
 if(url.pathname==='/auth/v1/recover'){recover++;return new Response('{}',{status:200})}
 if(url.pathname==='/auth/v1/user')return new Response(JSON.stringify(user),{status:200});
 if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='pkce'){
  exchange++;
  return mode.kind==='failed'?new Response(JSON.stringify({error:'invalid_grant',msg:'PRIVATE_SYNTHETIC_CANARY'}),{status:400}):new Response(JSON.stringify(fixture),{status:200});
 }
 denied++;throw Error('NETWORK_FORBIDDEN');
};
const make=()=>createBrowserClient('http://127.0.0.1:54321','SYNTHETIC_ANON',{isSingleton:false,cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:items=>{for(const {name,value}of items){if(value)cookies.set(name,value);else cookies.delete(name)}}},auth:{autoRefreshToken:false},global:{fetch}});
const sender=make();await sender.auth.initialize();
if(!['positive','cached'].includes(mode.kind)){
 const seeded=await sender.auth.setSession(fixture);
 if(seeded.error||!seeded.data.session)throw Error('SYNTHETIC_PRIOR_SESSION_SETUP_FAILED');
}
if(['positive','failed','hash'].includes(mode.kind)){
 const sent=await sender.auth.resetPasswordForEmail(user.email,{redirectTo:'http://127.0.0.1:3000/reset-password'});
 if(sent.error)throw Error('SYNTHETIC_SETUP_FAILED');
}
await sender.auth.stopAutoRefresh();
const path=mode.callback?'/auth/callback':'/reset-password';
address=mode.kind==='cached'?new URL('http://127.0.0.1:3000/auth/callback#type=invite&access_token='+access+'&refresh_token=synthetic-refresh'):new URL('http://127.0.0.1:3000'+path+(mode.kind==='ordinary'?'':mode.kind==='hash'?'#code=SYNTHETIC_CODE':'?code=SYNTHETIC_CODE'+(mode.callback?'&type=recovery':'')));
const receiver=mode.kind==='singleton'?sender:make();
const original=receiver.auth.exchangeCodeForSession.bind(receiver.auth);
receiver.auth.exchangeCodeForSession=(...args)=>{manual++;return original(...args)};
let bridge_completed=false,cached_error=false;
if(mode.kind==='cached'){
 cached_error=!!(await receiver.auth.initialize()).error;
 const callback=screen({callback:true,client:receiver,window,temporaryGetUser:async()=>({data:{user},error:null}),refreshSession:async()=>({data:{session:fixture,user},error:null})});
 await callback.mount();callback.runTimers();bridge_completed=callback.messages.routes[0]==='/reset-password';
 address=new URL('http://127.0.0.1:3000/reset-password');
}
const h=screen({callback:mode.callback,client:receiver,window});
await h.mount();h.runTimers();
const readback=await receiver.auth.getSession();
await receiver.auth.stopAutoRefresh();
console.log(JSON.stringify({form:!!h.form(),routes:h.messages.routes,manual,exchange,recover,denied,session:readback.data.session?.user?.id===uid,code_remaining:address.searchParams.has('code')||new URLSearchParams(address.hash.slice(1)).has('code'),raw_error_rendered:h.text().includes('PRIVATE_SYNTHETIC_CANARY'),bridge_completed,cached_error,network_calls:0}));
`

function run(mode){
 const env=Object.fromEntries(['PATH','SystemRoot','TEMP','TMP'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]))
 const result=spawnSync(process.execPath,['--input-type=module','-e',source,JSON.stringify(mode)],{cwd:fileURLToPath(new URL('../../',import.meta.url)),env,encoding:'utf8',timeout:10000,maxBuffer:65536,windowsHide:true})
 assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'')
 const observed=JSON.parse(result.stdout)
 assert.equal(observed.denied,0);assert.equal(observed.network_calls,0);assert.equal(observed.raw_error_rendered,false)
 return observed
}
test('causal installed SDK and both components: admitted fragment reaches reset despite an earlier cached initialization error',()=>{
 const value=run({callback:false,kind:'cached'})
 assert.equal(value.cached_error,true);assert.equal(value.bridge_completed,true)
 assert.equal(value.form,true);assert.equal(value.session,true);assert.equal(value.manual,0);assert.equal(value.exchange,0)
})

for(const callback of [false,true]){
 test('causal installed SDK: '+(callback?'callback':'reset')+' accepts the automatically exchanged PKCE code exactly once',()=>{
  const value=run({callback,kind:'positive'})
  assert.equal(callback?value.routes[0]==='/reset-password':value.form,true)
  assert.equal(value.manual,0);assert.equal(value.exchange,1);assert.equal(value.recover,1)
  assert.equal(value.code_remaining,false);assert.equal(value.session,true)
 })
 for(const kind of ['missing','failed','singleton','hash'])test('installed SDK: '+(callback?'callback':'reset')+' rejects '+kind+' code instead of adopting the stored session',()=>{
  const value=run({callback,kind})
  assert.equal(value.form,false);assert.deepEqual(value.routes,callback?['/login?error=callback']:[])
  assert.equal(value.manual,0);assert.equal(value.session,true,'failed link must preserve the prior session')
  assert.equal(value.exchange,['failed','hash'].includes(kind)?1:0)
 })
 test('installed SDK: '+(callback?'callback':'reset')+' keeps ordinary stored-session navigation without a code',()=>{
  const value=run({callback,kind:'ordinary'})
  assert.equal(callback?value.routes[0]==='/dashboard':value.form,true)
  assert.equal(value.manual,0);assert.equal(value.exchange,0);assert.equal(value.session,true)
 })
}
