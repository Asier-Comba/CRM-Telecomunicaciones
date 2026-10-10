import {createServer,type ServerResponse} from 'node:http'
import {existsSync,readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname,join} from 'node:path'
import ts from 'typescript'
import {expect,test} from '@playwright/test'

// Actual component + production React over loopback HTTP. Presentation and
// repository fixtures are synthetic; these tests do not prove Auth or Storage.
const require=createRequire(join(process.cwd(),'package.json'))
const first='10000000-0000-4000-8000-000000000001',second='10000000-0000-4000-8000-000000000002'
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
 const compile=(source:string)=>{
  const result=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}})
  if(result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('SOURCE_SYNTAX_ERROR')
  return result.outputText
 }
 let component=compile(readFileSync('src/features/documents/IntegratedDocuments.tsx','utf8'))
 component=component.replace(/from (["'])([^"']+)\1/g,(_,quote,name)=>`from ${quote}${name==='react'?'/react.js':name==='react/jsx-runtime'?'/jsx.js':name==='./useDocumentMetadataSelection'?'/selection.js':'/adapter.js'}${quote}`)
 result.set('/documents.js',component)
 if(existsSync('src/features/documents/useDocumentMetadataSelection.ts'))result.set('/selection.js',compile(readFileSync('src/features/documents/useDocumentMetadataSelection.ts','utf8')).replace(/from (["'])([^"']+)\1/g,(_,quote,name)=>`from ${quote}${name==='react'?'/react.js':'/adapter.js'}${quote}`))
 const repository=ts.createSourceFile('repository.ts',readFileSync('src/features/product/integration/repository.ts','utf8'),ts.ScriptTarget.Latest,true)
 const errors=repository.statements.filter(node=>ts.isClassDeclaration(node)&&node.name?.text==='ProductUiError'||ts.isFunctionDeclaration(node)&&node.name?.text==='safeMessage'||ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(repository)==='errorText')).map(node=>node.getText(repository)).join('\n')
 result.set('/adapter.js',`import React from '/react.js';const context=React.createContext(null);export const Context=context,useProduct=()=>React.useContext(context),control='',primary='';export const PageHeader=({title})=>React.createElement('h1',null,title),PreviewNotice=()=>null,Status=({value})=>React.createElement('span',null,value),Drawer=({title,children,onClose})=>React.createElement('section',{'data-fixture-drawer':true},React.createElement('h2',null,title),React.createElement('button',{onClick:onClose},'Cerrar ficha'),children);export const ConfirmDialog=()=>null,DocumentIntegrity=({onVerified})=>React.createElement('button',{onClick:()=>onVerified().then(()=>window.refreshOutcome='done',()=>window.refreshOutcome='refused')},'Actualizar metadatos verificados'),DocumentCleanup=()=>null,DocumentUpload=()=>null,DocumentImagePreview=()=>null;`+compile(errors))
 result.set('/entry.js',`import React from '/react.js';import{createRoot}from'/client.js';import{Context}from'/adapter.js';import{IntegratedDocuments}from'/documents.js';window.settled=0;const repository={mode:'integrated_local',documents:()=>fetch('/list').then(r=>r.json()),document:id=>fetch('/metadata/'+id).then(async r=>{if(!r.ok)throw Error('SYNTHETIC_PRIVATE_DETAIL');return r.json()}).finally(()=>window.settled++),search:()=>Promise.resolve({items:[{id:'20000000-0000-4000-8000-000000000001',kind:'customer',label:'Otra empresa'}]})};const root=createRoot(document.getElementById('app'));window.unmount=()=>root.unmount();window.setRole=role=>root.render(React.createElement(Context.Provider,{value:{repository,role,actorId:'synthetic-actor',workspaceId:'synthetic-workspace'}},React.createElement(IntegratedDocuments,{customerId:'30000000-0000-4000-8000-000000000001',contentEnabled:true,maintenanceEnabled:true})));window.setRole('owner');`)
 return result
}
for(const mode of ['latest_success','late_error','closed','target_changed','role_revoked','unmounted','refresh_success','refresh_failure'] as const){
 test(`document metadata keeps current selection on ${mode}`,async({page})=>{
  const files=assets(),pending=new Map<string,ServerResponse>(),reads:string[]=[],errors:string[]=[]
  const record=(id:string)=>({id,version:1,status:'active',document_kind:id===first?'general':'contract',media_type:id===first?'image/png':'application/pdf',size_bytes:id===first?111:222,target:{kind:'customer',id:'30000000-0000-4000-8000-000000000001'}})
  const respond=(id:string,status=200,changed=false)=>{const response=pending.get(id);if(!response)throw Error('REQUEST_NOT_OBSERVED');response.writeHead(status,{'Content-Type':'application/json'});response.end(JSON.stringify({contract_version:'document.v1',operation:'document.get_metadata',record:changed?{...record(id),version:2,media_type:'image/jpeg',size_bytes:333}:record(id)}));pending.delete(id)}
  const server=createServer((request,response)=>{
   const url=request.url??''
   if(files.has(url)){response.writeHead(200,{'Content-Type':'text/javascript'});response.end(files.get(url));return}
   if(url==='/list'){response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify({contract_version:'document.v1',operation:'document.list',items:[record(first),record(second)],next_id:null}));return}
   if(url.startsWith('/metadata/')){const id=url.slice('/metadata/'.length);reads.push(id);pending.set(id,response);return}
   response.writeHead(200,{'Content-Type':'text/html'});response.end('<meta name="viewport" content="width=device-width, initial-scale=1"><div id="app"></div><script type="module" src="/entry.js"></script>')
  })
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  page.on('pageerror',()=>errors.push('PAGE_ERROR'))
  try{
   const address=server.address();if(!address||typeof address==='string')throw Error('LOOPBACK_REQUIRED')
   await page.goto(`http://127.0.0.1:${address.port}`)
   await page.getByRole('button',{name:'Ver metadatos',exact:true}).nth(0).click()
   await expect.poll(()=>reads.length).toBe(1)
   if(mode==='refresh_success'||mode==='refresh_failure'){
    respond(first)
    await expect(page.locator('[data-fixture-drawer] dd').filter({hasText:'image/png'})).toBeVisible()
    await page.getByRole('button',{name:'Actualizar metadatos verificados',exact:true}).click()
    await expect.poll(()=>reads.length).toBe(2)
    respond(first,mode==='refresh_failure'?503:200,mode==='refresh_success')
    await expect.poll(()=>page.evaluate(()=>(window as unknown as {refreshOutcome:string}).refreshOutcome)).toBe(mode==='refresh_failure'?'refused':'done')
    await expect(page.locator('[data-fixture-drawer] dd').filter({hasText:mode==='refresh_failure'?'image/png':'image/jpeg'})).toBeVisible()
    expect(reads).toEqual([first,first]);expect(errors).toEqual([])
    return
   }
   if(mode==='unmounted'){
    await page.evaluate(()=>(window as unknown as {unmount:()=>void}).unmount())
   }else if(mode==='target_changed'){
    await page.getByRole('textbox',{name:'Buscar cliente para documentos'}).fill('Otra empresa')
    await page.getByRole('button',{name:'Buscar registro',exact:true}).click()
    await page.getByRole('button',{name:'Empresa · Otra empresa',exact:true}).click()
   }else if(mode==='role_revoked'){
    await page.evaluate(()=>(window as unknown as {setRole:(role:string)=>void}).setRole('viewer'))
    await expect(page.getByText('Documentos disponibles para administradores del espacio.')).toBeVisible()
   }else{
    await page.getByRole('button',{name:'Ver metadatos',exact:true}).nth(1).click()
    await expect.poll(()=>reads.length).toBe(2)
    respond(second)
    await expect(page.locator('[data-fixture-drawer] dd').filter({hasText:'application/pdf'})).toBeVisible()
    if(mode==='closed')await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click()
   }
   respond(first,mode==='late_error'?503:200)
   const count=mode==='target_changed'||mode==='role_revoked'||mode==='unmounted'?1:2
   await expect.poll(()=>page.evaluate(()=>(window as unknown as {settled:number}).settled)).toBe(count)
   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
   if(mode==='role_revoked'){
    await page.evaluate(()=>(window as unknown as {setRole:(role:string)=>void}).setRole('owner'))
    await expect(page.getByRole('button',{name:'Ver metadatos',exact:true})).toHaveCount(2)
   }
   if(mode==='closed'||mode==='target_changed'||mode==='role_revoked'||mode==='unmounted')await expect(page.locator('[data-fixture-drawer]')).toHaveCount(0)
   else{await expect(page.locator('[data-fixture-drawer] dd').filter({hasText:'application/pdf'})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0)}
   expect(reads).toEqual(count===1?[first]:[first,second])
   expect(errors).toEqual([])
  }finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
 })
}
