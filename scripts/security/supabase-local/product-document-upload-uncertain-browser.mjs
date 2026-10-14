import {expect} from '@playwright/test'
import {resolve} from 'node:path'

export async function documentUploadUncertainBrowser({page,origin,check,sql,wa,id,screenshotDir,report}){
 await check('document_upload_three_uncertain_steps_same_intent_single_document_object',async()=>{
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')
  const before=Number(sql(`select count(*) from public.documents where workspace_id='${wa}' and customer_id='${id}'`))
  for(const lostStep of ['prepare','upload','finalize']){
   await page.goto(origin+'/documents?customer='+id);await page.getByRole('button',{name:'Subir documento local',exact:true}).click()
   const dialog=page.getByRole('dialog',{name:'Subir documento local',exact:true});await dialog.getByLabel('Archivo de prueba',{exact:true}).setInputFiles({name:'w2x-uncertain-'+lostStep+'.png',mimeType:'image/png',buffer:bytes})
   const commands=[],uploads=[];let lost=false,observedStatus
   const handler=async route=>{
    const request=route.request(),upload=request.url().includes('/content/upload?'),q=upload?null:request.postDataJSON()
    if(upload){uploads.push(request.postDataBuffer());if(!lost&&lostStep==='upload'){lost=true;try{observedStatus=(await route.fetch()).status()}catch{observedStatus='NETWORK_FAILURE'}return route.abort('failed')}}
    else{commands.push(q);if(!lost&&(lostStep==='prepare'&&q.operation==='document.request_upload'||lostStep==='finalize'&&q.operation==='document.finalize_upload')){lost=true;try{observedStatus=(await route.fetch()).status()}catch{observedStatus='NETWORK_FAILURE'}return route.abort('failed')}}
    return route.continue()
   }
   await page.route('**/api/document/v1/content/**',handler)
   try{
    for(const[step,label,next]of [['prepare','Preparar subida','Intención preparada. El archivo todavía no se ha subido.'],['upload','Subir archivo pendiente','Archivo subido; pendiente de finalización.'],['finalize','Confirmar finalización','Documento finalizado y disponible.']]){
     report.w2_ui_action_step='document_upload_uncertain:'+lostStep+':'+step;await dialog.getByRole('button',{name:label,exact:true}).click()
     if(step===lostStep){
      await expect(dialog.getByRole('alert')).toContainText('No se pudo confirmar el resultado.');if(observedStatus!==200)throw Error('DOCUMENT_UNCERTAIN_ORIGINAL_EFFECT_NOT_CONFIRMED')
      const close=dialog.getByRole('button',{name:'Cerrar panel',exact:true});await expect(close).toBeDisabled();await close.evaluate(button=>button.click());await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
      const retry=dialog.getByRole('button',{name:'Reintentar el mismo paso',exact:true})
      for(const width of [390,768,1440]){await page.setViewportSize({width,height:960});await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1});await page.screenshot({path:resolve(screenshotDir,'document-upload-uncertain-'+lostStep+'-'+width+'.png')});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('DOCUMENT_UNCERTAIN_OVERFLOW')}
      await retry.click()
     }
     await expect(dialog.getByText(next,{exact:true})).toBeVisible()
    }
    const prepare=commands.filter(q=>q.operation==='document.request_upload'),finalize=commands.filter(q=>q.operation==='document.finalize_upload')
    if(prepare.length!==(lostStep==='prepare'?2:1)||finalize.length!==(lostStep==='finalize'?2:1)||uploads.length!==(lostStep==='upload'?2:1)||uploads.some(body=>!body?.equals(bytes)))throw Error('DOCUMENT_UNCERTAIN_REQUEST_COUNTS_OR_BYTES_CHANGED')
    for(const series of [prepare,finalize])if(series.length===2&&JSON.stringify(series[0])!==JSON.stringify(series[1]))throw Error('DOCUMENT_UNCERTAIN_REPLAY_CHANGED')
    const command=prepare[0].input.command_id,documentId=sql(`select receipt->>'id' from public.product_commands where workspace_id='${wa}' and command_id='${command}'`)
    if(!/^[0-9a-f-]{36}$/.test(documentId))throw Error('DOCUMENT_UNCERTAIN_RECEIPT_ID_INVALID')
    if(sql(`select version||':'||status from public.documents where workspace_id='${wa}' and id='${documentId}'`)!=='2:active'||sql(`select count(*) from storage.objects where bucket_id='telecom-documents' and name like '${wa}/documents/${documentId}/%'`)!=='1')throw Error('DOCUMENT_UNCERTAIN_NOT_SINGLE_ACTIVE_DOCUMENT_OBJECT')
    for(const q of [prepare[0],finalize[0]])if(sql(`select count(*) from public.product_commands where workspace_id='${wa}' and command_id='${q.input.command_id}' and operation='${q.operation}'`)!=='1'||sql(`select count(*) from public.product_audit_events where workspace_id='${wa}' and command_id='${q.input.command_id}'`)!=='1')throw Error('DOCUMENT_UNCERTAIN_COMMAND_AUDIT_NOT_SINGLE')
    await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)
    await expect(page.locator(`article[data-document-id="${documentId}"]`)).toHaveAttribute('data-document-version','2')
   }finally{await page.unroute('**/api/document/v1/content/**',handler);await page.setViewportSize({width:1440,height:960})}
  }
  if(Number(sql(`select count(*) from public.documents where workspace_id='${wa}' and customer_id='${id}'`))!==before+3)throw Error('DOCUMENT_UNCERTAIN_PREPARATION_DUPLICATED_METADATA')
 })
}
