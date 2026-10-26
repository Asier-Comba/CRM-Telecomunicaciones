import {chromium,expect} from '@playwright/test'
import {mkdirSync} from 'node:fs'
import {resolve} from 'node:path'

/** One new sale, from an empty customer to the same invoice after a full reload.
 * All business writes come from visible controls. No route mocks, SQL business
 * fixtures, programmatic commands, retries, imported chains or old test IDs.
 */
export async function commercialBrowser(c,report){
  const {origin,users,sql,wa,operator,stage,check}=c
  const dir=resolve(process.env.RUNNER_TEMP,'commercial62-ui');mkdirSync(dir,{recursive:true})
  const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:960},timezoneId:'Europe/Madrid'}),page=await context.newPage()
  const button=name=>page.getByRole('button',{name,exact:true}),field=name=>page.getByLabel(name,{exact:true})
  const step=name=>{report.browser_step=name},closed=()=>expect(page.getByRole('dialog')).toHaveCount(0)
  const wait=operation=>page.waitForResponse(r=>{try{return r.request().method()==='POST'&&r.request().postDataJSON().operation===operation}catch{return false}})
  async function commit(operation,action){const pending=wait(operation);await action();const r=await pending,b=await r.json(),receipt=b.receipt??b.data;check(r.status()===200&&b.ok&&/^[0-9a-f-]{36}$/.test(receipt?.id??''),'browser_'+operation.replaceAll('.','_'));return receipt}
  async function shot(name){await page.screenshot({path:resolve(dir,name+'.png'),fullPage:false})}
  async function login(actor){
    await context.clearCookies();await page.goto(origin+'/login');await page.locator('input[type="email"]').fill(actor.email);await page.locator('input[type="password"]').fill(actor.password);await button('Iniciar sesión').click();await page.waitForURL('**/dashboard')
  }
  async function activate(kind,id){
    await page.goto(origin+'/portfolio?kind='+kind+'&id='+id)
    const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible()
    await field(kind==='contract'?'Fecha de firma':'Fecha efectiva').fill('2026-10-26')
    if(kind!=='contract'){await expect(field('Estado del activo').locator('option[value="active"]')).toBeEnabled();await field('Estado del activo').selectOption('active')}
    await button(kind==='contract'?'Activar contrato':'Guardar cambio').click()
    await commit(kind==='contract'?'contract.activate':kind+'.transition',()=>page.getByRole('dialog',{name:'Confirmar cambio de cartera',exact:true}).getByRole('button',{name:'Confirmar',exact:true}).click());await closed()
    check(sql(`select status from public.telecom_${kind==='contract'?'contracts':kind==='service'?'services':'lines'} where id='${id}' and workspace_id='${wa}'`)==='active','browser_'+kind+'_active_readback')
  }
  try{
    step('owner_login');await login(users.ownerA);check(true,'browser_authentic_owner_login')
    step('customer');await page.goto(origin+'/clients');await button('Nuevo cliente').click();await field('Razón social').fill('Unit62 Browser Coherent Sale')
    const customer=await commit('customer.create',()=>button('Guardar cliente').click());await page.waitForURL('**/clients/'+customer.id);await expect(page.getByRole('heading',{name:'Unit62 Browser Coherent Sale',exact:true})).toBeVisible();await shot('01-customer')
    check(sql(`select count(*) from public.telecom_contracts where customer_id='${customer.id}'`)==='0','browser_new_customer_has_no_seeded_contract')
    step('contract');await page.getByRole('tab',{name:'Contratos',exact:true}).click();await button('Registrar contrato manual').click();await field('Operador del nuevo contrato').selectOption(operator);await field('Fecha de inicio del contrato').fill('2026-10-26');await button('Revisar contrato manual').click()
    const contract=await commit('contract.create_manual',()=>button('Confirmar cambio').click());await closed();await activate('contract',contract.id);await shot('02-contract-active')
    step('service');await page.locator(`article[data-portfolio-id="${contract.id}"]`).getByRole('button',{name:'Añadir servicio o plazo',exact:true}).click();await field('Nombre del nuevo activo').fill('Unit62 Browser Service')
    const service=await commit('service.create_manual',()=>button('Guardar activo manual').click());await closed();await activate('service',service.id)
    step('line');await page.locator(`article[data-portfolio-id="${service.id}"]`).getByRole('button',{name:'Añadir línea',exact:true}).click();await field('Nombre del nuevo activo').fill('Unit62 Browser Line')
    const line=await commit('line.create_manual',()=>button('Guardar activo manual').click());await closed();await activate('line',line.id);await shot('03-line-active')
    step('opportunity');await page.goto(origin+'/opportunities?create=1');await field('Buscar empresa para agenda').fill('Unit62 Browser Coherent');await expect(field('Cliente vinculado').locator(`option[value="${customer.id}"]`)).toHaveCount(1);await field('Cliente vinculado').selectOption(customer.id);await field('Título comercial').fill('Unit62 Browser Connectivity Sale');await field('Importe').fill('1200');await field('Etapa comercial').selectOption(stage)
    await field('Buscar productos de esta empresa').fill('Unit62 Browser Service');await button('Consultar productos autorizados').click();await page.locator(`button[data-link-target="${service.id}"]`).click()
    const opportunity=await commit('opportunity.create',()=>button('Guardar oportunidad').click());await closed();await page.goto(origin+'/opportunities?open='+opportunity.id);await expect(page.getByRole('link',{name:'Consultar servicio vinculado',exact:true})).toBeVisible();await shot('04-opportunity-linked')
    step('invoice');await page.goto(origin+'/facturacion?customer='+customer.id);await expect(button('Nuevo borrador')).toBeEnabled();await button('Nuevo borrador').click();await field('Concepto 1').fill('Unit62 Browser Connectivity');await field('Precio 1').fill('300');await field('Fecha de emisión').fill('2026-10-26')
    for(const [label,id]of [['Contrato',contract.id],['Servicio',service.id],['Oportunidad',opportunity.id]]){
      const picker=field(label+' de factura');await expect(picker).toBeEnabled();await expect(picker.locator(`option[value="${id}"]`)).toHaveCount(1);await picker.selectOption(id)
      const key={Contrato:'contractId',Servicio:'serviceId',Oportunidad:'opportunityId'}[label];await expect(page.locator(`[data-invoice-relation-current="${key}"]`)).toBeVisible()
    }
    await page.getByRole('checkbox').check();const invoice=await commit('invoice.create_draft',()=>button('Guardar borrador').click());await closed();await expect(page.locator(`section[data-invoice-detail-id="${invoice.id}"]`)).toBeVisible()
    check(sql(`select count(*) from public.billing_invoices i join public.telecom_services s on s.id=i.service_id and s.contract_id=i.contract_id and s.customer_id=i.customer_id and s.workspace_id=i.workspace_id join public.telecom_contracts c on c.id=s.contract_id and c.workspace_id=s.workspace_id and c.customer_id=s.customer_id join public.telecom_lines l on l.service_id=s.id and l.workspace_id=s.workspace_id join public.product_opportunity_links p on p.opportunity_id=i.opportunity_id and p.kind='service' and p.target_id=s.id where i.workspace_id='${wa}' and i.id='${invoice.id}' and i.customer_id='${customer.id}' and i.contract_id='${contract.id}' and i.service_id='${service.id}' and i.opportunity_id='${opportunity.id}' and l.id='${line.id}' and c.status='active' and s.status='active' and l.status='active' and i.total_minor=36300 and i.status='draft'`)==='1','browser_same_commercial_operation_persisted')
    step('invoice_full_reload');await page.reload();await page.locator(`tr[data-invoice-id="${invoice.id}"]`).getByRole('button',{name:'Abrir factura',exact:true}).click();await expect(page.locator(`section[data-invoice-detail-id="${invoice.id}"]`)).toContainText('363,00');await button('Editar borrador').click()
    for(const [label,id]of [['Cliente',customer.id],['Contrato',contract.id],['Servicio',service.id],['Oportunidad',opportunity.id]])await expect(field(label+' de factura')).toHaveValue(id)
    check(true,'browser_reload_readback_preserves_all_links')
    for(const width of [1440,768,390]){await page.setViewportSize({width,height:960});const relations=page.locator('[data-invoice-relations="authorized"]');await relations.scrollIntoViewIfNeeded();await expect(relations).toBeVisible();check(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'browser_linked_invoice_width_'+width);await shot('05-invoice-readback-'+width)}
    await button('Cerrar panel').click();await page.setViewportSize({width:1440,height:960})
    for(const actor of [users.memberA,users.viewerA,users.ownerB]){
      step('role_'+actor.role+'_'+(actor.workspace===wa?'A':'B'));await login(actor)
      const foreignRead=actor.workspace!==wa?wait('invoice.get'):null
      await page.goto(origin+'/facturacion?invoice='+invoice.id)
      if(foreignRead){const r=await foreignRead;check([403,404].includes(r.status()),'browser_foreign_invoice_request_denied')}
      else {await expect(page.getByText('Facturación disponible para administradores del espacio.',{exact:true})).toBeVisible();await expect(button('Nuevo borrador')).toHaveCount(0)}
      await expect(page.locator(`section[data-invoice-detail-id="${invoice.id}"]`)).toHaveCount(0);await expect(page.getByText('Unit62 Browser Connectivity',{exact:true})).toHaveCount(0)
      check(true,'browser_foreign_or_commercial_role_invoice_hidden_'+actor.role+'_'+(actor.workspace===wa?'A':'B'))
    }
    step('viewer_line');await login(users.viewerA);await page.goto(origin+'/portfolio?kind=line&id='+line.id);await expect(page.getByText('Consulta de solo lectura para tu rol.',{exact:true})).toBeVisible();await expect(button('Guardar cambio')).toHaveCount(0);await shot('06-viewer-line')
    check(true,'browser_viewer_same_line_read_only');report.browser='PASS'
  }catch(error){
    report.browser='FAIL';await shot('FAILED-'+report.browser_step).catch(()=>{})
    throw /^[A-Z0-9_]{1,180}$/.test(error?.message??'')?error:Error(/timeout/i.test(String(error))?'BROWSER_TIMEOUT':'BROWSER_ASSERTION_FAILED')
  }finally{await context.close();await browser.close()}
}
