import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),ts=require('typescript')
const source=readFileSync(new URL('../../src/components/AuthGate.tsx',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
const flush=()=>new Promise(resolve=>setImmediate(resolve))
function mount({client,integrated=true,previouslyAllowed=false}){
 const effects=[],states=[],redirects=[],storage=[]
 const router={replace:path=>redirects.push(path)}
 const dependencies={react:{useEffect:effect=>effects.push(effect),useState:()=>[previouslyAllowed,value=>states.push(value)]},'react/jsx-runtime':{jsx:()=>null,jsxs:()=>null},'next/navigation':{useRouter:()=>router,usePathname:()=>'/portfolio'},'lucide-react':{Loader2:()=>null},'@/lib/current-user':{DEMO_MODE_KEY:'synthetic-demo'},'@/lib/supabase':{getSupabaseBrowserClient:()=>client},'@/lib/feature-flags':{featureFlags:{demoData:false}}}
 const fixtureModule={exports:{}}
 new Function('require','module','exports','process','window',compiled)(name=>{assert.ok(Object.hasOwn(dependencies,name));return dependencies[name]},fixtureModule,fixtureModule.exports,{env:{NODE_ENV:'production',NEXT_PUBLIC_FORCE_OFFLINE_DEV:'true'}},{localStorage:{getItem:()=>null,removeItem:key=>storage.push(key)}})
 fixtureModule.exports.AuthGate({children:'AUTHORIZED_SYNTHETIC_CONTENT',integrated})
 assert.equal(effects.length,1)
 return{states,redirects,storage,unmount:effects[0]()}
}
test('rejected integrated identity check clears prior allowance and redirects with a closed error, without retry or private detail',async()=>{
 let reads=0
 const gate=mount({previouslyAllowed:true,client:{auth:{getUser:async()=>{reads++;throw Error('synthetic private transport detail')}}}})
 await flush();assert.equal(reads,1);assert.deepEqual(gate.states,[false]);assert.deepEqual(gate.redirects,['/login?error=access_check']);assert.equal(JSON.stringify(gate).includes('private transport'),false)
})
test('identity rejection after disposal causes no state change or navigation',async()=>{
 let reject;const pending=new Promise((_resolve,rejectPromise)=>reject=rejectPromise)
 const gate=mount({client:{auth:{getUser:()=>pending}}});gate.unmount();reject(Error('synthetic disposed failure'))
 await flush();assert.deepEqual(gate.states,[]);assert.deepEqual(gate.redirects,[])
})
test('authenticated success still requires getUser and grants the current component once',async()=>{
 let reads=0
 const gate=mount({client:{auth:{getUser:async()=>{reads++;return{data:{user:{id:'synthetic-user'}},error:null}}}}})
 await flush();assert.equal(reads,1);assert.deepEqual(gate.states,[true]);assert.deepEqual(gate.redirects,[])
})
test('missing client, missing identity and rejected identity result never grant integrated content',async()=>{
 for(const client of [null,{auth:{getUser:async()=>({data:{user:null},error:null})}},{auth:{getUser:async()=>({data:{user:{id:'synthetic-user'}},error:{message:'synthetic denied'}})}}]){
  const gate=mount({client});await flush();assert.deepEqual(gate.states,[]);assert.deepEqual(gate.redirects,['/login'])
 }
})
test('production non-integrated session and profile exceptions fail closed without dev bypass or sign-out',async()=>{
 for(const client of [{auth:{getSession:async()=>{throw Error('synthetic session failure')}}},{auth:{getSession:async()=>({data:{session:{user:{id:'synthetic-user'}}},error:null})},from:()=>{throw Error('synthetic profile failure')}}]){
  const gate=mount({client,integrated:false,previouslyAllowed:true});await flush();assert.deepEqual(gate.states,[false]);assert.deepEqual(gate.redirects,['/login?error=access_check'])
 }
})
