import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),ts=require('typescript')
const linkSession='00000000-0000-4000-8000-000000000062'
const token=(claims={})=>'e30.'+Buffer.from(JSON.stringify({sub:'synthetic-link-user',session_id:linkSession,exp:Math.floor(Date.now()/1000)+3600,...claims})).toString('base64url')+'.c3ludGhldGlj'
const renewedAccess=token({iat:1})
const session=()=>({access_token:renewedAccess,refresh_token:'synthetic-renewed-refresh',user:{id:'synthetic-link-user'}})

// Actual component and event/effect bodies, with hook/JSX/SDK doubles only.
// A single AST observation changes the final void effect call to a returned promise
// so the test can await that effect. No auth branch, error or SDK call is rewritten.
// This is component-logic evidence, not React DOM/browser or hosted Auth evidence.
export function screen(options={}){
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
 const states=[],effects=[],timers=[],messages={error:[],success:[],routes:[],storageRemovals:[],history:[],temporaryOptions:[]};let cursor=0,registered=false,updates=0,sessionReads=0,codeExchanges=0,sessionSets=0,userReads=0,temporaryReads=0,refreshes=0,temporaryStops=0,initializations=0
 const temporary={auth:{
  async getUser(access){temporaryReads++;return options.temporaryGetUser?options.temporaryGetUser(access):{data:{user:{id:'synthetic-link-user'}},error:null}},
  async refreshSession(input){refreshes++;assert.deepEqual(input,{refresh_token:'synthetic-refresh'});return options.refreshSession?options.refreshSession(input):{data:{session:session(),user:{id:'synthetic-link-user'}},error:null}},
  async stopAutoRefresh(){temporaryStops++;if(options.stopTemporary)await options.stopTemporary()},
 }}
 const environment=options.window??{location:{search:options.search??'',hash:options.hash??''},history:{replaceState:(_state,_title,path)=>messages.history.push(path)},localStorage:{removeItem:key=>messages.storageRemovals.push(key)}}
 const client={auth:{
  async initialize(){initializations++;if(options.initialize)return options.initialize();const params=new URLSearchParams(environment.location.search);params.delete('code');environment.location.search=params.size?'?'+params.toString():'';return{error:null}},
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
  '@/lib/supabase':{getSupabaseBrowserClient:()=>options.unconfigured?null:(options.client??client)}
 }
 const exports={}
 new Function('require','exports','window','setTimeout',compiled)(name=>{assert.ok(Object.hasOwn(modules,name),'unexpected import '+name);return modules[name]},exports,environment,(fn,ms)=>{timers.push({fn,ms});return timers.length})
 const render=()=>{cursor=0;const tree=exports.default();registered=true;return tree}
 const nodes=node=>Array.isArray(node)?node.flatMap(nodes):node&&typeof node==='object'&&node.props?[node,...nodes(node.props.children)]:[]
 const text=node=>Array.isArray(node)?node.map(text).join(' '):typeof node==='string'?node:node&&typeof node==='object'&&node.props?text(node.props.children):''
 const form=()=>nodes(render()).find(n=>n.type==='form')
 const button=()=>nodes(render()).find(n=>n.type===Button&&n.props.loading!==undefined)
 return {messages,form,button,timers,runTimers(){for(const timer of timers.splice(0))timer.fn()},text:()=>text(render()),counts:()=>({updates,sessionReads,codeExchanges,sessionSets,userReads,temporaryReads,refreshes,temporaryStops,initializations}),
  async mount(){render();for(const effect of effects)await effect()},
  async replayEffect(){for(const effect of effects)await effect()},
  fill(password='Synthetic-test-only-42',confirmation=password){const fields=nodes(render()).filter(n=>n.type==='input'&&n.props.type==='password');assert.equal(fields.length,2);fields[0].props.onChange({target:{value:password}});fields[1].props.onChange({target:{value:confirmation}})},
  submit(){assert.ok(form(),'password form must be visible');return form().props.onSubmit({preventDefault(){}})}
 }
}

