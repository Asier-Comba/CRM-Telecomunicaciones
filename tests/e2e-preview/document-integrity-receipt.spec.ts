import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='70000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',ticket='80000000-0000-4000-8000-000000000001'
const scenarios=[...(['download','verify'] as const).flatMap(stage=>(['invalid','transport','denied'] as const).map(mode=>({stage,mode}))),{stage:'verify' as const,mode:'confirmed_read_failed' as const}]
for(const {stage,mode} of scenarios)for(const width of [390,768,1440])test(`document integrity ${stage} ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),commands:{operation:string;input:{command_id:string;id:string;expected_version:number;ticket_id?:string}}[]=[],tickets=new Set<string>(),verified=new Set<string>(),errors:string[]=[]
 let version=1,failed=false,readFailed=false
 let release:()=>void=()=>{};const held=new Promise<void>(resolve=>{release=resolve})
 const record=()=>({id,version,status:'active',document_kind:'general',media_type:'application/pdf',size_bytes:100,target:{kind:'customer',id:customer}})
 const target=stage==='download'?'document.request_download':'document.verify_content'
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='document.list'){await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,items:[record()],next_id:null}}});return}
  if(q.operation==='document.get_metadata'){
   if(mode==='confirmed_read_failed'&&verified.size&&!readFailed){readFailed=true;await route.fulfill({status:503,json:{ok:false,error:'internal_safe'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,record:record()}}});return
  }
  if(!['document.request_download','document.verify_content'].includes(q.operation)){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  commands.push(q)
  if(q.operation===target&&commands.filter(c=>c.operation===target).length===1)await held
  if(q.operation===target&&mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='document.request_download')tickets.add(q.input.command_id)
  else if(!verified.has(q.input.command_id)){
   if(q.input.expected_version!==version){await route.fulfill({status:409,json:{ok:false,error:'conflict'}});return}
   verified.add(q.input.command_id);version++
  }
  const receipt=q.operation==='document.request_download'?{contract_version:'document.content.v1',operation:q.operation,command_id:q.input.command_id,id,version:q.input.expected_version,status:'active',expires_at:'2026-10-14T23:59:59Z',ticket_id:ticket}:{contract_version:'document.integrity.v1',operation:q.operation,command_id:q.input.command_id,id,version:q.input.expected_version+1,status:'active',integrity:'verified_sha256',scan_status:'not_scanned'}
  if(q.operation===target&&!failed&&['invalid','transport'].includes(mode)){
   failed=true;if(mode==='transport'){await route.abort('failed');return}
   await route.fulfill(width===390?{status:200,contentType:'application/json',body:'{'}:width===768?{json:{ok:true,receipt:{...receipt,command_id:'90000000-0000-4000-8000-000000000009'}}}:{json:{ok:true,receipt,extra:'invalid-envelope'}});return
  }
  await route.fulfill({json:{ok:true,receipt}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=documents-integrity')
  await page.locator(`[data-document-id="${id}"]`).getByRole('button',{name:'Ver metadatos',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Metadatos del documento',exact:true})
  await dialog.getByRole('button',{name:'Verificar integridad privada',exact:true}).click()
  await expect.poll(()=>commands.filter(c=>c.operation===target).length).toBe(1)
  const close=dialog.getByRole('button',{name:'Cerrar panel',exact:true})
  await expect(close).toBeDisabled();await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
  if(width>390){await page.mouse.click(5,900);await expect(dialog).toBeVisible()}
  release();await expect(dialog.getByRole('alert')).toBeVisible()
  if(mode==='denied'){
   await expect(dialog.getByRole('alert')).toHaveText('No tienes permiso para esta acción.')
   await expect(dialog.getByRole('button',{name:'Verificar integridad privada',exact:true})).toBeEnabled()
   expect(verified.size).toBe(0);expect(tickets.size).toBe(stage==='download'?0:1)
   expect(commands).toHaveLength(stage==='download'?1:2);await expect(close).toBeEnabled();await close.click();await expect(dialog).toHaveCount(0);expect(errors).toEqual([]);return
  }
  await expect(close).toBeDisabled();await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
  if(width>390){await page.mouse.click(5,900);await expect(dialog).toBeVisible()}
  const retry=dialog.getByRole('button',{name:'Reintentar comprobación exacta',exact:true})
  await expect(retry).toBeEnabled();await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1})
  await page.screenshot({path:info.outputPath(`document-integrity-${stage}-${mode}-${width}.png`)})
  await retry.click();await expect(dialog.getByRole('status')).toContainText('Integridad SHA-256 registrada · Versión 2 · Sin escanear')
  expect(tickets.size).toBe(1);expect(verified.size).toBe(1)
  const targetRequests=commands.filter(q=>q.operation===target)
  expect(targetRequests).toHaveLength(mode==='confirmed_read_failed'?1:2)
  if(targetRequests.length===2)expect(targetRequests[1]).toEqual(targetRequests[0])
  expect(commands).toHaveLength(mode==='confirmed_read_failed'?2:3)
  await expect(dialog.getByRole('button',{name:'Verificar integridad privada',exact:true})).toBeDisabled()
  await expect(close).toBeEnabled();await close.click();await expect(dialog).toHaveCount(0)
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{release();await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
