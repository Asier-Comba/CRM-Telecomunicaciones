import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),ts=require('typescript')
const linkSession='00000000-0000-4000-8000-000000000062'
const token=(claims={})=>'e30.'+Buffer.from(JSON.stringify({sub:'synthetic-link-user',session_id:linkSession,exp:Math.floor(Date.now()/1000)+3600,...claims})).toString('base64url')+'.c3ludGhldGlj'
const originalAccess=token(),renewedAccess=token({iat:1})
const session=()=>({access_token:renewedAccess,refresh_token:'synthetic-renewed-refresh',user:{id:'synthetic-link-user'}})

// Actual component and event/effect bodies, with hook/JSX/SDK doubles only.
// A single AST observation changes the final void effect call to a returned promise
// so the test can await that effect. No auth branch, error or SDK call is rewritten.
// This is component-logic evidence, not React DOM/browser or hosted Auth evidence.
function screen(options={}){
 const source=readFileSync(new URL(options.callback?'../../src/app/auth/callback/page.tsx':'../../src/app/reset-password/page.tsx',import.meta.url),'utf8')
 let observations=0
 const observe=context=>{
  const visit=node=>{
   if(ts.isExpressionStatement(node)&&ts.isVoidExpression(node.expression)&&ts.isCallExpression(node.expression.expression)){
    observations++;return ts.factory.createReturnStatement(node.expression.expression)
   }
   return ts.visitEachChild(node,visit,context)
  }
  return node=>ts.visitNode(node,visit)
 }
 const compiled=ts.transpileModule(source,{fileName:'page.tsx',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},transformers:{before:[observe]}}).outputText
 assert.equal(observations,1,'effect observation must identify exactly one call')
 const states=[],effects=[],timers=[],messages={error:[],success:[],routes:[],storageRemovals:[],history:[],temporaryOptions:[]};let cursor=0,registered=false,updates=0,sessionReads=0,codeExchanges=0,sessionSets=0,userReads=0,temporaryReads=0,refreshes=0,temporaryStops=0
 const temporary={auth:{
  async getUser(access){temporaryReads++;return options.temporaryGetUser?options.temporaryGetUser(access):{data:{user:{id:'synthetic-link-user'}},error:null}},
  async refreshSession(input){refreshes++;assert.deepEqual(input,{refresh_token:'synthetic-refresh'});return options.refreshSession?options.refreshSession(input):{data:{session:session(),user:{id:'synthetic-link-user'}},error:null}},
  async stopAutoRefresh(){temporaryStops++;if(options.stopTemporary)await options.stopTemporary()},
 }}
 const client={auth:{
  async getSession(){sessionReads++;return options.getSession?options.getSession():{data:{session:{}},error:null}},
  async exchangeCodeForSession(code){codeExchanges++;return options.exchangeCodeForSession?options.exchangeCodeForSession(code):{error:null}},
  async setSession(input){sessionSets++;return options.setSession?options.setSession(input):{data:{session:{user:{id:'synthetic-link-user'}},user:{id:'synthetic-link-user'}},error:null}},
  async getUser(){userReads++;return options.getUser?options.getUser():{data:{user:{id:'synthetic-link-user'}},error:null}},
  async updateUser(input){updates++;return options.updateUser?options.updateUser(input):{error:null}}
 }}
 const hooks={useState(initial){const slot=cursor++;if(!(slot in states))states[slot]=initial;return[states[slot],value=>{states[slot]=typeof value==='function'?value(states[slot]):value}]},useRef(initial){const slot=cursor++;if(!(slot in states))states[slot]={current:initial};return states[slot]},useMemo:fn=>fn(),useEffect:fn=>{if(!registered)effects.push(fn)}}
 const Button=()=>null,jsx=(type,props)=>({type,props})
 const modules={
  react:hooks,'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{useRouter:()=>({replace:path=>messages.routes.push(path)})},
  'lucide-react':new Proxy({},{get:()=>()=>null}),sonner:{toast:{error:(...args)=>messages.error.push(args),success:(...args)=>messages.success.push(args)}},
  '@/components/Button':{Button},'@/lib/utils':{cn:()=>''},'@/lib/brand':{BRAND:{appName:'CRM'}},
  '@supabase/supabase-js':{createClient:(_url,_key,options)=>{messages.temporaryOptions.push(options);return temporary}},
  '@/lib/current-user':{DEMO_MODE_KEY:'synthetic-demo-mode'},
  '@/lib/supabase':{getSupabaseBrowserClient:()=>options.unconfigured?null:client}
 }
 const exports={}
 new Function('require','exports','window','setTimeout',compiled)(name=>{assert.ok(Object.hasOwn(modules,name),'unexpected import '+name);return modules[name]},exports,{location:{search:options.search??'',hash:options.hash??''},history:{replaceState:(_state,_title,path)=>messages.history.push(path)},localStorage:{removeItem:key=>messages.storageRemovals.push(key)}},(fn,ms)=>{timers.push({fn,ms});return timers.length})
 const render=()=>{cursor=0;const tree=exports.default();registered=true;return tree}
 const nodes=node=>Array.isArray(node)?node.flatMap(nodes):node&&typeof node==='object'&&node.props?[node,...nodes(node.props.children)]:[]
 const text=node=>Array.isArray(node)?node.map(text).join(' '):typeof node==='string'?node:node&&typeof node==='object'&&node.props?text(node.props.children):''
 const form=()=>nodes(render()).find(n=>n.type==='form')
 const button=()=>nodes(render()).find(n=>n.type===Button&&n.props.loading!==undefined)
 return {messages,form,button,timers,runTimers(){for(const timer of timers.splice(0))timer.fn()},text:()=>text(render()),counts:()=>({updates,sessionReads,codeExchanges,sessionSets,userReads,temporaryReads,refreshes,temporaryStops}),
  async mount(){render();for(const effect of effects)await effect()},
  async replayEffect(){for(const effect of effects)await effect()},
  fill(password='Synthetic-test-only-42',confirmation=password){const fields=nodes(render()).filter(n=>n.type==='input'&&n.props.type==='password');assert.equal(fields.length,2);fields[0].props.onChange({target:{value:password}});fields[1].props.onChange({target:{value:confirmation}})},
  submit(){assert.ok(form(),'password form must be visible');return form().props.onSubmit({preventDefault(){}})}
 }
}

