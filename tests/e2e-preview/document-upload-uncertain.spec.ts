import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='70000000-0000-4000-8000-000000000001'
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZAAAAABJRU5ErkJggg==','base64')
for(const width of [390,768,1440])for(const lostStep of ['prepare','upload','finalize'] as const)test(`document upload ${lostStep} retains uncertain step at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),commands:{operation:string;input:{command_id:string}}[]=[],uploads:Buffer[]=[],applied=new Set<string>(),errors:string[]=[]
 let preparations=0,finalizations=0,lost=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/document/v1/content/**',async route=>{
  if(route.request().url().includes('/upload?')){
   const body=route.request().postDataBuffer();if(!body)throw Error('UPLOAD_BYTES_MISSING');uploads.push(body)
   if(lostStep==='upload'&&!lost){lost=true;await route.abort('failed');return}
   await route.fulfill({json:{ok:true,data:{id,uploaded:true,finalized:false}}});return
  }
  const q=route.request().postDataJSON();commands.push(q)
  if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);if(q.operation==='document.request_upload')preparations++;else if(q.operation==='document.finalize_upload')finalizations++;else throw Error('UNEXPECTED_DOCUMENT_COMMAND')}
  if(!lost&&(lostStep==='prepare'&&q.operation==='document.request_upload'||lostStep==='finalize'&&q.operation==='document.finalize_upload')){lost=true;await route.abort('failed');return}
  await route.fulfill({json:{ok:true,receipt:{contract_version:'document.content.v1',command_id:q.input.command_id,operation:q.operation,id,version:q.operation==='document.request_upload'?1:2,status:q.operation==='document.request_upload'?'pending':'active',...(q.operation==='document.request_upload'?{expires_at:new Date(Date.now()+600000).toISOString()}:{})}}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=upload')
  const dialog=page.getByRole('dialog',{name:'Subir documento local',exact:true})
  await dialog.getByLabel('Archivo de prueba').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:bytes})
  for(const[step,label]of [['prepare','Preparar subida'],['upload','Subir archivo pendiente'],['finalize','Confirmar finalización']]){
   await dialog.getByRole('button',{name:label,exact:true}).click()
   if(step===lostStep){
    await expect(dialog.getByRole('alert')).toContainText('No se pudo confirmar el resultado.')
    await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).evaluate((b:HTMLButtonElement)=>b.click());await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled()
    await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Archivo de prueba')).toBeDisabled()
    const retry=dialog.getByRole('button',{name:'Reintentar el mismo paso',exact:true});await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1})
    await page.screenshot({path:info.outputPath(`document-upload-${lostStep}-${width}.png`)});await retry.click()
   }
  }
  await expect(dialog.getByText('Documento finalizado y disponible.',{exact:true})).toBeVisible();await expect(page.getByText('Documento sintético confirmado',{exact:true})).toBeVisible()
  expect(preparations).toBe(1);expect(finalizations).toBe(1);expect(uploads).toHaveLength(lostStep==='upload'?2:1);for(const uploaded of uploads)expect(uploaded.equals(bytes)).toBe(true)
  const stepCommands=commands.filter(q=>q.operation===(lostStep==='prepare'?'document.request_upload':'document.finalize_upload'))
  if(lostStep!=='upload'){expect(stepCommands).toHaveLength(2);expect(stepCommands[1]).toEqual(stepCommands[0])}else expect(commands).toHaveLength(2)
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)
 }finally{await page.close();await fixture.close()}
})
