import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const first='70000000-0000-4000-8000-000000000001',second='70000000-0000-4000-8000-000000000002',customer='10000000-0000-4000-8000-000000000001',ticket='80000000-0000-4000-8000-000000000001'
const cases=[...(['ticket','binary'] as const).flatMap(stage=>(['company','actor','reader'] as const).map(scope=>({stage,scope}))),{stage:'current' as const,scope:'same' as const},{stage:'denied' as const,scope:'same' as const},{stage:'binary_denied' as const,scope:'same' as const}]
for(const {stage,scope} of cases)for(const width of [390,768,1440])test(`document download late ${stage} after ${scope} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),commands:{operation:string;input:Record<string,unknown>}[]=[],binaries:{id:string;ticket_id:string}[]=[],downloads:string[]=[],errors:string[]=[]
 let changed=false,held=false,release:()=>void=()=>{}
 const gate=new Promise<void>(resolve=>{release=resolve}),retired=scope!=='same'
 const record=(id:string)=>({id,version:1,status:'active',document_kind:'general',media_type:'application/pdf',size_bytes:100,target:{kind:'customer',id:customer}})
 page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d.suggestedFilename()))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='document.list'){await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,items:[record(changed?second:first)],next_id:null}}});return}
  if(q.operation==='document.request_download'){
   commands.push(q);if(stage==='ticket'){held=true;await gate}
   if(stage==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'document.content.v1',operation:q.operation,command_id:q.input.command_id,id:q.input.id,version:1,status:'active',expires_at:'2030-01-01T00:00:00Z',ticket_id:ticket}}});return
  }
  if(q.operation==='document.download'){
   binaries.push(q.input);if(stage==='binary'){held=true;await gate}
   await route.fulfill(stage==='binary_denied'?{status:403,json:{ok:false,error:'access_denied'}}:{contentType:'application/pdf',body:Buffer.from('%PDF-1.4\n% Synthetic document only\n%%EOF')});return
  }
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=documents-integrity-lifetime')
  await page.locator(`[data-document-id="${first}"]`).getByRole('button',{name:'Descargar archivo privado',exact:true}).click()
  await page.getByRole('dialog',{name:'Descargar archivo privado',exact:true}).getByRole('button',{name:'Confirmar',exact:true}).click()
  if(retired){
   await expect.poll(()=>held).toBe(true);changed=true
   await page.getByRole('button',{name:scope==='company'?'Cambiar empresa sintética':scope==='actor'?'Cambiar actor sintético':'Cambiar a lector sintético',exact:true}).dispatchEvent('click')
   await expect(page.getByRole('dialog')).toHaveCount(0)
   if(scope==='reader')await expect(page.getByText('Documentos disponibles para administradores del espacio.',{exact:true})).toBeVisible()
   else await expect(page.locator(`[data-document-id="${second}"]`)).toBeVisible()
   const op=stage==='ticket'?'document.request_download':'document.download'
   const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation===op)
   release();await (await response).finished();await page.waitForLoadState('networkidle')
   expect(binaries).toHaveLength(stage==='ticket'?0:1);expect(downloads).toEqual([])
   await expect(page.getByRole('alert')).toHaveCount(0)
  }else if(stage==='denied'||stage==='binary_denied'){
   await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('No tienes permiso para esta acción.')
   expect(binaries).toHaveLength(stage==='binary_denied'?1:0);expect(downloads).toEqual([])
  }else{
   await expect.poll(()=>downloads.length).toBe(1);expect(downloads).toEqual(['document.pdf']);expect(binaries).toHaveLength(1)
   await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  expect(commands).toHaveLength(1);expect(commands[0].input).toMatchObject({id:first,expected_version:1})
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath(`document-download-${stage}-${scope}-${width}.png`)})
 }finally{release();await page.unrouteAll({behavior:'wait'});await writeFile(info.outputPath('observations.json'),JSON.stringify({stage,scope,width,commands,binaries,downloads,errors},null,2));await page.close();await fixture.close()}
})