for(const type of ['invite','recovery'])test('causal: complete '+type+' fragment is admitted and independently verified before reset, even when PKCE starts empty',async()=>{
 let admitted=false
 const h=screen({callback:true,hash:'#type='+type+'&access_token='+originalAccess+'&refresh_token=synthetic-refresh',setSession:async input=>{
  assert.deepEqual(h.messages.history,['/auth/callback'],'credentials must leave URL before any asynchronous admission')
  assert.deepEqual(input,{access_token:renewedAccess,refresh_token:'synthetic-renewed-refresh'});admitted=true
  return{data:{session:{user:{id:'synthetic-link-user'}},user:{id:'synthetic-link-user'}},error:null}
 },getSession:async()=>({data:{session:admitted?{user:{id:'synthetic-link-user'}}:null},error:null})})
 await h.mount();h.runTimers();assert.deepEqual(h.messages.routes,['/reset-password']);assert.equal(h.counts().sessionSets,1);assert.equal(h.counts().userReads,1);assert.equal(h.counts().updates,0)
 assert.deepEqual(h.messages.temporaryOptions,[{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}]);assert.equal(h.counts().temporaryReads,2);assert.equal(h.counts().refreshes,1)
 await h.replayEffect();h.runTimers();assert.equal(h.counts().sessionSets,1);assert.deepEqual(h.messages.routes,['/reset-password'])
})

