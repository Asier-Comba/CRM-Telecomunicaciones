import {expect} from '@playwright/test'
import {randomUUID} from 'node:crypto'
import {resolve} from 'node:path'
export async function catalogBrowser({page,origin,check,screenshotDir}){
 let createdPlanId=null,createdOperatorId=null
 const wait=op=>page.waitForResponse(r=>{try{return r.request().method()==='POST'&&r.request().postDataJSON().operation===op}catch{return false}})
 async function receipt(pending){const r=await pending,b=await r.json();if(r.status()!==200||!b.ok)throw Error('CATALOG_CURRENT_COOKIE_COMMAND_FAILED');return b.data}
 await check('catalog_normal_operator_create_update_deactivate_activate_plan_create',async()=>{
  await page.setViewportSize({width:1440,height:960});await page.goto(origin+'/catalog');await page.getByRole('button',{name:'Nuevo operador',exact:true}).click();await page.getByLabel('Nombre de alta de catálogo',{exact:true}).fill('W2 Catalog Synthetic Operator');await page.getByLabel('Código de alta de catálogo',{exact:true}).fill('w2-ui-catalog-'+randomUUID());await page.getByRole('button',{name:'Revisar alta de catálogo',exact:true}).click();let pending=wait('operator.create');await page.getByRole('button',{name:'Confirmar alta de catálogo',exact:true}).click();const created=await receipt(pending);await expect(page.getByRole('dialog').getByRole('button',{name:'Nueva tarifa del operador',exact:true})).toBeVisible();await page.getByLabel('Nombre del operador',{exact:true}).fill('W2 Catalog Synthetic Updated');await page.getByRole('button',{name:'Revisar nombre',exact:true}).click();pending=wait('operator.update');await page.getByRole('button',{name:'Confirmar cambio de operador',exact:true}).click();const changed=await receipt(pending);if(changed.id!==created.id||changed.version!==2)throw Error('CATALOG_UPDATE_EXACT_RECEIPT');await expect(page.getByRole('status').filter({hasText:'Cambio de operador registrado.'})).toBeVisible();await page.getByRole('button',{name:'Cerrar panel',exact:true}).click()
  await page.goto(origin+'/catalog?operator='+created.id);await page.getByRole('button',{name:'Desactivar operador',exact:true}).click();pending=wait('operator.deactivate');await page.getByRole('button',{name:'Confirmar cambio de operador',exact:true}).click();const inactive=await receipt(pending);if(inactive.status!=='inactive'||inactive.version!==3)throw Error('CATALOG_DEACTIVATE');await expect(page.getByRole('status').filter({hasText:'Cambio de operador registrado.'})).toBeVisible();await page.getByRole('button',{name:'Cerrar panel',exact:true}).click()
  await page.goto(origin+'/catalog?operator='+created.id);await page.getByRole('button',{name:'Activar operador',exact:true}).click();pending=wait('operator.activate');await page.getByRole('button',{name:'Confirmar cambio de operador',exact:true}).click();const active=await receipt(pending);if(active.status!=='active'||active.version!==4)throw Error('CATALOG_ACTIVATE');await expect(page.getByRole('status').filter({hasText:'Cambio de operador registrado.'})).toBeVisible();await page.getByRole('button',{name:'Cerrar panel',exact:true}).click()
  await page.goto(origin+'/catalog?operator='+created.id);await page.getByRole('button',{name:'Nueva tarifa del operador',exact:true}).click();await page.getByLabel('Nombre de alta de catálogo',{exact:true}).fill('W2 Catalog Synthetic Plan');await page.getByLabel('Código de alta de catálogo',{exact:true}).fill('w2-ui-plan-'+randomUUID());await page.getByLabel('Servicio de nueva tarifa',{exact:true}).selectOption('mobile');await page.getByRole('button',{name:'Revisar alta de catálogo',exact:true}).click();pending=wait('plan.create');await page.getByRole('button',{name:'Confirmar alta de catálogo',exact:true}).click();const plan=await receipt(pending);if(plan.status!=='active')throw Error('CATALOG_PLAN_CREATE');createdPlanId=plan.id;createdOperatorId=created.id;const row=page.locator('[data-catalog-id="'+plan.id+'"]');await expect(row).toBeVisible();pending=wait('plan_version.list');await row.getByRole('button',{name:'Ver versiones de tarifa',exact:true}).click();const versions=await(await pending).json();if(!versions.ok||versions.data.items.length!==0)throw Error('CATALOG_NO_INVENTED_PLAN_VERSION');await expect(page.getByText('No hay registros de catálogo con estos filtros.',{exact:true})).toBeVisible()
 })
 await check('catalog_normal_price_version_publish_and_reload',()=>publishCatalogVersionBrowser({page,origin,createdPlanId,createdOperatorId,screenshotDir}))
 await check('catalog_actual_version_terms_and_three_widths',async()=>{
  await page.goto(origin+'/catalog');const pending=wait('plan_version.list');await page.getByRole('tab',{name:'Versiones',exact:true}).click();const response=await pending,b=await response.json();if(response.status()!==200||!b.ok||!b.data.items.length)throw Error('CATALOG_REAL_VERSION_FIXTURE');const row=b.data.items[0],card=page.locator('[data-catalog-id="'+row.id+'"]');await expect(card).toBeVisible();const read=wait('plan_version.terms_get');await card.getByRole('button',{name:'Ver condiciones de versión',exact:true}).click();const termsResponse=await read,terms=await termsResponse.json();if(termsResponse.status()!==200||!terms.ok||terms.data.record.id!==row.id)throw Error('CATALOG_EXACT_SELECTED_VERSION');await expect(page.getByRole('dialog',{name:'Condiciones · versión '+terms.data.record.version_number,exact:true})).toBeVisible();if(terms.data.record.terms_status==='unrecorded')await expect(page.getByText('Las condiciones comerciales no están registradas en esta versión histórica.',{exact:true})).toBeVisible();else await expect(page.getByText('Cuota mensual',{exact:true})).toBeVisible()
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:960});await page.screenshot({path:resolve(screenshotDir,'catalog-selected-version-'+width+'.png'),fullPage:true});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('CATALOG_VERSION_OVERFLOW')}
  await page.getByRole('button',{name:'Cerrar panel',exact:true}).click()
 })
}

