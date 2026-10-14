import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='70000000-0000-4000-8000-000000000001'
for(const width of [390,768,1440])test(`import cancellation keeps unknown result and exact command at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),commands:unknown[]=[],applied=new Set<string>();let status='uploaded',version=1
 const row=()=>({id,version,kind:'customers',status,total_rows:5,valid_rows:0,invalid_rows:0,applied_rows:0,failed_rows:0,checkpoint:null,failure_code:null,can_cancel:status==='uploaded',processing_status:'blocked_encrypted_staging_adapter'})
 await page.route('**/api/import/v1',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='importjob.list'){await route.fulfill({json:{ok:true,data:{contract_version:'importjob.v1',operation:q.operation,items:!q.input.status||q.input.status===status?[row()]:[],next_id:null}}});return}
  if(q.operation==='importjob.get'){await route.fulfill({json:{ok:true,data:{contract_version:'importjob.v1',operation:q.operation,record:row()}}});return}
  if(q.operation!=='importjob.cancel')throw Error('UNEXPECTED_IMPORT_COMMAND')
  commands.push(q);if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);status='cancelled';version++}
  if(commands.length===1){await route.abort('failed');return}
  await route.fulfill({json:{ok:true,receipt:{contract_version:'importjob.v1',operation:q.operation,command_id:q.input.command_id,id,version,status}}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=imports');const panel=page.getByRole('region',{name:'Gestión de importaciones',exact:true})
  await panel.getByRole('button',{name:'Ver trabajo',exact:true}).click();await panel.getByRole('button',{name:'Cancelar trabajo de importación',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Cancelar trabajo de importación',exact:true});await dialog.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('No se pudo confirmar el resultado.')
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).evaluate((b:HTMLButtonElement)=>b.click());await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled()
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible();const retry=dialog.getByRole('button',{name:'Reintentar la misma cancelación',exact:true});await expect(retry).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath(`import-cancel-${width}.png`)});await retry.click();await expect(dialog).toHaveCount(0)
  await expect(panel.getByRole('status').filter({hasText:'Trabajo cancelado.'})).toBeVisible();await expect(panel.getByText('Versión 2 · Estado Cancelado',{exact:true})).toBeVisible();expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);expect(applied.size).toBe(1)
  await expect(panel.getByText('Procesamiento bloqueado.',{exact:false})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
for(const error of ['conflict','access_denied'])test(`import cancellation ${error} allows dismissal and forbids blind retry`,async({page})=>{
 const fixture=await startCustomerResourceFixture();let commands=0
 const row={id,version:1,kind:'customers',status:'uploaded',total_rows:5,valid_rows:0,invalid_rows:0,applied_rows:0,failed_rows:0,checkpoint:null,failure_code:null,can_cancel:true,processing_status:'blocked_encrypted_staging_adapter'}
 await page.route('**/api/import/v1',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='importjob.list')await route.fulfill({json:{ok:true,data:{contract_version:'importjob.v1',operation:q.operation,items:[row],next_id:null}}})
  else if(q.operation==='importjob.get')await route.fulfill({json:{ok:true,data:{contract_version:'importjob.v1',operation:q.operation,record:row}}})
  else{commands++;await route.fulfill({status:error==='conflict'?409:403,json:{ok:false,error}})}
 })
 try{
  await page.goto(fixture.url+'/?kind=imports');const panel=page.getByRole('region',{name:'Gestión de importaciones',exact:true});await panel.getByRole('button',{name:'Ver trabajo',exact:true}).click();await panel.getByRole('button',{name:'Cancelar trabajo de importación',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Cancelar trabajo de importación',exact:true});await dialog.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.getByRole('button',{name:'Confirmar',exact:true})).toBeDisabled();await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(panel.getByText('Versión 1 · Estado Cargado',{exact:true})).toBeVisible();expect(commands).toBe(1)
 }finally{await page.close();await fixture.close()}
})
