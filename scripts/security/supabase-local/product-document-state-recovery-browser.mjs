import {expect} from '@playwright/test'

// Ordinary product commands with committed responses deliberately withheld.
// This helper strengthens the existing lifecycle check; it adds no acceptance count.
export async function confirmDocumentStateWithLostReply({page,operation,id,sql}){
 const title=operation==='document.archive'?'Archivar documento':'Restaurar documento'
 const dialog=page.getByRole('dialog',{name:title,exact:true})
 const before=Number(sql(`select version from public.documents where id='${id}'`))
 const audits=Number(sql(`select count(*) from public.product_audit_events where entity_id='${id}'`))
 let lost=true,observedStatus;const bodies=[]
 const pattern='**/api/document/v1/commands',handler=async route=>{
  const input=route.request().postDataJSON();if(input.operation!==operation)return route.continue()
  bodies.push(JSON.stringify(input))
  if(lost){lost=false;try{observedStatus=(await route.fetch()).status()}catch{observedStatus='NETWORK_FAILURE'}return route.abort('failed')}
  return route.continue()
 }
 await page.route(pattern,handler)
 try{
  await dialog.getByRole('button',{name:'Confirmar',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();if(observedStatus!==200)throw Error('DOCUMENT_STATE_COMMAND_NOT_COMMITTED')
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).evaluate(b=>b.click());await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled()
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible();await expect(page.getByLabel('Estado de documentos',{exact:true})).toBeDisabled()
  await dialog.getByRole('button',{name:'Reintentar el mismo cambio',exact:true}).click();await expect(dialog).toHaveCount(0)
  if(bodies.length!==2||bodies[0]!==bodies[1])throw Error('DOCUMENT_STATE_REPLAY_CHANGED')
  if(Number(sql(`select version from public.documents where id='${id}'`))!==before+1||Number(sql(`select count(*) from public.product_audit_events where entity_id='${id}'`))!==audits+1)throw Error('DOCUMENT_STATE_EFFECT_NOT_SINGLE')
 }finally{await page.unroute(pattern,handler)}
}