async function selectPublishedOperator(page,id){
 const filter=page.getByLabel('Operador del catálogo',{exact:true}),seen=new Set()
 for(let index=0;index<100;index++){
  await expect(filter).toBeEnabled()
  const values=await filter.locator('option').evaluateAll(options=>options.map(option=>option.value).filter(Boolean))
  if(values.includes(id)){
   await expect(filter.locator('option[value="'+id+'"]')).toHaveCount(1)
   await filter.selectOption(id);return
  }
  const signature=values.join(',')
  if(seen.has(signature))throw Error('CATALOG_OPERATOR_PAGING_STALLED')
  seen.add(signature)
  const more=page.getByRole('button',{name:'Más operadores',exact:true})
  if(await more.count()!==1||!await more.isEnabled())throw Error('CATALOG_TARGET_OPERATOR_NOT_AVAILABLE')
  await more.click()
 }
 throw Error('CATALOG_OPERATOR_PAGE_BOUND_REACHED')
}

export async function publishCatalogVersionBrowser({page,origin,createdPlanId,createdOperatorId,screenshotDir}){
  const wait=op=>page.waitForResponse(r=>{try{return r.request().method()==='POST'&&r.request().postDataJSON().operation===op}catch{return false}})
  async function receipt(pending){const r=await pending,b=await r.json();if(r.status()!==200||!b.ok)throw Error('CATALOG_CURRENT_COOKIE_COMMAND_FAILED');return b.data}
  const step=phase=>process.stdout.write(JSON.stringify({w2_catalog_publication_phase:phase})+'\n')
  if(!createdPlanId||!createdOperatorId)throw Error('CATALOG_CREATED_PLAN_REQUIRED')
  step('fresh_catalog_document')
  await page.setViewportSize({width:1440,height:960})
  await page.goto(origin+'/catalog')
  await page.getByRole('tab',{name:'Tarifas',exact:true}).click()
  step('created_operator_filter')
  await selectPublishedOperator(page,createdOperatorId)
  step('created_plan_publication')
  const card=page.locator('[data-catalog-id="'+createdPlanId+'"]')
  await expect(card).toBeVisible();await card.getByRole('button',{name:'Publicar nueva versión',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Nueva versión de W2 Catalog Synthetic Plan',exact:true})
  const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date())
  await dialog.getByLabel('Vigencia desde',{exact:true}).fill(day)
  await dialog.getByLabel('Cuota mensual',{exact:true}).fill('29,95')
  await dialog.getByLabel('Alta o instalación',{exact:true}).fill('0')
  await dialog.getByRole('button',{name:'Revisar versión',exact:true}).click()
  step('confirmed_publication_receipt_and_terms')
  const written=wait('plan_version.create'),read=wait('plan_version.terms_get')
  await dialog.getByRole('button',{name:'Confirmar publicación',exact:true}).click()
  const published=await receipt(written)
  if(published.status!=='published'||published.plan_id!==createdPlanId||published.version!==1||published.parent_version!==2||published.version_number!==1)throw Error('CATALOG_VERSION_CREATE_RECEIPT')
  const validate=async pending=>{
   const response=await pending,body=await response.json(),terms=body.data?.record
   if(response.status()!==200||body.ok!==true||terms?.id!==published.id||terms.plan_id!==createdPlanId||terms.version_number!==1||terms.terms_status!=='published'||terms.valid_from!==day||terms.valid_until!==null||terms.currency!=='EUR'||terms.recurring_period!=='month'||terms.recurring_amount_minor!=='2995'||terms.one_time_amount_minor!=='0'||terms.is_bundle!==false||terms.components.length!==1||terms.components[0].component_kind!=='base'||terms.components[0].service_kind!=='mobile'||terms.components[0].quantity!==1||terms.entitlements.length!==0)throw Error('CATALOG_PUBLISHED_TERMS_PERSISTENCE')
  }
  await validate(read)
  await expect(dialog.getByRole('status')).toContainText('Versión publicada y recuperada')
  step('reload_and_recover_same_version')
  await page.reload();await page.getByRole('tab',{name:'Versiones',exact:true}).click()
  await selectPublishedOperator(page,createdOperatorId)
  const fresh=page.locator('[data-catalog-id="'+published.id+'"]')
  await expect(fresh).toBeVisible()
  const recovered=wait('plan_version.terms_get')
  await fresh.getByRole('button',{name:'Ver condiciones de versión',exact:true}).click()
  step('reloaded_immutable_terms')
  await validate(recovered)
  await expect(page.getByRole('dialog',{name:'Condiciones · versión 1',exact:true})).toBeVisible()
  await page.screenshot({path:resolve(screenshotDir,'catalog-published-version-reloaded.png'),fullPage:true})
  await page.getByRole('button',{name:'Cerrar panel',exact:true}).click()
}
