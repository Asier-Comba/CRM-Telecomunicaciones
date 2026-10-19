import {expect} from '@playwright/test'
import {resolve} from 'node:path'

export async function customerStateReceiptBrowser(options){
 const {page,origin,id,check}=options
 await check('customer_archive_restore_persist',()=>stateReceiptRecovery(options,null))
 await check('customer_archive_restore_three_invalid_receipts_single_revision_audit',async()=>{
  const previous=page.viewportSize()
  try{for(const width of [390,768,1440]){await page.setViewportSize({width,height:960});await page.goto(origin+'/clients/'+id);await stateReceiptRecovery(options,width)}}finally{await page.setViewportSize(previous)}
 })
}

async function stateReceiptRecovery({page,id,sql,wa,screenshotDir},replyWidth){
      for(const[operation,label,nextLabel]of [['customer.archive','Archivar cliente','Restaurar cliente'],['customer.restore','Restaurar cliente','Archivar cliente']]){
        const bodies=[];let lost=true,observedStatus
        const handler=async route=>{
          const q=route.request().postDataJSON();if(q.operation!==operation)return route.continue()
          bodies.push(JSON.stringify(q))
          if(lost){
            lost=false;let response
            try{response=await route.fetch();observedStatus=response.status()}catch{observedStatus='NETWORK_FAILURE'}
            if(replyWidth&&observedStatus===200){
              if(replyWidth===390)return route.fulfill({status:200,contentType:'application/json',body:'{'})
              const body=await response.json()
              return route.fulfill(replyWidth===768?{json:{...body,receipt:{...body.receipt,command_id:'70000000-0000-4000-8000-000000000009'}}}:{json:{...body,extra:'invalid-envelope'}})
            }
            return route.abort('failed')
          }
          return route.continue()
        }
        await page.route('**/api/product/v1/commands',handler)
        try{
          await page.getByRole('button',{name:label,exact:true}).click();const dialog=page.getByRole('dialog',{name:label,exact:true});await dialog.getByRole('button',{name:'Confirmar',exact:true}).click()
          await expect(dialog.getByRole('alert')).toContainText(replyWidth?'No se pudo completar la acción.':'No se pudo confirmar el resultado.');if(observedStatus!==200)throw Error('CUSTOMER_STATE_EFFECT_NOT_COMMITTED')
          await expect(dialog.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled();await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
          if(replyWidth){const retry=dialog.getByRole('button',{name:'Reintentar la misma acción',exact:true});await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1});await page.screenshot({path:resolve(screenshotDir,'customer-state-invalid-'+operation+'-'+replyWidth+'.png')})}
          await dialog.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click();await expect(page.getByRole('button',{name:nextLabel,exact:true})).toBeVisible()
          if(bodies.length!==2||bodies[0]!==bodies[1])throw Error('CUSTOMER_STATE_REPLAY_CHANGED')
          const command=JSON.parse(bodies[0]).input.command_id;if(!/^[0-9a-f-]{36}$/.test(command))throw Error('CUSTOMER_STATE_COMMAND_INVALID')
          if(sql(`select count(*) from public.product_commands where workspace_id='${wa}' and command_id='${command}' and operation='${operation}'`)!=='1'||sql(`select count(*) from public.product_audit_events where workspace_id='${wa}' and command_id='${command}' and operation='${operation}'`)!=='1')throw Error('CUSTOMER_STATE_LEDGER_AUDIT_NOT_SINGLE')
          if(replyWidth){const input=JSON.parse(bodies[0]).input;if(Number(sql(`select version from public.customers where workspace_id='${wa}' and id='${id}'`))!==input.expected_version+1)throw Error('CUSTOMER_STATE_INVALID_RECEIPT_REVISION_NOT_SINGLE')}
          await page.reload()
        }finally{await page.unroute('**/api/product/v1/commands',handler)}
      }
      await expect(page.getByRole('heading',{name:'W2 UI Synthetic Company',exact:true})).toBeVisible()
}
