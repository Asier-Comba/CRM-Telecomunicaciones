import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),ts=require('typescript')

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
 const states=[],effects=[],timers=[],messages={error:[],success:[],routes:[],storageRemovals:[]};let cursor=0,registered=false,updates=0,sessionReads=0,codeExchanges=0
 const client={auth:{
  async getSession(){sessionReads++;return options.getSession?options.getSession():{data:{session:{}},error:null}},
  async exchangeCodeForSession(code){codeExchanges++;return options.exchangeCodeForSession?options.exchangeCodeForSession(code):{error:null}},
  async updateUser(input){updates++;return options.updateUser?options.updateUser(input):{error:null}}
 }}
 const hooks={useState(initial){const slot=cursor++;if(!(slot in states))states[slot]=initial;return[states[slot],value=>{states[slot]=typeof value==='function'?value(states[slot]):value}]},useMemo:fn=>fn(),useEffect:fn=>{if(!registered)effects.push(fn)}}
 const Button=()=>null,jsx=(type,props)=>({type,props})
 const modules={
  react:hooks,'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{useRouter:()=>({replace:path=>messages.routes.push(path)})},
  'lucide-react':new Proxy({},{get:()=>()=>null}),sonner:{toast:{error:(...args)=>messages.error.push(args),success:(...args)=>messages.success.push(args)}},
  '@/components/Button':{Button},'@/lib/utils':{cn:()=>''},'@/lib/brand':{BRAND:{appName:'CRM'}},
  '@/lib/current-user':{DEMO_MODE_KEY:'synthetic-demo-mode'},
  '@/lib/supabase':{getSupabaseBrowserClient:()=>options.unconfigured?null:client}
 }
 const exports={}
 new Function('require','exports','window','setTimeout',compiled)(name=>{assert.ok(Object.hasOwn(modules,name),'unexpected import '+name);return modules[name]},exports,{location:{search:options.search??'',hash:options.hash??''},localStorage:{removeItem:key=>messages.storageRemovals.push(key)}},(fn,ms)=>{timers.push({fn,ms});return timers.length})
 const render=()=>{cursor=0;const tree=exports.default();registered=true;return tree}
 const nodes=node=>Array.isArray(node)?node.flatMap(nodes):node&&typeof node==='object'&&node.props?[node,...nodes(node.props.children)]:[]
 const text=node=>Array.isArray(node)?node.map(text).join(' '):typeof node==='string'?node:node&&typeof node==='object'&&node.props?text(node.props.children):''
 const form=()=>nodes(render()).find(n=>n.type==='form')
 const button=()=>nodes(render()).find(n=>n.type===Button&&n.props.loading!==undefined)
 return {messages,form,button,timers,runTimers(){for(const timer of timers.splice(0))timer.fn()},text:()=>text(render()),counts:()=>({updates,sessionReads,codeExchanges}),
  async mount(){render();for(const effect of effects)await effect()},
  fill(password='Synthetic-test-only-42',confirmation=password){const fields=nodes(render()).filter(n=>n.type==='input'&&n.props.type==='password');assert.equal(fields.length,2);fields[0].props.onChange({target:{value:password}});fields[1].props.onChange({target:{value:confirmation}})},
  submit(){assert.ok(form(),'password form must be visible');return form().props.onSubmit({preventDefault(){}})}
 }
}

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
