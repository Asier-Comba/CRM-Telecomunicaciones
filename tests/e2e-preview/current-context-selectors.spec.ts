import {createServer,type ServerResponse} from 'node:http'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname,join} from 'node:path'
import ts from 'typescript'
import {expect,test} from '@playwright/test'

// Read-only probe of the actual source. Synthetic HTTP bytes/presentation;
// no Auth, RLS or business-command acceptance.
const require=createRequire(join(process.cwd(),'package.json'))
function assets(){
 const result=new Map<string,string>()
 const cjs=(name:string,file:string,imports:Record<string,string>={})=>{
  const entries=Object.entries(imports),root=dirname(require.resolve(name+'/package.json'))
  return entries.map(([,url],i)=>`import dep${i} from '${url}';`).join('\n')+`\nconst deps={${entries.map(([key],i)=>`${JSON.stringify(key)}:dep${i}`).join(',')}};const exports={};function require(name){if(!Object.hasOwn(deps,name))throw Error('UNMAPPED_DEPENDENCY');return deps[name]}\n`+readFileSync(join(root,'cjs',file),'utf8')+'\nexport default exports;\n'
 }
 result.set('/react.js',cjs('react','react.production.js')+'export const {useCallback,useEffect,useRef,useState,createContext,useContext}=exports;')
 result.set('/scheduler.js',cjs('scheduler','scheduler.production.js'))
 result.set('/react-dom.js',cjs('react-dom','react-dom.production.js',{react:'/react.js'}))
 result.set('/client.js',cjs('react-dom','react-dom-client.production.js',{react:'/react.js','react-dom':'/react-dom.js',scheduler:'/scheduler.js'})+'export const {createRoot}=exports;')
 result.set('/jsx.js',cjs('react','react-jsx-runtime.production.js')+'export const {jsx,jsxs,Fragment}=exports;')
 const compile=(source:string)=>{const r=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});if(r.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('SOURCE_SYNTAX_ERROR');return r.outputText}
 for(const name of ['CustomerSelect','AssigneeSelect'])result.set('/'+name+'.js',compile(readFileSync('src/features/product/integration/'+name+'.tsx','utf8')).replace(/from (["'])([^"']+)\1/g,(_,q,path)=>`from ${q}${path==='react'?'/react.js':path==='react/jsx-runtime'?'/jsx.js':'/adapter.js'}${q}`))
 const repository=ts.createSourceFile('repository.ts',readFileSync('src/features/product/integration/repository.ts','utf8'),ts.ScriptTarget.Latest,true)
 const errors=repository.statements.filter(node=>ts.isClassDeclaration(node)&&node.name?.text==='ProductUiError'||ts.isFunctionDeclaration(node)&&node.name?.text==='safeMessage'||ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(repository)==='errorText')).map(node=>node.getText(repository)).join('\n')
 result.set('/adapter.js',`import React from '/react.js';const context=React.createContext(null);export const Context=context,useProduct=()=>React.useContext(context),control='',primary='';export const Drawer=({title,children,onClose})=>React.createElement('section',{'data-fixture-drawer':true},React.createElement('h2',null,title),React.createElement('button',{onClick:onClose},'Cerrar ficha'),children);export default function Image({src,alt,onError}){return React.createElement('img',{src,alt,onError})};`+compile(errors))
 result.set('/entry.js',"import React from '/react.js';import{createRoot}from'/client.js';import{Context}from'/adapter.js';import{CustomerSelect}from'/CustomerSelect.js';import{AssigneeSelect}from'/AssigneeSelect.js';window.probe={requests:0,settled:0,commands:0};const lookup=()=>{window.probe.requests++;return fetch('/lookup').then(r=>r.json()).finally(()=>window.probe.settled++)};const repository={search:lookup,collection:lookup};const root=createRoot(document.getElementById('app'));window.setScope=(workspaceId='space-a',actorId='actor-a',role='owner')=>root.render(React.createElement(Context.Provider,{value:{repository,role,actorId,workspaceId}},React.createElement(window.selectorKind==='customer'?CustomerSelect:AssigneeSelect,{value:'',onChange:()=>{}})));window.setScope();")
 return result
}

for(const kind of ['customer','assignee'] as const)for(const mode of ['visible_scope','pending_scope','control','visible_actor','pending_role'] as const){
 test(`scoped selector ${kind} ${mode}`,async({page})=>{
  const files=assets();let pending:ServerResponse|undefined;const errors:string[]=[]
  const server=createServer((request,response)=>{const url=request.url??'';if(files.has(url)){response.writeHead(200,{'Content-Type':'text/javascript'});response.end(files.get(url));return}if(url==='/lookup'){pending=response;return}response.writeHead(200,{'Content-Type':'text/html'});response.end('<meta name="viewport" content="width=device-width, initial-scale=1"><div id="app"></div><script>window.selectorKind='+JSON.stringify(kind)+'</script><script type="module" src="/entry.js"></script>')})
  const release=(response:ServerResponse)=>{response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify(kind==='customer'?{items:[{kind:'customer',id:'10000000-0000-4000-8000-000000000001',label:'Empresa sintética espacio A'}]}:{items:[{user_id:'20000000-0000-4000-8000-000000000001',display_name:'Responsable sintético espacio A'}],next_id:null}))}
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));page.on('pageerror',()=>errors.push('PAGE_ERROR'))
  try{
   const address=server.address();if(!address||typeof address==='string')throw Error('LOOPBACK_REQUIRED');await page.goto(`http://127.0.0.1:${address.port}`)
   if(kind==='customer')await page.getByRole('textbox',{name:'Buscar empresa para agenda',exact:true}).fill('Empresa')
   await expect.poll(()=>!!pending).toBe(true);const originalResponse=pending!
   if(mode==='pending_role')await page.evaluate(()=>(window as unknown as {setScope:(w:string,a:string,r:string)=>void}).setScope('space-a','actor-a','member'))
   if(mode==='pending_scope')await page.evaluate(()=>(window as unknown as {setScope:(w:string)=>void}).setScope('space-b'))
   release(originalResponse);await expect.poll(()=>page.evaluate(()=>(window as unknown as {probe:{settled:number}}).probe.settled)).toBe(1)
   const option=page.getByRole('option',{name:kind==='customer'?'Empresa sintética espacio A':'Responsable sintético espacio A',exact:true})
   if(mode!=='pending_scope'&&mode!=='pending_role')await expect(option).toHaveCount(1)
   if(mode==='visible_actor')await page.evaluate(()=>(window as unknown as {setScope:(w:string,a:string)=>void}).setScope('space-a','actor-b'))
   if(mode==='visible_scope')await page.evaluate(()=>(window as unknown as {setScope:(w:string)=>void}).setScope('space-b'))
   if(mode!=='control'){await expect(option).toHaveCount(0);if(kind==='customer')await expect(page.getByRole('textbox',{name:'Buscar empresa para agenda',exact:true})).toHaveValue('')}
   if(mode==='control')expect(await page.evaluate(()=>(window as unknown as {probe:{requests:number}}).probe.requests)).toBe(1)
   expect(await page.evaluate(()=>(window as unknown as {probe:{commands:number}}).probe.commands)).toBe(0);expect(errors).toEqual([])
  }finally{pending?.destroy();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
 })
}
