import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const first='70000000-0000-4000-8000-000000000001',second='70000000-0000-4000-8000-000000000002',customer='10000000-0000-4000-8000-000000000001',ticket='80000000-0000-4000-8000-000000000001'
for(const stage of ['download','verify','read'] as const)for(const scope of ['company','actor','reader'] as const)for(const width of [390,768,1440])test(`document integrity late ${stage} after ${scope} change at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),commands:{operation:string;input:Record<string,unknown>}[]=[],reads:string[]=[],errors:string[]=[]
 let version=1,held=false,release:()=>void=()=>{}
 const gate=new Promise<void>(resolve=>{release=resolve})
 const record=(id:string)=>({id,version:id===first?version:1,status:'active',document_kind:'general',media_type:id===first?'application/pdf':'image/png',size_bytes:100,target:{kind:'customer',id:customer}})
 const target=stage==='download'?'document.request_download':stage==='verify'?'document.verify_content':'document.get_metadata'
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='document.list'){await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,items:[record(first),record(second)],next_id:null}}});return}
  if(q.operation==='document.get_metadata'){
   reads.push(q.input.id)
   if(stage==='read'&&q.input.id===first&&version===2&&!held){held=true;await gate}
   await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,record:record(q.input.id)}}});return
  }
  if(!['document.request_download','document.verify_content'].includes(q.operation)){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  commands.push(q)
  if(q.operation==='document.verify_content')version=2
  if(q.operation===target&&!held){held=true;await gate}
  const receipt=q.operation==='document.request_download'?{contract_version:'document.content.v1',operation:q.operation,command_id:q.input.command_id,id:first,version:1,status:'active',expires_at:'2026-10-14T23:59:59Z',ticket_id:ticket}:{contract_version:'document.integrity.v1',operation:q.operation,command_id:q.input.command_id,id:first,version:2,status:'active',integrity:'verified_sha256',scan_status:'not_scanned'}
  await route.fulfill({json:{ok:true,receipt}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=documents-integrity-lifetime')
  await page.locator(`[data-document-id="${first}"]`).getByRole('button',{name:'Ver metadatos',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Metadatos del documento',exact:true})
  await dialog.getByRole('button',{name:'Verificar integridad privada',exact:true}).click();await expect.poll(()=>held).toBe(true)
  await expect(dialog.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled()
  const before={commands:commands.length,oldReads:reads.filter(id=>id===first).length}
  const change=page.getByRole('button',{name:scope==='company'?'Cambiar empresa sintética':scope==='actor'?'Cambiar actor sintético':'Cambiar a lector sintético',exact:true})
  // Simulate an external authorization/context change while the modal is open.
  await change.evaluate((button:HTMLButtonElement)=>button.click());await expect(dialog).toHaveCount(0)
  if(scope==='reader'){
   await expect(page.getByText('Documentos disponibles para administradores del espacio.',{exact:true})).toBeVisible()
   await change.evaluate((button:HTMLButtonElement)=>button.click())
  }
  await page.locator(`[data-document-id="${second}"]`).getByRole('button',{name:'Ver metadatos',exact:true}).click()
  await expect(dialog.getByText('image/png',{exact:true})).toBeVisible()
  const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation===target&&r.request().postDataJSON()?.input.id===first)
  release();await (await response).finished()
  // Controlled routes have no background traffic. Await quiescence to observe
  // any continuation from the retired panel, rather than checking too early.
  await page.waitForLoadState('networkidle')
  expect(commands).toHaveLength(before.commands);expect(reads.filter(id=>id===first)).toHaveLength(before.oldReads)
  await expect(dialog.getByText('image/png',{exact:true})).toBeVisible();await expect(dialog.getByText('application/pdf',{exact:true})).toHaveCount(0)
  await expect(dialog.getByRole('button',{name:'Cerrar panel',exact:true})).toBeEnabled();expect(errors).toEqual([])
  await page.screenshot({path:info.outputPath(`document-integrity-late-${stage}-${scope}-${width}.png`)})
 }finally{
  release();await page.unrouteAll({behavior:'wait'})
  await writeFile(info.outputPath('observations.json'),JSON.stringify({stage,scope,width,held,commands,reads,errors},null,2))
  await page.close();await fixture.close()
 }
})
