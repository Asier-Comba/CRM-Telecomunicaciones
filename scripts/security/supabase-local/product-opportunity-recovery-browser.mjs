import {expect} from '@playwright/test'
import {resolve} from 'node:path'

export async function opportunityRecoveryBrowser({page,origin,check,sql,wa,id,screenshotDir,report}){
 await check('opportunity_uncertain_create_archive_confirmed_update_read_only_recovery',async()=>{
  const customerLabel=sql(`select coalesce(trade_name,legal_name) from public.customers where workspace_id='${wa}' and id='${id}'`)
  let opportunityId
  for(const action of ['create','update','archive']){
   const operation='opportunity.'+action,confirmed=action==='update'
   await page.goto(origin+'/opportunities?'+(action==='create'?'create=1':'open='+opportunityId))
   const dialog=page.getByRole('dialog',{name:action==='create'?'Nueva oportunidad':'Detalle de oportunidad',exact:true});await expect(dialog.getByLabel('Título comercial',{exact:true})).toBeEditable()
   if(action==='create'){
    await dialog.getByLabel('Buscar empresa para agenda',{exact:true}).fill(customerLabel);await expect(dialog.getByLabel('Cliente vinculado',{exact:true}).locator(`option[value="${id}"]`)).toHaveCount(1);await dialog.getByLabel('Cliente vinculado',{exact:true}).selectOption(id)
   }
   if(action!=='archive')await dialog.getByLabel('Título comercial',{exact:true}).fill('W2X opportunity recovery'+(confirmed?' updated':''))
   const bodies=[];let observedStatus,failedRead=false
   const handler=async route=>{
    const q=route.request().postDataJSON()
    if(q.operation===operation){bodies.push(q);const response=await route.fetch();observedStatus=response.status();if(!confirmed&&bodies.length===1)return route.abort('failed');return route.fulfill({response})}
    if(confirmed&&bodies.length&&!failedRead&&q.operation==='work.get'&&q.input.id===opportunityId){failedRead=true;return route.fulfill({status:503,json:{ok:false,error:'internal_safe'}})}
    return route.continue()
   }
   await page.route('**/api/product/v1/**',handler)
   try{
    report.w2_ui_action_step='opportunity_recovery:'+action+':first_effect'
    if(action==='archive'){await dialog.getByRole('button',{name:'Archivar oportunidad',exact:true}).click();await page.getByRole('dialog',{name:'Archivar oportunidad',exact:true}).getByRole('button',{name:'Confirmar',exact:true}).click()}
    else await dialog.getByRole('button',{name:'Guardar oportunidad',exact:true}).click()
    const active=action==='archive'?page.getByRole('dialog',{name:'Archivar oportunidad',exact:true}):dialog
    await expect(active.getByRole('alert')).toBeVisible();if(observedStatus!==200||bodies.length!==1||confirmed&&!failedRead)throw Error('OPPORTUNITY_RECOVERY_EFFECT_OR_FAILED_READ_NOT_EXERCISED')
    const close=dialog.getByRole('button',{name:'Cerrar panel',exact:true});await expect(close).toBeDisabled();await close.evaluate(button=>button.click());await page.keyboard.press('Escape');await expect(active).toBeVisible()
    if(action==='archive'){const cancel=active.getByRole('button',{name:'Cancelar',exact:true});await expect(cancel).toBeDisabled();await cancel.evaluate(button=>button.click());await expect(active).toBeVisible()}
    const retry=active.getByRole('button',{name:confirmed?'Consultar la oportunidad guardada':'Reintentar la misma acción',exact:true})
    for(const width of [390,768,1440]){await page.setViewportSize({width,height:960});await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1});await page.screenshot({path:resolve(screenshotDir,'opportunity-recovery-'+action+'-'+width+'.png')});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('OPPORTUNITY_RECOVERY_OVERFLOW')}
    report.w2_ui_action_step='opportunity_recovery:'+action+':retry';await retry.click();await expect(dialog).toHaveCount(0)
    if(bodies.length!==(confirmed?1:2)||!confirmed&&JSON.stringify(bodies[0])!==JSON.stringify(bodies[1]))throw Error('OPPORTUNITY_RECOVERY_COMMAND_REPEATED_OR_CHANGED')
    const input=bodies[0].input,command=input.command_id,receiptId=sql(`select receipt->>'id' from public.product_commands where workspace_id='${wa}' and command_id='${command}'`)
    if(!/^[0-9a-f-]{36}$/.test(receiptId)||opportunityId&&opportunityId!==receiptId)throw Error('OPPORTUNITY_RECOVERY_ENTITY_CHANGED');opportunityId=receiptId
    if(sql(`select count(*) from public.product_commands where workspace_id='${wa}' and command_id='${command}' and operation='${operation}'`)!=='1'||sql(`select count(*) from public.product_audit_events where workspace_id='${wa}' and command_id='${command}'`)!=='1')throw Error('OPPORTUNITY_RECOVERY_COMMAND_AUDIT_NOT_SINGLE')
    if(Number(sql(`select version from public.opportunities where workspace_id='${wa}' and id='${opportunityId}'`))!==(action==='create'?1:input.expected_version+1)||sql(`select customer_id from public.opportunities where workspace_id='${wa}' and id='${opportunityId}'`)!==id||action==='archive'&&sql(`select status from public.opportunities where id='${opportunityId}'`)!=='cancelled')throw Error('OPPORTUNITY_RECOVERY_VERSION_CUSTOMER_STATE_NOT_SINGLE')
    await page.goto(origin+'/opportunities?open='+opportunityId);await expect(page.getByRole('dialog').getByLabel('Título comercial',{exact:true})).toHaveValue('W2X opportunity recovery'+(action==='create'?'':' updated'));await page.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0)
   }finally{await page.unroute('**/api/product/v1/**',handler);await page.setViewportSize({width:1440,height:960})}
  }
 })
}