const linkHash='#type=invite&access_token='+originalAccess+'&refresh_token=synthetic-refresh'
for(const options of [
 {hash:'#type=invite&access_token=synthetic-access'},
 {hash:'#type=invite&refresh_token=synthetic-refresh'},
 {hash:'#type=invite&access_token=&refresh_token=synthetic-refresh'},
 {hash:linkHash+'&access_token=duplicate'},
 {hash:linkHash+'&refresh_token=duplicate'},
 {hash:linkHash+'&type=invite'},
 {hash:linkHash,search:'?code=synthetic-code'},
 {hash:linkHash+'&code='},
 {hash:linkHash,search:'?type=recovery'},
 {hash:linkHash,search:'?type=invite&type=invite'},
 {hash:linkHash,search:'?access_token=query-token'},
 {search:'?type=invite&access_token=query-token&refresh_token=query-refresh'},
 {hash:linkHash.replace('type=invite','type=magiclink')},
 {hash:linkHash.replace('type=invite&','')},
])test('ambiguous or incomplete link credentials fail before session admission and never reuse an existing session',async()=>{
 const h=screen({callback:true,...options});await h.mount();h.runTimers()
 assert.deepEqual(h.messages.history,['/auth/callback']);assert.deepEqual(h.messages.routes,['/login?error=callback'])
 assert.equal(h.counts().sessionSets,0);assert.equal(h.counts().sessionReads,0);assert.equal(h.counts().userReads,0);assert.equal(h.counts().updates,0)
 assert.equal(JSON.stringify(h.messages).includes('synthetic-access'),false)
})
for(const setSession of [
 async()=>{throw Error('private-session-canary')},
 async()=>({data:{session:null,user:null},error:{message:'private-session-canary'}}),
 async()=>({data:{session:null,user:{id:'synthetic-link-user'}},error:null}),
 async()=>({data:{session:{user:{id:'synthetic-link-user'}},user:null},error:null}),
 async()=>({data:{session:{user:{id:'another-user'}},user:{id:'synthetic-link-user'}},error:null}),
])test('failed fragment admission stays closed without falling back to a previous session',async()=>{
 const h=screen({callback:true,hash:linkHash,setSession,getSession:async()=>({data:{session:null},error:null})});await h.mount();h.runTimers()
 assert.deepEqual(h.messages.routes,['/login?error=callback']);assert.equal(h.counts().sessionSets,1);assert.equal(h.counts().sessionReads,2);assert.equal(h.counts().userReads,0)
 assert.equal(h.messages.storageRemovals.length,0);assert.equal(h.text().includes('private-session-canary'),false)
})
for(const getUser of [
 async()=>{throw Error('private-identity-canary')},
 async()=>({data:{user:null},error:{message:'private-identity-canary'}}),
 async()=>({data:{user:null},error:null}),
 async()=>({data:{user:{id:'another-user'}},error:null}),
 async()=>({data:{user:{}},error:null}),
])test('server verification failure or identity mismatch blocks fragment continuation before post-admission session read',async()=>{
 const h=screen({callback:true,hash:linkHash,getUser,getSession:async()=>({data:{session:null},error:null})});await h.mount();h.runTimers()
 assert.deepEqual(h.messages.routes,['/login?error=callback']);assert.equal(h.counts().userReads,1);assert.equal(h.counts().sessionReads,2)
 assert.equal(h.messages.storageRemovals.length,0);assert.equal(h.text().includes('private-identity-canary'),false);assert.equal(h.counts().updates,0)
})
test('a stored session different from the independently verified link identity cannot reach reset',async()=>{
 let reads=0
 const h=screen({callback:true,hash:linkHash,getSession:async()=>({data:{session:++reads<3?null:{user:{id:'previous-user'}}},error:null})})
 await h.mount();h.runTimers();assert.deepEqual(h.messages.routes,['/login?error=callback']);assert.equal(h.counts().sessionReads,3);assert.equal(h.messages.storageRemovals.length,0)
})
test('effect replay during pending fragment admission cannot submit the same pair twice',async()=>{
 let finish,entered
 const began=new Promise(resolve=>{entered=resolve})
 const h=screen({callback:true,hash:linkHash,setSession:()=>new Promise(resolve=>{finish=resolve;entered()}),getSession:async()=>({data:{session:h.counts().sessionSets?{user:{id:'synthetic-link-user'}}:null},error:null})})
 const mounted=h.mount();await began;await h.replayEffect();assert.equal(h.counts().sessionSets,1);assert.equal(h.counts().sessionReads,2);assert.deepEqual(h.messages.history,['/auth/callback']);assert.equal(h.timers.length,0)
 finish({data:{session:{user:{id:'synthetic-link-user'}},user:{id:'synthetic-link-user'}},error:null});await mounted;h.runTimers();assert.deepEqual(h.messages.routes,['/reset-password'])
})

