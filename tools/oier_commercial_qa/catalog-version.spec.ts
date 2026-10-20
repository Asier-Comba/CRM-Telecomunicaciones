import {expect,test} from '@playwright/test'
import {startCatalogResourceFixture} from '../../tests/e2e-preview/fixtures/catalog-resource-server.cjs'
const operator='20000000-0000-4000-8000-000000000001',planId='30000000-0000-4000-8000-000000000001',versionId='60000000-0000-4000-8000-000000000001'
const plan={id:planId,version:2,operator_id:operator,code:'synthetic_fiber',display_name:'Fibra sintética versionable',service_kind:'fiber',status:'active'}
let fixture:Awaited<ReturnType<typeof startCatalogResourceFixture>>
test.beforeAll(async()=>{fixture=await startCatalogResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})
test('explicit price publication returns the same immutable version and reviewed amounts',async({page},info)=>{
 const commands:{operation:string;input:Record<string,unknown>}[]=[],effects=new Set<string>()
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  const row={id:versionId,plan_id:planId,operator_id:operator,service_kind:'fiber',version_number:1,valid_from:'2026-10-21',valid_until:'2026-12-31',currency:'EUR',recurring_amount_minor:'2995',plan_status:'active'}
  if(q.operation==='plan_version.create'){
   commands.push(q);effects.add(q.input.command_id)
   data={contract_version:'catalog.v1',operation:q.operation,command_id:q.input.command_id,id:versionId,version:1,status:'published',plan_id:planId,parent_version:3,version_number:1}
  }else if(q.operation==='operator.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:operator,version:1,code:'synthetic_operator',display_name:'Operador sintético',status:'active',source:'manual'}],next_id:null}
  else if(q.operation==='operator.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:{id:operator,version:1,code:'synthetic_operator',display_name:'Operador sintético',status:'active',source:'manual'}}
  else if(q.operation==='plan.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[plan],next_id:null}
  else if(q.operation==='plan.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:plan}
  else if(q.operation==='plan_version.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:effects.size?[row]:[],next_id:null}
  else if(q.operation==='plan_version.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:row}
  else if(q.operation==='plan_version.terms_get')data={contract_version:'catalog.v1',operation:q.operation,record:{...Object.fromEntries(Object.entries(row).filter(([key])=>!['operator_id','service_kind','plan_status'].includes(key))),terms_status:'published',recurring_period:'month',one_time_amount_minor:'0',is_bundle:false,components:[{position:1,component_kind:'base',service_kind:'fiber',addon_code:null,quantity:1}],entitlements:[]}}
  else{await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 await page.goto(fixture.url+'/?qa_catalog=1')
 await page.getByRole('tab',{name:'Tarifas',exact:true}).click()
 const card=page.locator(`article[data-catalog-id="${planId}"]`)
 await expect(card.getByRole('button',{name:'Publicar nueva versión',exact:true})).toBeVisible()
 await card.getByRole('button',{name:'Publicar nueva versión',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Nueva versión de '+plan.display_name,exact:true})
 await dialog.getByLabel('Vigencia desde',{exact:true}).fill('2026-10-21')
 await dialog.getByLabel('Vigencia hasta',{exact:true}).fill('2026-12-31')
 await dialog.getByLabel('Cuota mensual',{exact:true}).fill('29,95')
 await dialog.getByLabel('Alta o instalación',{exact:true}).fill('0,00')
 await dialog.getByRole('button',{name:'Revisar versión',exact:true}).click()
 expect(commands).toEqual([])
 await expect(dialog.getByText('Cuota mensual: 29,95 EUR · Alta: 0,00 EUR',{exact:true})).toBeVisible()
 await page.screenshot({path:info.outputPath('reviewed-version-before-publication.png')})
 await dialog.getByRole('button',{name:'Confirmar publicación',exact:true}).click()
 await expect(dialog.getByRole('status')).toContainText('Versión publicada y recuperada')
 expect(commands).toHaveLength(1);expect(effects.size).toBe(1)
 expect(commands[0].input).toMatchObject({plan_id:planId,expected_version:2,valid_from:'2026-10-21',valid_until:'2026-12-31',currency:'EUR',recurring_amount_minor:'2995',one_time_amount_minor:'0',is_bundle:false,components:[{component_kind:'base',service_kind:'fiber',addon_code:null,quantity:1}],entitlements:[]})
 await dialog.getByRole('button',{name:'Ver condiciones publicadas',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Condiciones · versión 1',exact:true})).toContainText('29,95 EUR')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.screenshot({path:info.outputPath('published-version.png')})
})

test('a failed parent read before any command remains recoverable without an uncertain publication',async({page})=>{
 let reads=0,commands=0
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  if(q.operation==='plan.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[plan],next_id:null}
  else if(q.operation==='plan.get'){
   reads++
   if(reads===1){await route.fulfill({json:{ok:true,data:{invalid:'CONTROLLED_READ_FAILURE_NOT_A_WRITE'}}});return}
   data={contract_version:'telecom.collections.v1',operation:q.operation,record:plan}
  }else if(q.operation==='operator.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}
  else{if(q.operation==='plan_version.create')commands++;await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 await page.goto(fixture.url+'/?qa_catalog=1');await page.getByRole('tab',{name:'Tarifas',exact:true}).click()
 await page.locator(`article[data-catalog-id="${planId}"]`).getByRole('button',{name:'Publicar nueva versión',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Nueva versión de '+plan.display_name,exact:true})
 await expect(dialog.getByRole('alert')).toBeVisible()
 await dialog.getByRole('button',{name:'Reintentar lectura de tarifa',exact:true}).click()
 await expect(dialog.getByLabel('Vigencia desde',{exact:true})).toBeVisible()
 expect(reads).toBe(2);expect(commands).toBe(0)
 await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)
})

for(const mode of ['transport','malformed','wrong_receipt','denied','conflict','wrong_readback','fresh_parent','invalid_amount','viewer'] as const)test(`version publication preserves authority and effect identity after ${mode}`,async({page},info)=>{
 const commands:{operation:string;input:Record<string,unknown>}[]=[],effects=new Set<string>(),errors:string[]=[]
 let parentVersion=mode==='fresh_parent'?7:2,versionReads=0
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  const row={id:versionId,plan_id:planId,operator_id:operator,service_kind:'fiber',version_number:1,valid_from:'2026-10-21',valid_until:'2026-12-31',currency:'EUR',recurring_amount_minor:'2995',plan_status:'active'}
  if(q.operation==='plan_version.create'){
   commands.push(q)
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(mode==='conflict'&&commands.length===1){parentVersion=3;await route.fulfill({status:409,json:{ok:false,error:'conflict'}});return}
   if(!effects.has(q.input.command_id)&&q.input.expected_version!==parentVersion){await route.fulfill({status:409,json:{ok:false,error:'conflict'}});return}
   effects.add(q.input.command_id);parentVersion=q.input.expected_version+1
   if(commands.length===1&&mode==='transport'){await route.abort('failed');return}
   if(commands.length===1&&mode==='malformed'){await route.fulfill({contentType:'application/json',body:'{'});return}
   data={contract_version:'catalog.v1',operation:q.operation,command_id:commands.length===1&&mode==='wrong_receipt'?'70000000-0000-4000-8000-000000000009':q.input.command_id,id:versionId,version:1,status:'published',plan_id:planId,parent_version:q.input.expected_version+1,version_number:1}
  }else if(q.operation==='plan.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[plan],next_id:null}
  else if(q.operation==='plan.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:{...plan,version:parentVersion}}
  else if(q.operation==='operator.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}
  else if(q.operation==='plan_version.get'){
   versionReads++;data={contract_version:'telecom.collections.v1',operation:q.operation,record:{...row,recurring_amount_minor:mode==='wrong_readback'&&versionReads===1?'2996':'2995'}}
  }else if(q.operation==='plan_version.terms_get')data={contract_version:'catalog.v1',operation:q.operation,record:{...Object.fromEntries(Object.entries(row).filter(([key])=>!['operator_id','service_kind','plan_status'].includes(key))),terms_status:'published',recurring_period:'month',one_time_amount_minor:'0',is_bundle:false,components:[{position:1,component_kind:'base',service_kind:'fiber',addon_code:null,quantity:1}],entitlements:[]}}
  else{await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 await page.goto(fixture.url+'/?qa_catalog=1');await page.getByRole('tab',{name:'Tarifas',exact:true}).click()
 if(mode==='viewer'){
  await page.getByRole('button',{name:'Cambiar a lector sintético',exact:true}).click()
  await expect(page.getByRole('button',{name:'Publicar nueva versión',exact:true})).toHaveCount(0)
  expect(commands).toEqual([]);return
 }
 await page.locator(`article[data-catalog-id="${planId}"]`).getByRole('button',{name:'Publicar nueva versión',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Nueva versión de '+plan.display_name,exact:true})
 await dialog.getByLabel('Vigencia desde',{exact:true}).fill('2026-10-21');await dialog.getByLabel('Vigencia hasta',{exact:true}).fill('2026-12-31')
 await dialog.getByLabel('Cuota mensual',{exact:true}).fill('29,95');await dialog.getByLabel('Alta o instalación',{exact:true}).fill('0,00')
 if(mode==='invalid_amount'){
  for(const invalid of ['0.001','-1','99999999999999999.99']){
   await dialog.getByLabel('Cuota mensual',{exact:true}).fill(invalid)
   await dialog.getByRole('button',{name:'Revisar versión',exact:true}).click()
   await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.getByRole('button',{name:'Confirmar publicación',exact:true})).toHaveCount(0)
  }
  expect(commands).toEqual([]);await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();return
 }
 await dialog.getByRole('button',{name:'Revisar versión',exact:true}).click();expect(commands).toEqual([])
 await dialog.getByRole('button',{name:'Confirmar publicación',exact:true}).click();await expect.poll(()=>commands.length).toBe(1)
 if(['transport','malformed','wrong_receipt'].includes(mode)){
  const retry=dialog.getByRole('button',{name:'Comprobar la misma publicación',exact:true})
  await expect(retry).toBeEnabled();await expect(dialog.getByLabel('Cuota mensual',{exact:true})).toBeDisabled()
  await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).evaluate((button:HTMLButtonElement)=>button.click());await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
  await retry.click();await expect.poll(()=>commands.length).toBe(2);expect(commands[1]).toEqual(commands[0])
 }else if(mode==='denied'){
  await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.getByRole('button',{name:'Comprobar la misma publicación',exact:true})).toHaveCount(0)
  expect(effects.size).toBe(0);await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();return
 }else if(mode==='conflict'){
  await dialog.getByRole('button',{name:'Recargar tarifa y revisar',exact:true}).click()
  await expect(dialog.getByLabel('Cuota mensual',{exact:true})).toBeEnabled()
  await dialog.getByRole('button',{name:'Revisar versión',exact:true}).click();await dialog.getByRole('button',{name:'Confirmar publicación',exact:true}).click()
  await expect.poll(()=>commands.length).toBe(2);expect(commands[1].input.command_id).not.toBe(commands[0].input.command_id)
  expect(commands[1].input.expected_version).toBe(3)
 }else if(mode==='wrong_readback'){
  await expect(dialog.getByRole('status')).toContainText('Publicación registrada; recuperación pendiente')
  await expect(dialog.getByRole('button',{name:'Confirmar publicación',exact:true})).toHaveCount(0)
  await dialog.getByRole('button',{name:'Recuperar versión registrada',exact:true}).click()
  await expect.poll(()=>versionReads).toBe(2);expect(commands).toHaveLength(1)
 }
 await expect(dialog.getByRole('status')).toContainText('Versión publicada y recuperada')
 expect(commands[0].input.expected_version).toBe(mode==='fresh_parent'?7:2)
 expect(commands.every(q=>q.operation==='plan_version.create')).toBe(true);expect(effects.size).toBe(1);expect(errors).toEqual([])
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.screenshot({path:info.outputPath(`publication-${mode}.png`)})
})
