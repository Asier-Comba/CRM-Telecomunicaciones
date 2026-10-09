import {expect} from '@playwright/test'
import {resolve} from 'node:path'

export async function billingMobileRowsBrowser({page,origin,sql,wa,customerId,screenshotDir,report}){
 const step=name=>{if(report)report.w2_ui_action_step='billing_mobile_rows:'+name};step('current_invoice_id')
 const invoiceId=await page.locator('section[data-invoice-detail-id]').getAttribute('data-invoice-detail-id')
 if(!invoiceId)throw Error('BILLING_MOBILE_CURRENT_INVOICE_MISSING')
 const count=()=>sql(`select count(*) from public.billing_invoices where workspace_id='${wa}'`),before=count(),commands=[]
 const response=operation=>page.waitForResponse(r=>{try{return r.url().endsWith('/api/billing/v1/queries')&&r.request().postDataJSON().operation===operation&&(operation==='invoice.list'||r.request().postDataJSON().input.id===invoiceId)}catch{return false}})
 const route=async route=>{commands.push(route.request().postDataJSON().operation);return route.continue()}
 await page.route('**/api/billing/v1/commands',route)
 try{
  step('prepare_current_document');await page.goto('about:blank');step('current_list_headers');const listed=response('invoice.list');await page.goto(origin+'/facturacion?customer='+customerId);const listResponse=await listed;step('current_list_body');let listBody;try{listBody=await listResponse.json()}catch{throw Error('BILLING_MOBILE_CURRENT_LIST_BODY_UNAVAILABLE')};const listedInvoice=listBody.data?.items?.find(i=>i.id===invoiceId)
  if(listResponse.status()!==200||!listBody.ok||!listedInvoice||listedInvoice.customer_id!==customerId||!listedInvoice.number||listedInvoice.status!=='issued')throw Error('BILLING_MOBILE_ACTUAL_LIST_INVALID')
  const row=page.locator(`tr[data-invoice-id="${invoiceId}"]`),table=page.getByRole('table',{name:'Listado de facturas',exact:true}),money=new Intl.NumberFormat('es-ES',{style:'currency',currency:listedInvoice.currency}).format(listedInvoice.totals.total_minor/100),number=`${listedInvoice.number.series}/${listedInvoice.number.year}/${String(listedInvoice.number.sequence).padStart(6,'0')}`
  for(const width of [1440,768,390]){
   step('current_row_'+width);await page.setViewportSize({width,height:960});await expect(table).toHaveCount(1);await expect(table.getByRole('columnheader')).toHaveCount(5);await expect(row.getByRole('cell')).toHaveCount(5);await row.scrollIntoViewIfNeeded();await expect(row).toBeInViewport({ratio:1})
   for(const cell of await row.getByRole('cell').all())await expect(cell).toBeInViewport({ratio:1})
   await expect(row.getByText(number,{exact:true})).toBeInViewport({ratio:1});await expect(row.getByText(money,{exact:true})).toBeInViewport({ratio:1});await expect(row.getByText(listedInvoice.due_on??'Sin vencimiento',{exact:true})).toBeInViewport({ratio:1})
   for(const label of ['Ver resumen','Abrir factura'])await expect(row.getByRole('button',{name:label,exact:true})).toBeInViewport({ratio:1})
   if(width===390)for(const label of ['Factura','Estado','Vencimiento','Total','Acciones'])await expect(row.locator('span[aria-hidden="true"]').filter({hasText:new RegExp('^'+label+'$')})).toBeInViewport({ratio:1})
   if(await table.evaluate(el=>el.closest('section').scrollWidth>el.closest('section').clientWidth+1)||await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('BILLING_MOBILE_LIST_HORIZONTAL_CLIPPING')
   step('all_row_tokens_'+width)
   await expect(table.locator('tr[data-invoice-id]')).toHaveCount(listBody.data.items.length)
   for(const item of listBody.data.items){const currentRow=table.locator(`tr[data-invoice-id="${item.id}"]`);await expect(currentRow.locator('[data-invoice-status]')).toHaveCount(1);await expect(currentRow.locator('[data-invoice-total]')).toHaveText(new Intl.NumberFormat('es-ES',{style:'currency',currency:item.currency}).format(item.totals.total_minor/100))}
   const wrapped=await table.locator('[data-invoice-status], [data-invoice-total]').evaluateAll(tokens=>tokens.some(token=>{const walker=document.createTreeWalker(token,NodeFilter.SHOW_TEXT),tops=new Set;let node;while(node=walker.nextNode()){if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const rect of range.getClientRects())if(rect.width>0)tops.add(Math.round(rect.top))}return tops.size!==1}))
   if(wrapped)throw Error('BILLING_MOBILE_ROW_STATUS_OR_CURRENCY_WRAPPED')
   await page.screenshot({path:resolve(screenshotDir,'billing-complete-invoice-row-'+width+'.png'),fullPage:true})
   step('current_summary_'+width);const summaryRead=response('invoice.summary');await row.getByRole('button',{name:'Ver resumen',exact:true}).click();const summaryResponse=await summaryRead,summaryBody=await summaryResponse.json(),summary=summaryBody.data?.invoice
   if(summaryResponse.status()!==200||!summaryBody.ok||!summary||summary.id!==invoiceId||summary.customer_id!==customerId||summary.totals.total_minor!==listedInvoice.totals.total_minor||summary.currency!==listedInvoice.currency)throw Error('BILLING_MOBILE_ROW_SUMMARY_MISMATCH')
   const drawer=page.getByRole('dialog',{name:'Resumen de factura',exact:true});await expect(drawer.getByText(money,{exact:true})).toBeVisible();await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(drawer).toHaveCount(0)
   step('current_detail_'+width);await row.scrollIntoViewIfNeeded();const detailRead=response('invoice.get');await row.getByRole('button',{name:'Abrir factura',exact:true}).focus();await page.keyboard.press('Enter');const detailResponse=await detailRead,detailBody=await detailResponse.json(),current=detailBody.data?.invoice
   if(detailResponse.status()!==200||!detailBody.ok||!current||current.id!==invoiceId||current.customer_id!==customerId||current.version!==listedInvoice.version||JSON.stringify(current.number)!==JSON.stringify(listedInvoice.number))throw Error('BILLING_MOBILE_ROW_DETAIL_MISMATCH')
   await expect(page.locator(`section[data-invoice-detail-id="${invoiceId}"]`)).toBeVisible();if(commands.length||count()!==before)throw Error('BILLING_MOBILE_LIST_READ_ACTION_WROTE')
  }
 }finally{await page.unroute('**/api/billing/v1/commands',route);await page.setViewportSize({width:1440,height:960})}
}
