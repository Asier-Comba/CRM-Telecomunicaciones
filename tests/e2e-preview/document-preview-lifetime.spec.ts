import {createServer,type ServerResponse} from 'node:http'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname,join} from 'node:path'
import ts from 'typescript'
import {expect,test} from '@playwright/test'

// Actual component and production React over loopback. Synthetic bytes/presentation;
// no Auth, Storage, native Next Image or privileged-command acceptance.
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
 result.set('/preview.js',compile(readFileSync('src/features/documents/DocumentImagePreview.tsx','utf8')).replace(/from (["'])([^"']+)\1/g,(_,q,name)=>`from ${q}${name==='react'?'/react.js':name==='react/jsx-runtime'?'/jsx.js':'/adapter.js'}${q}`))
 const repository=ts.createSourceFile('repository.ts',readFileSync('src/features/product/integration/repository.ts','utf8'),ts.ScriptTarget.Latest,true)
 const errors=repository.statements.filter(node=>ts.isClassDeclaration(node)&&node.name?.text==='ProductUiError'||ts.isFunctionDeclaration(node)&&node.name?.text==='safeMessage'||ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(repository)==='errorText')).map(node=>node.getText(repository)).join('\n')
 result.set('/adapter.js',`import React from '/react.js';const context=React.createContext(null);export const Context=context,useProduct=()=>React.useContext(context),control='',primary='';export const Drawer=({title,children,onClose})=>React.createElement('section',{'data-fixture-drawer':true},React.createElement('h2',null,title),React.createElement('button',{onClick:onClose},'Cerrar ficha'),children);export default function Image({src,alt,onError}){return React.createElement('img',{src,alt,onError})};`+compile(errors))
 result.set('/entry.js',`import React from '/react.js';import{createRoot}from'/client.js';import{Context,ProductUiError}from'/adapter.js';import{DocumentImagePreview}from'/preview.js';window.probe={created:[],revoked:[],settled:0,ticketsSettled:0,commands:0,downloads:0,inputs:[]};const make=URL.createObjectURL.bind(URL),drop=URL.revokeObjectURL.bind(URL);URL.createObjectURL=blob=>{const url=make(blob);window.probe.created.push(url);return url};URL.revokeObjectURL=url=>{window.probe.revoked.push(url);drop(url)};const repository={contentCommand:(_operation,input)=>{window.probe.commands++;window.probe.inputs.push(input);return fetch('/ticket').then(r=>{if(!r.ok)throw new ProductUiError('transport_uncertain');return r.json()}).finally(()=>window.probe.ticketsSettled++)},downloadDocument:()=>{window.probe.downloads++;return fetch('/bytes').then(r=>{if(!r.ok)throw new ProductUiError('transport_uncertain');return r.blob()}).finally(()=>window.probe.settled++)}};const root=createRoot(document.getElementById('app'));window.unmount=()=>root.unmount();window.setScope=(actorId='actor-a',workspaceId='space-a')=>root.render(React.createElement(Context.Provider,{value:{repository,role:'owner',actorId,workspaceId}},React.createElement(DocumentImagePreview,{document:{id:'10000000-0000-4000-8000-000000000001',version:1,status:'active',document_kind:'general',media_type:'image/png',size_bytes:68},onClose:()=>root.render(null)})));window.setScope();`)
 return result
}
for(const mode of ['late_unmount','late_workspace','visible_workspace','control_close','late_ticket','command_uncertain','download_uncertain','reload_revoke'] as const){
 test(`private image lifetime ${mode}`,async({page})=>{
  const files=assets();let pending:ServerResponse|undefined,ticket:ServerResponse|undefined,ticketRequests=0;const errors:string[]=[]
  const server=createServer((request,response)=>{const url=request.url??'';if(files.has(url)){response.writeHead(200,{'Content-Type':'text/javascript'});response.end(files.get(url));return}if(url==='/ticket'){ticketRequests++;if(mode==='late_ticket'){ticket=response;return}response.writeHead(mode==='command_uncertain'&&ticketRequests===1?503:200,{'Content-Type':'application/json'});response.end(JSON.stringify({ticket_id:'synthetic-ticket'}));return}if(url==='/bytes'){pending=response;return}response.writeHead(200,{'Content-Type':'text/html'});response.end('<meta name="viewport" content="width=device-width, initial-scale=1"><div id="app"></div><script type="module" src="/entry.js"></script>')})
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));page.on('pageerror',()=>errors.push('PAGE_ERROR'))
  try{
   const address=server.address();if(!address||typeof address==='string')throw Error('LOOPBACK_REQUIRED');await page.goto(`http://127.0.0.1:${address.port}`)
   await page.getByRole('button',{name:'Mostrar imagen autorizada',exact:true}).click()
   if(mode==='late_ticket'){
    await expect.poll(()=>!!ticket).toBe(true);await page.evaluate(()=>(window as unknown as {unmount:()=>void}).unmount())
    ticket!.writeHead(200,{'Content-Type':'application/json'});ticket!.end(JSON.stringify({ticket_id:'synthetic-ticket'}))
    await expect.poll(()=>page.evaluate(()=>(window as unknown as {probe:{ticketsSettled:number}}).probe.ticketsSettled)).toBe(1)
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
    expect(await page.evaluate(()=>(window as unknown as {probe:{downloads:number}}).probe.downloads)).toBe(0)
    expect(await page.evaluate(()=>(window as unknown as {probe:{created:string[]}}).probe.created.length)).toBe(0)
    expect(errors).toEqual([]);return
   }
   if(mode==='command_uncertain'){
    await expect(page.getByRole('button',{name:'Reintentar vista previa',exact:true})).toBeEnabled()
    await page.getByRole('button',{name:'Reintentar vista previa',exact:true}).click()
   }
   await expect.poll(()=>!!pending).toBe(true)
   if(mode==='download_uncertain'){
    pending!.writeHead(503);pending!.end();pending=undefined
    await expect(page.getByRole('button',{name:'Reintentar vista previa',exact:true})).toBeEnabled()
    await page.getByRole('button',{name:'Reintentar vista previa',exact:true}).click()
    await expect.poll(()=>!!pending).toBe(true)
   }
   if(mode==='late_unmount')await page.evaluate(()=>(window as unknown as {unmount:()=>void}).unmount())
   if(mode==='late_workspace')await page.evaluate(()=>(window as unknown as {setScope:(a:string,w:string)=>void}).setScope('actor-b','space-b'))
   pending!.writeHead(200,{'Content-Type':'image/png'});pending!.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA+YAAAAASUVORK5CYII=','base64'))
   await expect.poll(()=>page.evaluate(()=>(window as unknown as {probe:{settled:number}}).probe.settled)).toBe(mode==='download_uncertain'?2:1)
   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
   if(mode==='command_uncertain'||mode==='download_uncertain'||mode==='reload_revoke'){
    await expect(page.getByRole('img',{name:'Vista previa del documento'})).toBeVisible()
    if(mode==='reload_revoke'){
     pending=undefined;await page.getByRole('button',{name:'Consultar imagen de nuevo',exact:true}).click()
     await expect.poll(()=>!!pending).toBe(true)
     expect(await page.evaluate(()=>(window as unknown as {probe:{revoked:string[]}}).probe.revoked.length)).toBe(1)
     pending!.writeHead(200,{'Content-Type':'image/png'});pending!.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA+YAAAAASUVORK5CYII=','base64'))
     await expect(page.getByRole('button',{name:'Consultar imagen de nuevo',exact:true})).toBeEnabled()
     await expect(page.getByRole('img',{name:'Vista previa del documento'})).toBeVisible()
    }
    const proof=await page.evaluate(()=>{const p=(window as unknown as {probe:{inputs:Array<{command_id:string,id:string,expected_version:number}>,commands:number,downloads:number}}).probe;return{commands:p.commands,downloads:p.downloads,firstFrozen:Object.isFrozen(p.inputs[0]),sameIntent:p.inputs.length===2&&p.inputs[0]===p.inputs[1],ids:p.inputs.map(v=>v.command_id),valid:p.inputs.every(v=>v.id==='10000000-0000-4000-8000-000000000001'&&v.expected_version===1)}})
    expect(proof.valid&&proof.firstFrozen).toBe(true)
    expect(proof.commands).toBe(mode==='download_uncertain'?1:2)
    expect(proof.downloads).toBe(mode==='command_uncertain'?1:2)
    if(mode==='command_uncertain'){expect(proof.sameIntent).toBe(true);expect(proof.ids[0]).toBe(proof.ids[1])}
    if(mode==='reload_revoke')expect(proof.ids[0]).not.toBe(proof.ids[1])
    await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click()
    await expect.poll(()=>page.evaluate(()=>(window as unknown as {probe:{revoked:string[]}}).probe.revoked.length)).toBe(mode==='reload_revoke'?2:1)
    expect(errors).toEqual([]);return
   }
   if(mode==='visible_workspace'||mode==='control_close'){
    await expect(page.getByRole('img',{name:'Vista previa del documento'})).toBeVisible()
    if(mode==='visible_workspace')await page.evaluate(()=>(window as unknown as {setScope:(a:string,w:string)=>void}).setScope('actor-b','space-b'))
    else await page.getByRole('button',{name:'Cerrar ficha',exact:true}).click()
    await expect(page.getByRole('img',{name:'Vista previa del documento'})).toHaveCount(0)
    await expect.poll(()=>page.evaluate(()=>(window as unknown as {probe:{revoked:string[]}}).probe.revoked.length)).toBe(1)
   }else await expect.poll(()=>page.evaluate(()=>(window as unknown as {probe:{created:string[]}}).probe.created.length)).toBe(0)
   expect(await page.evaluate(()=>(window as unknown as {probe:{commands:number,downloads:number}}).probe.commands)).toBe(1)
   expect(errors).toEqual([])
  }finally{for(const response of [pending,ticket])response?.destroy();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
 })
}