for(const getSession of [
 async()=>({data:{session:{user:{id:'previous-user'}}},error:null}),
 async()=>({data:{session:null},error:{message:'private-existing-session-canary'}}),
 async()=>{throw Error('private-existing-session-canary')},
])test('a previous session or unavailable prior-session check prevents any credential substitution',async()=>{
 const h=screen({callback:true,hash:linkHash,getSession});await h.mount();h.runTimers()
 assert.deepEqual(h.messages.routes,['/login?error=callback']);assert.equal(h.counts().sessionSets,0);assert.equal(h.counts().userReads,0);assert.equal(h.counts().sessionReads,1);assert.equal(h.messages.storageRemovals.length,0)
 assert.equal(h.text().includes('private-existing-session-canary'),false)
})

for(const temporaryGetUser of [
 async()=>{throw Error('private-temporary-canary')},
 async()=>({data:{user:null},error:{message:'private-temporary-canary'}}),
 async()=>({data:{user:null},error:null}),
 async()=>({data:{user:{id:'another-user'}},error:null}),
 async()=>({data:{user:{id:'synthetic-link-user',is_anonymous:true}},error:null}),
])test('unverified original access cannot rotate refresh or persist any session',async()=>{
 const h=screen({callback:true,hash:linkHash,temporaryGetUser,getSession:async()=>({data:{session:null},error:null})})
 await h.mount();h.runTimers();assert.deepEqual(h.messages.routes,['/login?error=callback']);assert.equal(h.counts().refreshes,0);assert.equal(h.counts().sessionSets,0);assert.equal(h.counts().temporaryStops,1);assert.equal(h.text().includes('private-temporary-canary'),false)
})
for(const access of [token({exp:0}),token({exp:'future'}),token({session_id:'invalid'}),token({sub:'another-user'}),'invalid'])test('expired or malformed original claims cannot be used as a refresh-only login',async()=>{
 const h=screen({callback:true,hash:linkHash.replace(originalAccess,access),getSession:async()=>({data:{session:null},error:null})})
 await h.mount();h.runTimers();assert.deepEqual(h.messages.routes,['/login?error=callback']);assert.equal(h.counts().refreshes,0);assert.equal(h.counts().sessionSets,0);assert.equal(h.counts().temporaryStops,1)
})
for(const refreshSession of [
 async()=>{throw Error('private-refresh-canary')},
 async()=>({data:{session:null,user:null},error:{message:'private-refresh-canary'}}),
 async()=>({data:{session:null,user:null},error:null}),
 async()=>({data:{session:session(),user:{id:'another-user'}},error:null}),
 async()=>({data:{session:{...session(),user:{id:'another-user'}},user:{id:'synthetic-link-user'}},error:null}),
 async()=>({data:{session:{...session(),refresh_token:''},user:{id:'synthetic-link-user'}},error:null}),
 async()=>({data:{session:{...session(),access_token:''},user:{id:'synthetic-link-user'}},error:null}),
 async()=>({data:{session:{...session(),access_token:token({session_id:'00000000-0000-4000-8000-000000000063'})},user:{id:'synthetic-link-user'}},error:null}),
 async()=>({data:{session:{...session(),access_token:token({exp:0})},user:{id:'synthetic-link-user'}},error:null}),
 async()=>({data:{session:{...session(),access_token:token({sub:'another-user'})},user:{id:'synthetic-link-user'}},error:null}),
])test('invalid refresh or mixed identity/session cannot persist a browser session',async()=>{
 const h=screen({callback:true,hash:linkHash,refreshSession,getSession:async()=>({data:{session:null},error:null})})
 await h.mount();h.runTimers();assert.deepEqual(h.messages.routes,['/login?error=callback']);assert.equal(h.counts().refreshes,1);assert.equal(h.counts().sessionSets,0);assert.equal(h.counts().temporaryStops,1);assert.equal(h.text().includes('private-refresh-canary'),false)
})
test('a failed authoritative check of the rotated access blocks persistence',async()=>{
 const h=screen({callback:true,hash:linkHash,temporaryGetUser:async access=>access===originalAccess?{data:{user:{id:'synthetic-link-user'}},error:null}:{data:{user:null},error:{message:'private-rotated-canary'}},getSession:async()=>({data:{session:null},error:null})})
 await h.mount();h.runTimers();assert.deepEqual(h.messages.routes,['/login?error=callback']);assert.equal(h.counts().temporaryReads,2);assert.equal(h.counts().sessionSets,0);assert.equal(h.counts().temporaryStops,1)
})
test('a login observed during temporary validation is preserved without replacement',async()=>{
 let reads=0
 const h=screen({callback:true,hash:linkHash,getSession:async()=>({data:{session:++reads===1?null:{user:{id:'intervening-user'}}},error:null})})
 await h.mount();h.runTimers();assert.deepEqual(h.messages.routes,['/login?error=callback']);assert.equal(h.counts().sessionSets,0);assert.equal(h.counts().temporaryStops,1);assert.equal(h.counts().userReads,0)
})
test('temporary-client cleanup failure cannot persist credentials',async()=>{
 const h=screen({callback:true,hash:linkHash,stopTemporary:async()=>{throw Error('private-cleanup-canary')},getSession:async()=>({data:{session:null},error:null})})
 await h.mount();h.runTimers();assert.deepEqual(h.messages.routes,['/login?error=callback']);assert.equal(h.counts().sessionSets,0);assert.equal(h.counts().temporaryStops,1);assert.equal(h.text().includes('private-cleanup-canary'),false)
})

