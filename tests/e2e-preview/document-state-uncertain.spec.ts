import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const id='70000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001'
for(const width of [390,768,1440])for(const operation of ['document.archive','document.restore'] as const)test(`document state ${operation} keeps uncertain intent at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),bodies:{operation:string;input:{command_id:string;id:string;expected_version:number}}[]=[],applied=new Set<string>()
 let lost=false,status=operation==='document.archive'?'active':'archived',version=1
 await page.route('**/api/document/v1/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='document.list'){
   await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,items:q.input.status===status?[{id,version,status,document_kind:'general',media_type:'application/pdf',size_bytes:100,target:{kind:'customer',id:customer}}]:[],next_id:null}}});return
  }
  if(q.operation!==operation)throw Error('UNEXPECTED_DOCUMENT_STATE_OPERATION')
  bodies.push(q)
  if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);version++;status=operation==='document.archive'?'archived':'active'}
  if(!lost){lost=true;await route.abort('failed');return}
  await route.fulfill({json:{ok:true,receipt:{contract_version:'document.v1',operation,command_id:q.input.command_id,id,version,status}}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=documents')
  if(operation==='document.restore')await page.getByLabel('Estado de documentos').selectOption('archived')
  const name=operation==='document.archive'?'Archivar documento':'Restaurar documento'
  await page.locator(`article[data-document-id="${id}"]`).getByRole('button',{name,exact:true}).click()
  const dialog=page.getByRole('dialog',{name,exact:true});await dialog.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('No se pudo confirmar el resultado.')
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).evaluate((b:HTMLButtonElement)=>b.click());await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled()
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(page.getByLabel('Estado de documentos')).toBeDisabled();await expect(page.getByRole('button',{name:'Actualizar documentos',exact:true})).toBeDisabled()
  const retry=dialog.getByRole('button',{name:'Reintentar el mismo cambio',exact:true});await expect(retry).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath(`document-state-${operation}-${width}.png`)});await retry.click();await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('status').filter({hasText:'Metadatos actualizados.'})).toBeVisible();await page.getByLabel('Estado de documentos').selectOption(status)
  await expect(page.locator(`article[data-document-id="${id}"]`)).toHaveAttribute('data-document-version','2');expect(applied.size).toBe(1);expect(bodies).toHaveLength(2);expect(bodies[1]).toEqual(bodies[0]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
test('document state confirmed denial permits cancellation without replay',async({page})=>{
 const fixture=await startCustomerResourceFixture();let commands=0
 await page.route('**/api/document/v1/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='document.list')await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,items:[{id,version:1,status:'active',document_kind:'general',media_type:'application/pdf',size_bytes:100,target:{kind:'customer',id:customer}}],next_id:null}}})
  else{commands++;await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})}
 })
 try{
  await page.goto(fixture.url+'/?kind=documents');await page.getByRole('button',{name:'Archivar documento',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Archivar documento',exact:true});await dialog.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible()
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByLabel('Estado de documentos')).toBeEnabled();expect(commands).toBe(1)
 }finally{await page.close();await fixture.close()}
})
