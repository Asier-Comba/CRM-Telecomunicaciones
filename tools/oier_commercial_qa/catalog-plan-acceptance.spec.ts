import {expect,test} from '@playwright/test'
import {startCatalogResourceFixture} from '../../tests/e2e-preview/fixtures/catalog-resource-server.cjs'
const operator='20000000-0000-4000-8000-000000000001',id='30000000-0000-4000-8000-000000000001'
const parentName='Operador sintético para tarifas',name='Tarifa sintética controlada',code='oier_plan'
let fixture:Awaited<ReturnType<typeof startCatalogResourceFixture>>
test.beforeAll(async()=>{fixture=await startCatalogResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['transport','malformed','wrong_receipt','denied','success'] as const)test(`manual plan caller acceptance after ${mode}`,async({page},info)=>{
 const commands:{operation:string;input:Record<string,unknown>}[]=[],effects=new Set<string>(),errors:string[]=[],planReads:Record<string,unknown>[]=[]
 const parent={id:operator,version:1,code:'oier_parent',display_name:parentName,status:'active',source:'manual'}
 const plan={id,version:1,operator_id:operator,code,display_name:name,service_kind:'fiber',status:'active'}
 const mutations=['operator.create','operator.update','operator.activate','operator.deactivate','plan.create','plan.update_metadata','plan.change_status','plan_version.create']
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  if(mutations.includes(q.operation)){
   commands.push(q)
   if(q.operation!=='plan.create'||mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   effects.add(q.input.command_id)
   if(commands.length===1&&mode==='transport'){await route.abort('failed');return}
   if(commands.length===1&&mode==='malformed'){await route.fulfill({contentType:'application/json',body:'{'});return}
   data={contract_version:'catalog.v1',operation:q.operation,command_id:commands.length===1&&mode==='wrong_receipt'?'70000000-0000-4000-8000-000000000009':q.input.command_id,id,version:1,status:'active'}
  }else if(q.operation==='operator.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[parent],next_id:null}
  else if(q.operation==='operator.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:parent}
  else if(q.operation==='plan.list'){planReads.push(q.input);data={contract_version:'telecom.collections.v1',operation:q.operation,items:effects.size?[plan]:[],next_id:null}}
  else{await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.goto(fixture.url+'/?qa_catalog=1')
  await page.locator(`article[data-catalog-id="${operator}"]`).getByRole('button',{name:'Ver operador',exact:true}).click()
  const parentDialog=page.getByRole('dialog',{name:parentName,exact:true})
  await parentDialog.getByRole('button',{name:'Nueva tarifa del operador',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Nueva tarifa de '+parentName,exact:true})
  const field=dialog.getByRole('textbox',{name:'Nombre de alta de catálogo',exact:true})
  await field.fill(name);await dialog.getByRole('textbox',{name:'Código de alta de catálogo',exact:true}).fill(code)
  await dialog.getByRole('combobox',{name:'Servicio de nueva tarifa',exact:true}).selectOption('fiber')
  await dialog.getByRole('button',{name:'Revisar alta de catálogo',exact:true}).click()
  await expect(dialog.getByText('La tarifa se crea sin condiciones económicas publicadas; sus versiones deben registrarse por separado.',{exact:true})).toBeVisible()
  await dialog.getByRole('button',{name:'Confirmar alta de catálogo',exact:true}).click()
  await expect.poll(()=>commands.length).toBe(1)
  if(['transport','malformed','wrong_receipt'].includes(mode)){
   const retry=dialog.getByRole('button',{name:'Comprobar la misma alta',exact:true})
   await expect(retry).toBeEnabled();await expect(field).toBeDisabled();await expect(field).toHaveValue(name)
   await expect(dialog.getByRole('combobox',{name:'Servicio de nueva tarifa',exact:true})).toHaveValue('fiber')
   await expect(dialog.getByRole('textbox',{name:'Código de alta de catálogo',exact:true})).toHaveValue(code)
   await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click({force:true});await expect(dialog).toBeVisible()
   await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
   await page.screenshot({path:info.outputPath(`manual-plan-${mode}-unconfirmed.png`)})
   await retry.click();await expect.poll(()=>commands.length).toBe(2);expect(commands[1]).toEqual(commands[0])
  }else if(mode==='denied'){
   await expect(dialog.getByRole('alert')).toBeVisible();expect(effects.size).toBe(0)
   await expect(dialog.getByRole('button',{name:'Comprobar la misma alta',exact:true})).toHaveCount(0)
   await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)
  }
  if(mode!=='denied'){
   await expect(dialog).toHaveCount(0)
   const card=page.locator(`article[data-catalog-id="${id}"]`)
   await expect(card.getByRole('heading',{name,exact:true})).toBeVisible()
   await expect(card).toContainText(parentName);await expect(card).toContainText('Fibra')
   expect(planReads.at(-1)?.operator_id).toBe(operator);expect(effects.size).toBe(1)
  }
  expect(commands.every(q=>q.operation==='plan.create')).toBe(true)
  expect(Object.keys(commands[0].input).sort()).toEqual(['code','command_id','display_name','operator_id','service_kind'])
  expect(commands[0].input).toMatchObject({operator_id:operator,display_name:name,code,service_kind:'fiber'})
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.locator('#main-content').evaluate(el=>{el.scrollTop=0})
  await page.screenshot({path:info.outputPath(`manual-plan-${mode}.png`)})
 }finally{await page.close()}
})
