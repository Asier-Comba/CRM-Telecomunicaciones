import {expect} from '@playwright/test'
import {resolve} from 'node:path'
import {observeInvoiceIssue} from './billing-issue-observation.mjs'
import {parseBillingReceiptV1} from '../../../src/lib/server/billing-runtime-v1.ts'

// Ordinary authenticated product commands only. Lose the backend reply after
// route.fetch; HTTP status alone is not proof of a persisted effect. Independent
// read-only observations supplement the unchanged command/audit/replay assertions.
export async function billingUncertainBrowser({page,origin,sql,wa,actorId,customerId,screenshotDir,report,invalidReceipt=false}){
 const button=name=>page.getByRole('button',{name,exact:true})
 const invoiceCount=()=>Number(sql(`select count(*) from public.billing_invoices where workspace_id='${wa}'`))
 const before=invoiceCount()
 async function replay(operation,title,submit){
  const bodies=[];let committedStatus=null
  const evidence=operation==='invoice.issue'?{mode:invalidReceipt?'INVALID_RECEIPT':'LOST_REPLY',click_attempted:false,click_returned:false,request_intercepted:false,backend_returned:false,backend_status:null,api_receipt_valid:null,alert_observed:false,close_guard_observed:false,fault_injection_started:null}:null
  if(evidence){report.w2_invoice_issue_observations??=[];report.w2_invoice_issue_observations.push(evidence)}
  const observe=()=>observeInvoiceIssue({sql,origin,workspaceId:wa,actorId,input:bodies[0]})
  const routeCommand=async route=>{
   const q=route.request().postDataJSON();if(q.operation!==operation)return route.continue()
   bodies.push(q.input)
   if(bodies.length===1){
    if(evidence){evidence.request_intercepted=true;evidence.before_backend=observe()}
    const response=await route.fetch();committedStatus=response.status()
    if(evidence){
     evidence.backend_returned=true;evidence.backend_status=committedStatus
     try{const body=await response.json();evidence.api_receipt_valid=body.ok===true&&!!parseBillingReceiptV1(operation,q.input,body.receipt)}catch{evidence.api_receipt_valid=false}
     evidence.after_backend=observe()
    }
    if(invalidReceipt&&committedStatus===200){
     if(operation==='invoice.issue'||operation==='issuer.set'){if(evidence)evidence.fault_injection_started='MALFORMED_JSON';return route.fulfill({status:200,contentType:'application/json',body:'{'})}
     const body=await response.json()
     if(operation==='invoice.mark_paid'||operation==='invoice.trash'||operation==='customer_fiscal.set')return route.fulfill({json:{...body,receipt:{...body.receipt,command_id:'70000000-0000-4000-8000-000000000009'}}})
     return route.fulfill({json:{...body,extra:'invalid-envelope'}})
    }
    if(evidence)evidence.fault_injection_started='CONNECTION_ABORT'
    return route.abort('failed')
   }
   return route.continue()
  }
  await page.route('**/api/billing/v1/commands',routeCommand)
  try{
   const dialog=page.getByRole('dialog',{name:title,exact:true})
   report.w2_ui_action_step=(invalidReceipt?'billing_invalid_receipt:':'billing_uncertain:')+operation+':first_effect';if(evidence)evidence.click_attempted=true;await dialog.getByRole('button',{name:submit,exact:true}).click();if(evidence)evidence.click_returned=true
   /* OIER20_PHASE */report.w2_ui_action_step=(invalidReceipt?'billing_invalid_receipt:':'billing_uncertain:')+operation+':first_effect:alert';
   await expect(dialog.getByRole('alert')).toContainText(invalidReceipt?'No se pudo completar la acción.':'No se pudo confirmar el resultado.');if(evidence)evidence.alert_observed=true
   /* OIER20_PHASE */report.w2_ui_action_step=(invalidReceipt?'billing_invalid_receipt:':'billing_uncertain:')+operation+':first_effect:effect_guard';
   if(committedStatus!==200||bodies.length!==1)throw Error('BILLING_UNCERTAIN_EFFECT_NOT_CONFIRMED')
   const close=dialog.getByRole('button',{name:operation.endsWith('.set')?'Cerrar panel':'Cancelar',exact:true})
   /* OIER20_PHASE */report.w2_ui_action_step=(invalidReceipt?'billing_invalid_receipt:':'billing_uncertain:')+operation+':first_effect:close_disabled';await expect(close).toBeDisabled();if(evidence)evidence.close_guard_observed=true;/* OIER20_PHASE */report.w2_ui_action_step=(invalidReceipt?'billing_invalid_receipt:':'billing_uncertain:')+operation+':first_effect:close_click';await close.evaluate(b=>b.click());/* OIER20_PHASE */report.w2_ui_action_step=(invalidReceipt?'billing_invalid_receipt:':'billing_uncertain:')+operation+':first_effect:escape';await page.keyboard.press('Escape');/* OIER20_PHASE */report.w2_ui_action_step=(invalidReceipt?'billing_invalid_receipt:':'billing_uncertain:')+operation+':first_effect:dialog_visible';await expect(dialog).toBeVisible()
   for(const width of [390,768,1440]){
    report.w2_ui_action_step=(invalidReceipt?'billing_invalid_receipt:':'billing_uncertain:')+operation+':review_'+width;await page.setViewportSize({width,height:960})
    const retry=dialog.getByRole('button',{name:'Reintentar la misma acción',exact:true});await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1})
    await page.screenshot({path:resolve(screenshotDir,(invalidReceipt?'billing-invalid-':'billing-uncertain-')+operation+'-'+width+'.png'),fullPage:false})
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('BILLING_UNCERTAIN_OVERFLOW')
   }
   report.w2_ui_action_step=(invalidReceipt?'billing_invalid_receipt:':'billing_uncertain:')+operation+':same_command_replay';await dialog.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click();await expect(dialog).toHaveCount(0)
   if(bodies.length!==2||JSON.stringify(bodies[0])!==JSON.stringify(bodies[1]))throw Error('BILLING_UNCERTAIN_CHANGED_INTENT')
   const input=bodies[0],command=input.command_id,auditOperation={'invoice.issue':'invoice.issued','invoice.mark_paid':'invoice.paid','invoice.reverse_payment':'invoice.payment_reversed','invoice.trash':'invoice.trashed','invoice.restore':'invoice.restored'}[operation]??operation
   if(Number(sql(`select count(*) from public.product_commands where workspace_id='${wa}' and command_id='${command}' and operation='${operation}'`))!==1||Number(sql(`select count(*) from public.product_audit_events where workspace_id='${wa}' and command_id='${command}' and operation='${auditOperation}'`))!==1)throw Error('BILLING_UNCERTAIN_NOT_SINGLE_COMMAND_AUDIT')
   const version=operation==='issuer.set'?sql(`select version from public.billing_issuers where workspace_id='${wa}'`):operation==='customer_fiscal.set'?sql(`select version from public.billing_customer_profiles where workspace_id='${wa}' and customer_id='${customerId}'`):sql(`select version from public.billing_invoices where workspace_id='${wa}' and id='${input.id}'`)
   if(Number(version)!==input.expected_version+1)throw Error('BILLING_UNCERTAIN_REVISION_NOT_SINGLE')
  }finally{if(evidence){evidence.final_phase=report.w2_ui_action_step;evidence.request_count=bodies.length;evidence.body_unchanged=bodies.length>0&&bodies.every(body=>JSON.stringify(body)===JSON.stringify(bodies[0]));evidence.at_exit=observe()}await page.unroute('**/api/billing/v1/commands',routeCommand);await page.setViewportSize({width:1440,height:960})}
 }
 await page.goto(origin+'/facturacion?customer='+customerId)
 for(const [operation,open,title]of [['issuer.set','Configurar emisor','Datos fiscales del emisor'],['customer_fiscal.set','Datos fiscales del cliente','Datos fiscales del cliente']]){
  await expect(button(open)).toBeEnabled();await button(open).click();await replay(operation,title,'Guardar datos fiscales')
  await button(open).click();await button('Cerrar panel').click();await expect(page.getByRole('dialog')).toHaveCount(0)
 }
 async function draft(label){
  await expect(button('Nuevo borrador')).toBeEnabled();await button('Nuevo borrador').click();await page.getByLabel('Concepto 1',{exact:true}).fill(label);await page.getByLabel('Precio 1',{exact:true}).fill('20');await page.getByRole('checkbox').check();await button('Guardar borrador').click();await expect(button('Emitir factura')).toBeVisible()
 }
 await draft('W2X uncertain issue proof')
 for(const [operation,open,title,next]of [['invoice.issue','Emitir factura','Emitir factura','Marcar como cobrada'],['invoice.mark_paid','Marcar como cobrada','Registrar cobro','Revertir cobro'],['invoice.reverse_payment','Revertir cobro','Revertir cobro','Marcar como cobrada']]){
  await button(open).click();await replay(operation,title,'Confirmar');await expect(button(next)).toBeVisible()
 }
 await draft('W2X uncertain draft state proof')
 for(const [operation,open,title,next]of [['invoice.trash','Mover a papelera','Mover borrador a papelera','Restaurar borrador'],['invoice.restore','Restaurar borrador','Restaurar borrador','Emitir factura']]){
  await button(open).click();await replay(operation,title,'Confirmar');await expect(button(next)).toBeVisible()
 }
 if(invoiceCount()!==before+2)throw Error('BILLING_UNCERTAIN_DUPLICATED_INVOICES')
 report[invalidReceipt?'w2_billing_invalid_receipt_command_replay':'w2_billing_uncertain_command_replay']='PASS_7_ORDINARY_AUTH_COMMANDS_SAME_BODY_SINGLE_REVISION_COMMAND_AUDIT'
}