test('causal: a rejected password update releases loading and allows an explicit retry',async()=>{
 let attempt=0
 const h=screen({updateUser:async()=>{if(++attempt===1)throw Error('private-provider-canary');return{error:null}}})
 await h.mount();h.fill();await h.submit().catch(()=>{})
 assert.equal(h.button().props.loading,false)
 assert.equal(h.messages.error.length,1)
 assert.equal(h.messages.routes.length,0);assert.equal(h.messages.success.length,0)
 assert.equal(JSON.stringify(h.messages).includes('private-provider-canary'),false)
 assert.equal(h.counts().updates,1,'no implicit retry after an uncertain response')
 await h.submit();assert.equal(h.counts().updates,2);assert.deepEqual(h.messages.routes,['/login?status=password-updated'])
})
test('causal: returned provider errors never become user-visible raw diagnostics',async()=>{
 const h=screen({updateUser:async()=>({error:{message:'private-provider-canary',code:'synthetic-error'}})})
 await h.mount();h.fill();await h.submit()
 assert.equal(h.messages.error.length,1);assert.equal(JSON.stringify(h.messages).includes('private-provider-canary'),false)
 assert.equal(h.button().props.loading,false);assert.equal(h.messages.routes.length,0)
})
for(const operation of ['getSession','exchangeCodeForSession'])test('causal: rejected '+operation+' ends checking and exposes only the inactive-link recovery state',async()=>{
 const h=screen({search:operation==='exchangeCodeForSession'?'?code=synthetic-code':'',[operation]:async()=>{throw Error('private-initialization-canary')}})
 await h.mount().catch(()=>{})
 assert.equal(h.text().includes('Verificando enlace seguro'),false)
 assert.equal(h.text().includes('Enlace no activo'),true);assert.equal(h.form(),undefined)
 assert.equal(h.text().includes('private-initialization-canary'),false);assert.equal(h.counts().updates,0)
})
test('successful setup submits exactly the entered value once and preserves the existing login redirect',async()=>{
 const inputs=[],h=screen({updateUser:async input=>{inputs.push(input);return{error:null}}})
 await h.mount();h.fill();await h.submit()
 assert.deepEqual(inputs,[{password:'Synthetic-test-only-42'}]);assert.equal(h.messages.success.length,1)
 assert.deepEqual(h.messages.routes,['/login?status=password-updated']);assert.equal(h.messages.error.length,0)
 assert.equal(h.button().props.loading,false)
})
test('existing local length and matching-password checks reject before any SDK update',async()=>{
 const h=screen();await h.mount()
 h.fill('short');await h.submit();h.fill('Synthetic-test-only-42','different');await h.submit()
 assert.equal(h.counts().updates,0);assert.equal(h.messages.error.length,2);assert.equal(h.messages.routes.length,0)
})
test('a pending update stays loading until its response, without an automatic second request',async()=>{
 let finish
 const h=screen({updateUser:()=>new Promise(resolve=>{finish=resolve})})
 await h.mount();h.fill();const request=h.submit()
 assert.equal(h.button().props.loading,true);assert.equal(h.counts().updates,1);assert.equal(h.messages.routes.length,0)
 finish({error:null});await request
 assert.equal(h.button().props.loading,false);assert.equal(h.counts().updates,1)
})
test('losing client configuration after setup leaves the form recoverable without a password request',async()=>{
 const options={},h=screen(options);await h.mount();h.fill();options.unconfigured=true
 await h.submit();assert.equal(h.button().props.loading,false);assert.equal(h.counts().updates,0)
 assert.equal(h.messages.error.length,1);assert.equal(h.messages.success.length,0);assert.equal(h.messages.routes.length,0)
})
for(const options of [{unconfigured:true},{getSession:async()=>({data:{session:null},error:null})},{getSession:async()=>({data:{session:{}},error:{message:'private-session-canary'}})},{hash:'#error=synthetic-error'}])test('inactive or unconfigured recovery remains closed',async()=>{
 const h=screen(options);await h.mount();assert.equal(h.form(),undefined);assert.equal(h.text().includes('Enlace no activo'),true)
 assert.equal(h.counts().updates,0);assert.equal(h.messages.routes.length,0);assert.equal(h.text().includes('private-session-canary'),false)
})

