import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname,join} from 'node:path'
import ts from 'typescript'
import {expect,test} from '@playwright/test'
import {currentPortfolioGateStage} from '../../scripts/security/supabase-local/product-portfolio-reference-read.mjs'

// Actual AuthGate, production React, SSR and hydration over loopback HTTP.
// In-memory identity results do not prove real Auth/DB or the original cause.
const require=createRequire(join(process.cwd(),'package.json'))
const source=readFileSync('src/components/AuthGate.tsx','utf8')
 .replaceAll('process.env.NODE_ENV',"'production'")
 .replaceAll('process.env.NEXT_PUBLIC_FORCE_OFFLINE_DEV',"'false'")
function fixtureAssets(){
 const assets=new Map<string,string>()
 const buildModule=(name:string,file:string,imports:Record<string,string>={})=>{
  const entries=Object.entries(imports),root=dirname(require.resolve(name+'/package.json'))
  return entries.map(([,url],i)=>`import dep${i} from '${url}';`).join('\n')+
   `\nconst deps={${entries.map(([key],i)=>`${JSON.stringify(key)}:dep${i}`).join(',')}};const exports={};function require(name){if(!Object.hasOwn(deps,name))throw Error('UNMAPPED_DEPENDENCY');return deps[name]}\n`+
   readFileSync(join(root,'cjs',file),'utf8')+'\nexport default exports;\n'
 }
 assets.set('/react.js',buildModule('react','react.production.js')+'export const {useEffect,useRef,useState,createElement}=exports;')
 assets.set('/scheduler.js',buildModule('scheduler','scheduler.production.js'))
 assets.set('/react-dom.js',buildModule('react-dom','react-dom.production.js',{react:'/react.js'}))
 assets.set('/client.js',buildModule('react-dom','react-dom-client.production.js',{react:'/react.js','react-dom':'/react-dom.js',scheduler:'/scheduler.js'})+'export const {hydrateRoot}=exports;')
 assets.set('/jsx.js',buildModule('react','react-jsx-runtime.production.js')+'export const {jsx,jsxs,Fragment}=exports;')
 let compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
 for(const [name,path] of Object.entries({react:'/react.js','react/jsx-runtime':'/jsx.js','next/navigation':'/adapter.js','lucide-react':'/adapter.js','@/lib/current-user':'/adapter.js','@/lib/supabase':'/adapter.js','@/lib/feature-flags':'/adapter.js'}))compiled=compiled.replaceAll(`from '${name}'`,`from '${path}'`).replaceAll(`from "${name}"`,`from "${path}"`)
 assets.set('/gate.js',compiled)
 assets.set('/adapter.js',`export const DEMO_MODE_KEY='synthetic-demo',featureFlags={demoData:false},Loader2=()=>null;const router={replace:path=>window.redirects.push(path)};export const useRouter=()=>router,usePathname=()=>'/portfolio';export const getSupabaseBrowserClient=()=>({auth:{getUser:()=>{window.reads++;return new Promise((resolve,reject)=>{window.resolveIdentity=()=>resolve({data:{user:{id:'synthetic-user'}},error:null});window.rejectIdentity=()=>reject(Error('synthetic private detail'))})}}});`)
 assets.set('/entry.js',`import React from '/react.js';import{hydrateRoot}from'/client.js';import{AuthGate}from'/gate.js';window.redirects=[];window.reads=0;window.rejections=0;addEventListener('unhandledrejection',event=>{event.preventDefault();window.rejections++});window.fixtureRoot=hydrateRoot(document.getElementById('app'),React.createElement(AuthGate,{integrated:true},React.createElement('p',null,'AUTHORIZED_SYNTHETIC_CONTENT')));`)
 const dependencies:Record<string,unknown>={react:require('react'),'react/jsx-runtime':require('react/jsx-runtime'),'next/navigation':{useRouter:()=>({replace:()=>{throw Error('SSR_NAVIGATION_FORBIDDEN')}}),usePathname:()=>'/portfolio'},'lucide-react':{Loader2:()=>null},'@/lib/current-user':{DEMO_MODE_KEY:'synthetic-demo'},'@/lib/feature-flags':{featureFlags:{demoData:false}},'@/lib/supabase':{getSupabaseBrowserClient:()=>{throw Error('SSR_CLIENT_FORBIDDEN')}}}
 const compiledServer=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
 const component={exports:{} as {AuthGate?:unknown}}
 new Function('require','module','exports',compiledServer)((name:string)=>{if(!Object.hasOwn(dependencies,name))throw Error('UNMAPPED_SSR_DEPENDENCY');return dependencies[name]},component,component.exports)
 const React=require('react'),server=require('react-dom/server')
 const html=server.renderToString(React.createElement(component.exports.AuthGate,{integrated:true},React.createElement('p',null,'AUTHORIZED_SYNTHETIC_CONTENT')))
 return{assets,html}
}
for(const completion of ['success','rejection','disposed'] as const){
 test(`current-document access stage distinguishes hydration and ${completion}`,async({page})=>{
  const {assets,html}=fixtureAssets(),errors:string[]=[]
  const server=createServer((request,response)=>{
   if(assets.has(request.url??'')){response.writeHead(200,{'Content-Type':'text/javascript'});response.end(assets.get(request.url??''));return}
   response.writeHead(200,{'Content-Type':'text/html'});response.end(`<div id="app">${html}</div><script>window.startGate=()=>import('/entry.js')</script>`)
  })
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  page.on('pageerror',()=>errors.push('PAGE_ERROR'))
  try{
   const address=server.address();if(!address||typeof address==='string')throw Error('LOOPBACK_ADDRESS_REQUIRED')
   const destination=`http://127.0.0.1:${address.port}/portfolio`
   await page.goto(destination)
   expect(await currentPortfolioGateStage(page,destination)).toBe('before_effect')
   await expect(page.getByText('AUTHORIZED_SYNTHETIC_CONTENT',{exact:true})).toHaveCount(0)
   await page.evaluate(()=> (window as unknown as {startGate:()=>Promise<void>}).startGate())
   await expect(page.locator('[data-crm-access-stage]')).toHaveAttribute('data-crm-access-stage','user_pending')
   expect(await currentPortfolioGateStage(page,destination)).toBe('user_pending')
   if(completion==='disposed')await page.evaluate(()=> (window as unknown as {fixtureRoot:{unmount:()=>void}}).fixtureRoot.unmount())
   await page.evaluate(mode=>{
    const fixture=window as unknown as {resolveIdentity:()=>void;rejectIdentity:()=>void}
    if(mode==='rejection')fixture.rejectIdentity();else fixture.resolveIdentity()
   },completion)
   if(completion==='success'){
    await expect(page.getByText('AUTHORIZED_SYNTHETIC_CONTENT',{exact:true})).toBeVisible()
    expect(await currentPortfolioGateStage(page,destination)).toBe('not_present')
   }else if(completion==='rejection'){
    await expect(page.locator('[data-crm-access-stage]')).toHaveAttribute('data-crm-access-stage','access_error')
    expect(await currentPortfolioGateStage(page,destination)).toBe('access_error')
   }else{
    await expect(page.locator('[data-crm-access-stage]')).toHaveCount(0)
    await expect(page.getByText('AUTHORIZED_SYNTHETIC_CONTENT',{exact:true})).toHaveCount(0)
   }
   expect(await page.evaluate(()=>{
    const fixture=window as unknown as {reads:number;redirects:string[];rejections:number}
    return{reads:fixture.reads,redirects:fixture.redirects,rejections:fixture.rejections}
   })).toEqual({reads:1,redirects:completion==='rejection'?['/login?error=access_check']:[],rejections:0})
   expect(errors).toEqual([])
   expect(await currentPortfolioGateStage(page,destination+'?different=1')).toBe('document_changed')
  }finally{
   server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))
  }
 })
}
