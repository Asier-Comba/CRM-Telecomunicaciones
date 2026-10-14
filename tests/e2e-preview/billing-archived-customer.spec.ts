import {expect,test} from '@playwright/test'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
for(const width of [390,768,1440])for(const status of ['active','inactive','archived'])for(const entry of ['initial','prepare'])test(`billing draft ${entry} respects ${status} customer at ${width}`,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),id=fixture.invoice.id;let commands=0
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();if(route.request().url().includes('/commands'))commands++
  if(q.operation==='customer.editor'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic billing customer',trade_name:null,lifecycle:'customer',status,source:'manual',assigned_user_id:null}}});return}
  if(q.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id,customer_id:id,label:'Synthetic billing customer',status:status==='archived'?'active':status}]}}});return}
  if(['contract.list','service.list','opportunity.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  if(q.operation==='configuration.get'&&q.input.customer_id){await route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:q.operation,issuer:{version:1,profile:fixture.invoice.customer_fiscal,currency:'EUR',default_series:'A'},customer:null}}});return}
  await route.continue()
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+(entry==='initial'?'#fiscal-customer':'#create-customer'))
  const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true})
  if(entry==='initial'){
   await expect(page.getByLabel('Cliente para facturación')).toHaveValue(id)
   const create=page.getByRole('button',{name:'Nuevo borrador local',exact:true})
   if(status==='archived'){await expect(create).toBeDisabled();await expect(page.getByText('El cliente está archivado. Puedes consultar sus facturas; no preparar nuevos borradores.',{exact:true})).toBeVisible();await expect(page.getByText('Crear con texto o audio',{exact:true})).toHaveCount(0);await expect(page.locator('[data-invoice-detail-id]')).toHaveCount(1)}
   else{await expect(create).toBeEnabled();await create.click();await expect(editor).toBeVisible()}
  }else{
   const dialog=page.getByRole('dialog',{name:'Nueva factura',exact:true});await dialog.getByLabel('Buscar empresa para factura').fill('Synthetic');await expect(dialog.getByLabel('Cliente vinculado').locator(`option[value="${id}"]`)).toHaveCount(1);await dialog.getByLabel('Cliente vinculado').selectOption(id);await dialog.getByRole('button',{name:'Preparar borrador',exact:true}).click()
   if(status==='archived'){await expect(dialog.getByText('El cliente está archivado. Selecciona otro cliente para preparar un borrador.',{exact:true})).toBeVisible();await expect(editor).toHaveCount(0);await expect(dialog.getByLabel('Cliente vinculado')).toBeEnabled()}
   else{await expect(editor).toBeVisible();await expect(editor.getByLabel('Cliente de factura')).toHaveValue(id)}
  }
  expect(commands).toBe(0)
  if(status==='archived'&&entry==='initial'){await page.getByText('El cliente está archivado. Puedes consultar sus facturas; no preparar nuevos borradores.',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`billing-archived-customer-${width}.png`)})}
 }finally{await page.close();await fixture.close()}
})