for(const operation of ['getSession','exchangeCodeForSession'])test('callback causal: rejected '+operation+' reaches safe login recovery instead of remaining pending',async()=>{
 const h=screen({callback:true,search:operation==='exchangeCodeForSession'?'?code=synthetic-code':'',[operation]:async()=>{throw Error('private-callback-canary')}})
 await h.mount().catch(()=>{})
 assert.equal(h.timers.length,1);assert.equal(h.timers[0].ms,900)
 assert.equal(h.text().includes('private-callback-canary'),false);assert.equal(h.messages.storageRemovals.length,0)
 h.runTimers();assert.deepEqual(h.messages.routes,['/login?error=callback']);assert.equal(h.counts().updates,0)
 assert.equal(h.counts()[operation==='getSession'?'sessionReads':'codeExchanges'],1,'no automatic exchange/recovery retry')
})
for(const type of ['invite','recovery'])test('callback '+type+' still sends an existing session to password setup, without changing it',async()=>{
 const h=screen({callback:true,search:'?type='+type});await h.mount()
 assert.deepEqual(h.messages.storageRemovals,['synthetic-demo-mode']);assert.equal(h.timers[0].ms,600)
 h.runTimers();assert.deepEqual(h.messages.routes,['/reset-password']);assert.equal(h.counts().updates,0)
})
test('ordinary callback session preserves its dashboard transition and performs no password mutation',async()=>{
 const h=screen({callback:true,search:'?code=synthetic-code'});await h.mount()
 assert.equal(h.counts().codeExchanges,1);assert.equal(h.counts().sessionReads,1);assert.equal(h.timers[0].ms,600)
 h.runTimers();assert.deepEqual(h.messages.routes,['/dashboard']);assert.equal(h.counts().updates,0)
})
for(const options of [{getSession:async()=>({data:{session:null},error:null})},{getSession:async()=>({data:{session:null},error:{message:'private-callback-canary'}})},{exchangeCodeForSession:async()=>({error:{message:'private-callback-canary'}}),search:'?code=synthetic-code'},{unconfigured:true},{hash:'#error_description=private-callback-canary'}])test('callback unavailable/invalid flows keep the existing safe login recovery',async()=>{
 const h=screen({callback:true,...options});await h.mount();assert.equal(h.timers.length,1);assert.equal(h.timers[0].ms,900)
 assert.equal(h.text().includes('private-callback-canary'),false);assert.equal(h.messages.storageRemovals.length,0)
 h.runTimers();assert.deepEqual(h.messages.routes,['/login?error=callback']);assert.equal(h.counts().updates,0)
})
