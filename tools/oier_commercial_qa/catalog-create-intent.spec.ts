import {expect,test} from '@playwright/test'
import {startCatalogResourceFixture} from '../../tests/e2e-preview/fixtures/catalog-resource-server.cjs'
const id='20000000-0000-4000-8000-000000000001',name='Operador sintético controlado',code='oier_synthetic'
let fixture:Awaited<ReturnType<typeof startCatalogResourceFixture>>
test.beforeAll(async()=>{fixture=await startCatalogResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['transport','malformed','wrong_receipt','denied','success'] as const)test(`catalog operator creation preserves reviewed intent after ${mode}`,async({page},info)=>{
 const commands:{operation:string;input:Record<string,unknown>}[]=[],effects=new Set<string>(),errors:string[]=[]
 const record={id,version:1,code,display_name:name,status:'active',source:'manual'}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  if(q.operation==='operator.create'){
   commands.push(q)
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   effects.add(q.input.command_id)
   if(commands.length===1&&mode==='transport'){await route.abort('failed');return}
   if(commands.length===1&&mode==='malformed'){await route.fulfill({contentType:'application/json',body:'{'});return}
   data={contract_version:'catalog.v1',operation:q.operation,command_id:commands.length===1&&mode==='wrong_receipt'?'70000000-0000-4000-8000-000000000009':q.input.command_id,id,version:1,status:'active'}
  }else if(q.operation==='operator.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:effects.size?[record]:[],next_id:null}
  else if(q.operation==='operator.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record}
  else{await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  // Telecom catalog commands use the closed data envelope, not receipt.
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.goto(fixture.url+'/?qa_catalog=1')
  await page.getByRole('button',{name:'Nuevo operador',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Nuevo operador',exact:true})
  const field=dialog.getByRole('textbox',{name:'Nombre de alta de catálogo',exact:true})
  await field.fill(name);await dialog.getByRole('textbox',{name:'Código de alta de catálogo',exact:true}).fill(code)
  await dialog.getByRole('button',{name:'Revisar alta de catálogo',exact:true}).click()
  await dialog.getByRole('button',{name:'Confirmar alta de catálogo',exact:true}).click()
  await expect.poll(()=>commands.length).toBe(1)
  if(['transport','malformed','wrong_receipt'].includes(mode)){
   const retry=dialog.getByRole('button',{name:'Comprobar la misma alta',exact:true})
   await expect(retry).toBeEnabled();await expect(field).toBeDisabled();await expect(field).toHaveValue(name)
   await expect(dialog.getByRole('textbox',{name:'Código de alta de catálogo',exact:true})).toHaveValue(code)
   await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click({force:true});await expect(dialog).toBeVisible()
   await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
   await page.screenshot({path:info.outputPath(`catalog-create-${mode}-unconfirmed.png`)})
   await retry.click();await expect.poll(()=>commands.length).toBe(2);expect(commands[1]).toEqual(commands[0])
  }else if(mode==='denied'){
   await expect(dialog.getByRole('alert')).toBeVisible()
   await expect(dialog.getByRole('button',{name:'Comprobar la misma alta',exact:true})).toHaveCount(0)
   expect(effects.size).toBe(0)
   await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)
  }
  if(mode!=='denied'){
   await expect(dialog).toHaveCount(0)
   await expect(page.getByRole('dialog',{name,exact:true})).toBeVisible()
   expect(effects.size).toBe(1)
   expect(commands[0].input).toMatchObject({display_name:name,code})
  }
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath(`catalog-create-${mode}.png`)})
 }finally{await page.close()}
})
