import {expect} from '@playwright/test'
export async function portfolioReceiptBrowser({page,origin,uiContract,sql,wa,check}){
 await check('portfolio_bounded_search_partial_denial_keeps_authorized_contract',async()=>{
  await page.goto(origin+'/portfolio');let refused=0,writes=0
  const deniedIds=new Set(),handler=async route=>{
   const q=route.request().postDataJSON()
   if(route.request().url().endsWith('/commands'))writes++
   if(q.operation==='portfolio.get'&&q.input.id!==uiContract){refused++;deniedIds.add(q.input.id);return route.fulfill({status:403,json:{ok:false,error:'access_denied'}})}
   return route.continue()
  }
  await page.route('**/api/portfolio/v1/**',handler)
  try{
   await page.getByLabel('Consultar cartera local',{exact:true}).fill('W2 UI Portfolio');await page.getByRole('button',{name:'Consultar cartera',exact:true}).click()
   await expect(page.locator(`article[data-portfolio-id="${uiContract}"]`)).toBeVisible();await expect(page.getByRole('alert').filter({hasText:'Algunos activos no están disponibles.'})).toBeVisible()
   if(refused<1||writes!==0)throw Error('PORTFOLIO_PARTIAL_DENIAL_NOT_EXERCISED_READ_ONLY')
   for(const id of deniedIds)await expect(page.locator(`article[data-portfolio-id="${id}"]`)).toHaveCount(0)
  }finally{await page.unroute('**/api/portfolio/v1/**',handler)}
 })
 await check('portfolio_confirmed_create_read_failure_retry_never_repeats_command',async()=>{
  await page.setViewportSize({width:1440,height:960});await page.goto(origin+'/portfolio?kind=contract&id='+uiContract)
  await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Cerrar panel',exact:true}).click()
  await page.locator(`article[data-portfolio-id="${uiContract}"]`).getByRole('button',{name:'Añadir servicio o plazo',exact:true}).click()
  await page.getByLabel('Nombre del nuevo activo',{exact:true}).fill('W2 Confirmed Receipt Synthetic Service')
  let commands=0,committed=false,failedRead=false
  const handler=async route=>{const body=route.request().postDataJSON();if(body.operation==='service.create_manual'){commands++;const response=await route.fetch();if(response.status()!==200)throw Error('PORTFOLIO_RECEIPT_COMMIT_FAILED');committed=true;await route.fulfill({response})}else if(committed&&!failedRead&&body.operation==='portfolio.get'&&body.input.kind==='service'){failedRead=true;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'internal_safe'})})}else await route.continue()}
  await page.route('**/api/portfolio/v1/**',handler)
  try{await page.getByRole('button',{name:'Guardar activo manual',exact:true}).click();await expect(page.getByRole('button',{name:'Consultar el alta registrada',exact:true})).toBeVisible();await expect(page.getByLabel('Nombre del nuevo activo',{exact:true})).toBeDisabled();if(!failedRead||commands!==1)throw Error('PORTFOLIO_RECEIPT_FAILURE_NOT_EXERCISED');await page.getByRole('button',{name:'Consultar el alta registrada',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);if(commands!==1||sql(`select count(*) from public.telecom_services where workspace_id='${wa}' and contract_id='${uiContract}' and display_name='W2 Confirmed Receipt Synthetic Service'`)!=='1')throw Error('PORTFOLIO_CONFIRMED_COMMAND_REPEATED')}finally{await page.unroute('**/api/portfolio/v1/**',handler)}
 })
 await check('portfolio_confirmed_edit_read_failure_keeps_context_and_only_read_retry',async()=>{
  const serviceId=sql(`select id from public.telecom_services where workspace_id='${wa}' and contract_id='${uiContract}' and display_name='W2 Confirmed Receipt Synthetic Service'`)
  if(!/^[0-9a-f-]{36}$/.test(serviceId))throw Error('PORTFOLIO_RECEIPT_SERVICE_FIXTURE_MISSING')
  await page.locator(`article[data-portfolio-id="${serviceId}"]`).getByRole('button',{name:'Ver activo',exact:true}).click()
  const dialog=page.getByRole('dialog');await expect(dialog.getByLabel('Nombre del activo',{exact:true})).toBeEditable()
  const beforeVersion=Number(sql(`select version from public.telecom_services where id='${serviceId}'`)),commands=[];let committed=false,failedRead=false,observedStatus
  const handler=async route=>{
   const q=route.request().postDataJSON()
   if(q.operation==='service.update_label'&&q.input.id===serviceId){commands.push(q.input);const response=await route.fetch();observedStatus=response.status();committed=observedStatus===200;return route.fulfill({response})}
   if(committed&&!failedRead&&q.operation==='portfolio.get'&&q.input.kind==='service'&&q.input.id===serviceId){failedRead=true;return route.fulfill({status:503,json:{ok:false,error:'internal_safe'}})}
   return route.continue()
  }
  await page.route('**/api/portfolio/v1/**',handler)
  try{
   await dialog.getByLabel('Nombre del activo',{exact:true}).fill('W2 Confirmed Receipt Synthetic Service Updated');await dialog.getByRole('button',{name:'Guardar nombre',exact:true}).click()
   const retry=dialog.getByRole('button',{name:'Consultar el cambio registrado',exact:true});await expect(retry).toBeVisible()
   if(!failedRead||observedStatus!==200||commands.length!==1)throw Error('PORTFOLIO_EDIT_READ_FAILURE_NOT_EXERCISED')
   await expect(dialog.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled();await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
   await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).evaluate(button=>button.click());await expect(dialog).toBeVisible()
   await retry.click();await expect(dialog).toHaveCount(0)
   const command=commands[0].command_id
   if(commands.length!==1||Number(sql(`select version from public.telecom_services where id='${serviceId}'`))!==beforeVersion+1||Number(sql(`select count(*) from public.product_commands where workspace_id='${wa}' and command_id='${command}'`))!==1||Number(sql(`select count(*) from public.product_audit_events where workspace_id='${wa}' and command_id='${command}'`))!==1)throw Error('PORTFOLIO_EDIT_RECOVERY_REPEATED_EFFECT')
   await expect(page.locator(`article[data-portfolio-id="${serviceId}"]`).getByRole('heading')).toHaveText('W2 Confirmed Receipt Synthetic Service Updated')
  }finally{await page.unroute('**/api/portfolio/v1/**',handler)}
 })
}
