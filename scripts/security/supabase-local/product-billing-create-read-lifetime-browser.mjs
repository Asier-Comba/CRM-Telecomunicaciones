import {expect} from '@playwright/test'
import {resolve} from 'node:path'

export async function billingCreateReadLifetimeBrowser({page,origin,check,sql,wa,customerId,screenshotDir}){
 await check('billing_customer_preparation_cancelled_read_never_opens_or_writes',async()=>{
  const customerLabel=sql(`select coalesce(trade_name,legal_name) from public.customers where workspace_id='${wa}' and id='${customerId}'`)
  const invoices=Number(sql(`select count(*) from public.billing_invoices where workspace_id='${wa}'`)),commandsBefore=Number(sql(`select count(*) from public.product_commands where workspace_id='${wa}'`))
  await page.addInitScript(()=>{
   if(location.pathname!=='/facturacion'||new URLSearchParams(location.search).get('create')!=='1')return
   const original=window.fetch.bind(window);window.billingPreparationBodies=0
   window.fetch=async(input,init)=>{
    const response=await original(input,init);let selected=false
    try{const q=JSON.parse(String(init?.body));selected=q.operation==='customer.editor'||q.operation==='configuration.get'&&!!q.input.customer_id}catch{}
    if(selected){const json=response.json.bind(response);response.json=async()=>{const body=await json();window.billingPreparationBodies++;return body}}
    return response
   }
  })
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:960});await page.goto(origin+'/facturacion?create=1')
   const dialog=page.getByRole('dialog',{name:'Nueva factura',exact:true});await dialog.getByLabel('Buscar empresa para factura',{exact:true}).fill(customerLabel)
   await expect(dialog.getByLabel('Cliente vinculado',{exact:true}).locator(`option[value="${customerId}"]`)).toHaveCount(1);await dialog.getByLabel('Cliente vinculado',{exact:true}).selectOption(customerId)
   const held=[],commands=[];let failure
   const pattern='**/api/**',handler=async route=>{
    const q=route.request().postDataJSON();if(route.request().url().includes('/commands'))commands.push(q.operation)
    if(q.operation==='customer.editor'&&q.input.id===customerId||q.operation==='configuration.get'&&q.input.customer_id===customerId){
     try{const response=await route.fetch();if(response.status()!==200)throw Error('REFUSED');held.push({route,response,released:false})}catch{failure='BILLING_PREPARATION_READ_REFUSED';await route.abort('failed')}
     return
    }
    return route.continue()
   }
   await page.route(pattern,handler)
   try{
    await dialog.getByRole('button',{name:'Preparar borrador',exact:true}).click();await expect.poll(()=>held.length).toBe(2);if(failure)throw Error(failure)
    await expect(dialog.getByLabel('Cliente vinculado',{exact:true})).toBeDisabled();await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)
    for(const item of held){await item.route.fulfill({response:item.response});item.released=true}
    await expect.poll(()=>page.evaluate(()=>window.billingPreparationBodies)).toBe(2);await page.evaluate(()=>new Promise(accept=>requestAnimationFrame(()=>requestAnimationFrame(accept))))
    await expect(page.getByRole('dialog',{name:'Revisar borrador local',exact:true})).toHaveCount(0);await expect(page.getByLabel('Cliente para facturación',{exact:true})).toHaveValue('');await expect(page.getByRole('alert')).toHaveCount(0)
    if(commands.length)throw Error('BILLING_PREPARATION_CANCEL_CREATED_COMMAND')
    await page.screenshot({path:resolve(screenshotDir,'billing-cancelled-preparation-'+width+'.png')})
   }finally{for(const item of held)if(!item.released){try{await item.route.abort('failed')}catch{}}await page.unroute(pattern,handler)}
  }
  if(Number(sql(`select count(*) from public.billing_invoices where workspace_id='${wa}'`))!==invoices||Number(sql(`select count(*) from public.product_commands where workspace_id='${wa}'`))!==commandsBefore)throw Error('BILLING_PREPARATION_CANCEL_PERSISTED_EFFECT')
  await page.goto(origin+'/facturacion?create=1');const dialog=page.getByRole('dialog',{name:'Nueva factura',exact:true});await dialog.getByLabel('Buscar empresa para factura',{exact:true}).fill(customerLabel);await expect(dialog.getByLabel('Cliente vinculado',{exact:true}).locator(`option[value="${customerId}"]`)).toHaveCount(1);await dialog.getByLabel('Cliente vinculado',{exact:true}).selectOption(customerId);await dialog.getByRole('button',{name:'Preparar borrador',exact:true}).click();const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true});await expect(editor).toBeVisible();await expect(editor.getByLabel('Cliente de factura',{exact:true})).toHaveValue(customerId);await editor.getByRole('button',{name:'Cerrar panel',exact:true}).click()
  if(Number(sql(`select count(*) from public.billing_invoices where workspace_id='${wa}'`))!==invoices)throw Error('BILLING_PREPARATION_POSITIVE_WROTE_WITHOUT_CONFIRMATION')
 })
}
