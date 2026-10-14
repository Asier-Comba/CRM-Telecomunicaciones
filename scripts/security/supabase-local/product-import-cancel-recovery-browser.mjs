import {expect} from '@playwright/test'

export async function confirmImportCancelWithLostReply({page,id,sql}){
 const dialog=page.getByRole('dialog',{name:'Cancelar trabajo de importación',exact:true}),bodies=[]
 const before=Number(sql(`select version from public.import_jobs where id='${id}'`)),audits=Number(sql(`select count(*) from public.product_audit_events where entity_id='${id}'`))
 let observedStatus
 const pattern='**/api/import/v1',handler=async route=>{
  const q=route.request().postDataJSON();if(q.operation!=='importjob.cancel')return route.continue()
  bodies.push(JSON.stringify(q));if(bodies.length===1){try{observedStatus=(await route.fetch()).status()}catch{observedStatus='NETWORK_FAILURE'}return route.abort('failed')}return route.continue()
 }
 await page.route(pattern,handler)
 try{
  await dialog.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();if(observedStatus!==200)throw Error('IMPORT_CANCEL_EFFECT_NOT_CONFIRMED')
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).evaluate(b=>b.click());await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled();await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
  await dialog.getByRole('button',{name:'Reintentar la misma cancelación',exact:true}).click();await expect(dialog).toHaveCount(0)
  if(bodies.length!==2||bodies[0]!==bodies[1])throw Error('IMPORT_CANCEL_REPLAY_CHANGED')
  if(Number(sql(`select version from public.import_jobs where id='${id}'`))!==before+1||Number(sql(`select count(*) from public.product_audit_events where entity_id='${id}'`))!==audits+1)throw Error('IMPORT_CANCEL_EFFECT_NOT_SINGLE')
 }finally{await page.unroute(pattern,handler)}
}
