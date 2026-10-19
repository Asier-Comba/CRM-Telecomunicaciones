import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='70000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',ticket='80000000-0000-4000-8000-000000000001'
for(const stage of ['ticket_invalid','ticket_transport','binary_invalid','binary_transport','ticket_denied','binary_denied'] as const)for(const width of [390,768,1440])test(`document download ${stage} retains exact attempt at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),commands:{operation:string;input:{command_id:string;id:string;expected_version:number}}[]=[],binaries:unknown[]=[],issued=new Set<string>(),downloads:string[]=[],errors:string[]=[]
 let failed=false,cancelDisabled=false
 page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d.suggestedFilename()))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='document.list'){await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,items:[{id,version:1,status:'active',document_kind:'general',media_type:'application/pdf',size_bytes:100,target:{kind:'customer',id:customer}}],next_id:null}}});return}
  if(q.operation==='document.request_download'){
   commands.push(q)
   if(stage==='ticket_denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   issued.add(q.input.command_id)
   if(stage.startsWith('ticket')&&!failed){failed=true;if(stage==='ticket_transport'){await route.abort('failed');return}await route.fulfill({json:{ok:true,receipt:{unexpected:'invalid'}}});return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'document.content.v1',operation:q.operation,command_id:q.input.command_id,id,version:1,status:'active',expires_at:'2030-01-01T00:00:00Z',ticket_id:ticket}}});return
  }
  if(q.operation==='document.download'){
   binaries.push(q.input)
   if(stage==='binary_denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(stage.startsWith('binary')&&!failed){failed=true;if(stage==='binary_transport'){await route.abort('failed');return}await route.fulfill({contentType:'application/octet-stream',body:'INVALID_SYNTHETIC_CONTENT'});return}
   await route.fulfill({contentType:'application/pdf',body:Buffer.from('%PDF-1.4\n% Synthetic content\n%%EOF')});return
  }
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=documents-integrity')
  await page.getByRole('button',{name:'Descargar archivo privado',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Descargar archivo privado',exact:true})
  await dialog.getByRole('button',{name:'Confirmar',exact:true}).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  cancelDisabled=await dialog.getByRole('button',{name:'Cancelar',exact:true}).isDisabled()
  if(cancelDisabled){await page.keyboard.press('Escape');await expect(dialog).toBeVisible()}
  await page.screenshot({path:info.outputPath(`document-download-attempt-${stage}-${width}.png`)})
  if(stage.endsWith('denied')){
   expect(cancelDisabled).toBe(false);await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(dialog).toHaveCount(0);expect(downloads).toEqual([]);expect(commands).toHaveLength(1)
  }else{
   await dialog.getByRole('button',{name:/^(Confirmar|Reintentar misma descarga)$/}).click()
   await expect.poll(()=>downloads.length).toBe(1)
   expect(commands).toHaveLength(stage.startsWith('ticket')?2:1)
   if(commands.length===2)expect(commands[1]).toEqual(commands[0])
   expect(issued.size).toBe(1)
   if(stage.startsWith('binary'))expect(binaries[1]).toEqual(binaries[0])
   expect(cancelDisabled).toBe(true);await expect(dialog).toHaveCount(0)
  }
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.unrouteAll({behavior:'wait'});await writeFile(info.outputPath('observations.json'),JSON.stringify({stage,width,commands,binaries,issued:[...issued],downloads,errors,cancelDisabled},null,2));await page.close();await fixture.close()}
})
