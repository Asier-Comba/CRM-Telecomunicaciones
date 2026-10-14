import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='70000000-0000-4000-8000-000000000001'
for(const width of [390,768,1440])for(const lost of ['document.cleanup_claim','document.cleanup_finish'] as const)test(`cleanup ${lost} preserves exact uncertain intent at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),commands:{operation:string;input:{command_id:string;id:string;expected_version:number}}[]=[],applied=new Set<string>(),errors:string[]=[]
 let loss=false,claimed=false,finished=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/document/v1/maintenance',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='document.expired_list'){await route.fulfill({json:{ok:true,data:{contract_version:'document.cleanup.v1',operation:q.operation,items:claimed?[]:[{id,version:1}],next_id:null}}});return}
  commands.push(q)
  if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);if(q.operation==='document.cleanup_claim')claimed=true;else if(q.operation==='document.cleanup_finish')finished=true;else throw Error('UNEXPECTED_CLEANUP_COMMAND')}
  if(q.operation===lost&&!loss){loss=true;await route.abort('failed');return}
  await route.fulfill({json:{ok:true,receipt:{contract_version:'document.cleanup.v1',operation:q.operation,command_id:q.input.command_id,id,version:q.input.expected_version+1,status:q.operation==='document.cleanup_claim'?'pending':'archived'}}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=cleanup')
  const drawer=page.getByRole('dialog',{name:'Subidas caducadas',exact:true})
  for(const operation of ['document.cleanup_claim','document.cleanup_finish']){
   await drawer.getByRole('button',{name:operation==='document.cleanup_claim'?'Reservar subida caducada':'Finalizar limpieza de subida',exact:true}).click()
   const confirmation=page.getByRole('dialog',{name:operation==='document.cleanup_claim'?'Reservar subida caducada':'Eliminar archivo pendiente',exact:true})
   await confirmation.getByRole('button',{name:'Confirmar',exact:true}).click()
   if(operation===lost){
    await expect(confirmation.getByRole('alert')).toContainText('No se pudo confirmar el resultado.')
    await confirmation.getByRole('button',{name:'Cancelar',exact:true}).evaluate((b:HTMLButtonElement)=>b.click())
    await expect(confirmation).toBeVisible()
    await expect(confirmation.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled()
    await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).evaluate((b:HTMLButtonElement)=>b.click());await expect(drawer).toBeVisible();await expect(drawer.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled()
    await page.keyboard.press('Escape');await expect(confirmation).toBeVisible()
    const retry=confirmation.getByRole('button',{name:'Reintentar la misma operación',exact:true});await expect(retry).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath(`cleanup-${lost}-${width}.png`)});await retry.click()
   }
   await expect(confirmation).toHaveCount(0)
  }
  await expect(drawer.getByRole('status').filter({hasText:'Archivo pendiente eliminado; metadatos archivados y conservados.'})).toBeVisible()
  expect(applied.size).toBe(2);expect(claimed).toBe(true);expect(finished).toBe(true)
  const retries=commands.filter(q=>q.operation===lost);expect(retries).toHaveLength(2);expect(retries[1]).toEqual(retries[0]);expect(commands).toHaveLength(3)
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(drawer).toHaveCount(0)
 }finally{await page.close();await fixture.close()}
})
for(const width of [390,768,1440])test(`cleanup confirmed refusal permits dismissal without an effect at ${width}`,async({page})=>{
 const fixture=await startCustomerResourceFixture();let commands=0
 await page.route('**/api/document/v1/maintenance',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='document.expired_list')await route.fulfill({json:{ok:true,data:{contract_version:'document.cleanup.v1',operation:q.operation,items:[{id,version:1}],next_id:null}}})
  else{commands++;await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})}
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=cleanup')
  const drawer=page.getByRole('dialog',{name:'Subidas caducadas',exact:true})
  await drawer.getByRole('button',{name:'Reservar subida caducada',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Reservar subida caducada',exact:true})
  await dialog.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeEnabled();await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(dialog).toHaveCount(0)
  await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(drawer).toHaveCount(0);expect(commands).toBe(1)
 }finally{await page.close();await fixture.close()}
})
