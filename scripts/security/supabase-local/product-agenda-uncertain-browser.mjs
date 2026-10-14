import {expect} from '@playwright/test'
import {resolve} from 'node:path'

export async function agendaUncertainBrowser({page,origin,check,sql,wa,id,day,screenshotDir,report}){
 await check('agenda_task_meeting_create_update_complete_exact_lost_response_single_effect',async()=>{
  const customerLabel=sql(`select coalesce(trade_name,legal_name) from public.customers where workspace_id='${wa}' and id='${id}'`)
  for(const kind of ['task','meeting']){
   let entityId
   for(const action of ['create','update','complete']){
    const operation=kind+'.'+action,title='W2X uncertain '+kind+(action==='update'?' updated':'')
    await page.goto(origin+'/calendar?'+(action==='create'?'create='+kind:kind+'='+entityId))
    const dialog=page.getByRole('dialog',{name:action==='create'?'Nueva tarea o reunión':'Detalle de agenda',exact:true})
    if(action!=='complete'){
     await expect(dialog.getByLabel('Título',{exact:true})).toBeEditable();await dialog.getByLabel('Título',{exact:true}).fill(title)
     await dialog.getByLabel(kind==='task'?'Vencimiento':'Inicio',{exact:true}).fill(day+'T14:00')
     if(kind==='meeting')await dialog.getByLabel('Fin',{exact:true}).fill(day+'T15:00')
     if(action==='create'){
      await dialog.getByLabel('Buscar empresa para agenda',{exact:true}).fill(customerLabel)
      await expect(dialog.getByLabel('Cliente vinculado',{exact:true}).locator(`option[value="${id}"]`)).toHaveCount(1);await dialog.getByLabel('Cliente vinculado',{exact:true}).selectOption(id)
     }
    }
    const bodies=[];let observedStatus
    const handler=async route=>{
     const q=route.request().postDataJSON();if(q.operation!==operation)return route.continue();bodies.push(q)
     if(bodies.length===1){try{observedStatus=(await route.fetch()).status()}catch{observedStatus='NETWORK_FAILURE'}return route.abort('failed')}
     return route.continue()
    }
    await page.route('**/api/product/v1/commands',handler)
    try{
     report.w2_ui_action_step='agenda_uncertain:'+operation+':original';await dialog.getByRole('button',{name:action==='complete'?'Completar':action==='update'&&kind==='meeting'?'Reprogramar reunión':'Guardar agenda',exact:true}).click()
     await expect(dialog.getByRole('alert')).toContainText('No se pudo confirmar el resultado.');if(observedStatus!==200||bodies.length!==1)throw Error('AGENDA_UNCERTAIN_EFFECT_NOT_CONFIRMED')
     const close=dialog.getByRole('button',{name:'Cerrar panel',exact:true});await expect(close).toBeDisabled();await close.evaluate(button=>button.click());await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Título',{exact:true})).toBeDisabled()
     const retry=dialog.getByRole('button',{name:'Reintentar la misma acción',exact:true})
     for(const width of [390,768,1440]){await page.setViewportSize({width,height:960});await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1});await page.screenshot({path:resolve(screenshotDir,'agenda-uncertain-'+operation+'-'+width+'.png')});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('AGENDA_UNCERTAIN_OVERFLOW')}
     report.w2_ui_action_step='agenda_uncertain:'+operation+':replay';await retry.click();await expect(dialog).toHaveCount(0)
     if(bodies.length!==2||JSON.stringify(bodies[0])!==JSON.stringify(bodies[1]))throw Error('AGENDA_UNCERTAIN_INTENT_CHANGED')
     const input=bodies[0].input,command=input.command_id
     if(sql(`select count(*) from public.product_commands where workspace_id='${wa}' and command_id='${command}' and operation='${operation}'`)!=='1'||sql(`select count(*) from public.product_audit_events where workspace_id='${wa}' and command_id='${command}'`)!=='1')throw Error('AGENDA_UNCERTAIN_COMMAND_AUDIT_NOT_SINGLE')
     const receiptId=sql(`select receipt->>'id' from public.product_commands where workspace_id='${wa}' and command_id='${command}'`);if(!/^[0-9a-f-]{36}$/.test(receiptId)||entityId&&entityId!==receiptId)throw Error('AGENDA_UNCERTAIN_ENTITY_CHANGED');entityId=receiptId
     const table=kind==='task'?'tasks':'calendar_events',expectedVersion=action==='create'?1:input.expected_version+1
     if(Number(sql(`select version from public.${table} where workspace_id='${wa}' and id='${entityId}'`))!==expectedVersion||sql(`select customer_id from public.${table} where workspace_id='${wa}' and id='${entityId}'`)!==id||action==='complete'&&sql(`select status from public.${table} where id='${entityId}'`)!=='completed')throw Error('AGENDA_UNCERTAIN_SINGLE_REVISION_CUSTOMER_STATE_MISMATCH')
     await page.goto(origin+'/calendar?'+kind+'='+entityId);await expect(page.getByRole('dialog').getByLabel('Título',{exact:true})).toHaveValue(action==='create'?title:'W2X uncertain '+kind+' updated');await page.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0)
    }finally{await page.unroute('**/api/product/v1/commands',handler);await page.setViewportSize({width:1440,height:960})}
   }
  }
 })
}
