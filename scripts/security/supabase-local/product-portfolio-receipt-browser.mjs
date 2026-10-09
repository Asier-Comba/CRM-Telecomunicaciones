import {expect} from '@playwright/test'
export async function portfolioReceiptBrowser({page,origin,uiContract,sql,wa,check}){
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
}
