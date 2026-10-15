import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const parent='60000000-0000-4000-8000-000000000001',created='70000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',operator='20000000-0000-4000-8000-000000000001'
for(const kind of ['contract','service','line','renewal','permanence'] as const)for(const mode of ['invalid_receipt','lost_receipt','denied'] as const)for(const width of [390,768,1440])test('portfolio create '+kind+' '+mode+' exact recovery at '+width,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),commands:{operation:string;input:Record<string,unknown>}[]=[],effects=new Set<string>(),errors:string[]=[]
 const parentKind=kind==='line'?'service':'contract',operation=kind==='renewal'?'contract.record_renewal':kind+'.create_manual'
 const base={version:1,source:'manual'}
 const contractRecord={...base,id:parent,status:'draft',customer_id:customer,operator_id:operator,plan_version_id:null,start_date:'2026-10-01',signed_date:null,end_date:null,assigned_user_id:null}
 const parentRecord=parentKind==='contract'?contractRecord:{...base,id:parent,status:'pending',customer_id:customer,contract_id:'80000000-0000-4000-8000-000000000001',operator_id:operator,plan_version_id:null,service_kind:'mobile',display_name:'Servicio padre sintético',activated_on:null,ended_on:null,status_effective_on:null}
 const createdRecord=kind==='contract'?{...contractRecord,id:created,start_date:'2026-10-15'}:kind==='service'?{...base,id:created,status:'pending',customer_id:customer,contract_id:parent,operator_id:operator,plan_version_id:null,service_kind:'mobile',display_name:'Activo sintético incierto',activated_on:null,ended_on:null,status_effective_on:null}:kind==='line'?{...base,id:created,status:'pending',service_id:parent,display_name:'Activo sintético incierto',activated_on:null,ended_on:null,status_effective_on:null}:kind==='renewal'?{...base,id:created,status:'open',contract_id:parent,target_on:'2026-11-01',opens_on:null,closes_on:null,reason_code:null}:{...base,id:created,status:'open',contract_id:parent,service_id:null,commitment_kind:'minimum_term',starts_on:'2026-10-01',ends_on:'2027-10-01',reason_code:'manual_record'}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation===operation){
   commands.push(q)
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   effects.add(q.input.command_id)
   if(mode==='lost_receipt'&&commands.length===1){await route.abort('failed');return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation,command_id:q.input.command_id,id:created,version:mode==='invalid_receipt'&&commands.length===1?0:1,status:createdRecord.status,source:'manual'}}});return
  }
  if(q.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:customer,customer_id:customer,label:'Cliente sintético de recuperación',status:'active'},{kind:'contract',id:parent,customer_id:customer,label:'Contrato de Cliente sintético',status:'draft'}]}}});return}
  if(q.operation==='portfolio.get'){await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:q.input.id===created?kind:parentKind,record:q.input.id===created?createdRecord:parentRecord}}});return}
  if(['customer.list','contract.list','service.list','line.list','assignee.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portfolio'+(kind==='contract'?'':'&portfolio_reference='+parent+'&portfolio_kind='+parentKind))
  if(kind==='contract'){
   await page.getByRole('textbox',{name:'Consultar cartera local',exact:true}).fill('Cliente sintético')
   await page.getByRole('button',{name:'Consultar cartera',exact:true}).click()
   await page.getByRole('button',{name:'Nuevo contrato manual',exact:true}).click()
  }else{
   await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Cerrar panel',exact:true}).click()
   await page.locator('article[data-portfolio-id="'+parent+'"]').getByRole('button',{name:kind==='line'?'Añadir línea':'Añadir servicio o plazo',exact:true}).click()
  }
  const dialog=page.getByRole('dialog',{name:'Registrar activo manual',exact:true})
  if(kind==='contract'){
   await dialog.getByLabel('Tipo de registro',{exact:true}).selectOption('contract')
   await expect(dialog.getByLabel('Cliente del contrato',{exact:true})).toHaveValue(customer)
   await dialog.getByLabel('Fecha de inicio',{exact:true}).fill('2026-10-15')
  }else if(kind==='renewal'){
   await dialog.getByLabel('Tipo de registro',{exact:true}).selectOption('renewal');await dialog.getByLabel('Fecha de vencimiento',{exact:true}).fill('2026-11-01')
  }else if(kind==='permanence'){
   await dialog.getByLabel('Tipo de registro',{exact:true}).selectOption('permanence');await dialog.getByLabel('Fecha de inicio',{exact:true}).fill('2026-10-01');await dialog.getByLabel('Fecha de vencimiento',{exact:true}).fill('2027-10-01')
  }else await dialog.getByLabel('Nombre del nuevo activo',{exact:true}).fill('Activo sintético incierto')
  await dialog.getByRole('button',{name:'Guardar activo manual',exact:true}).click()
  await expect(dialog.getByRole('alert')).toHaveText(mode==='invalid_receipt'?'No se pudo completar la acción.':mode==='lost_receipt'?'No se pudo confirmar el resultado. Reintenta la misma acción para comprobarlo.':'No tienes permiso para esta acción.')
  const close=dialog.getByRole('button',{name:'Cerrar panel',exact:true})
  if(mode==='denied'){
   await expect(close).toBeEnabled();await close.click();await expect(dialog).toHaveCount(0);expect(commands).toHaveLength(1);expect(effects.size).toBe(0)
  }else{
   await expect(close).toBeDisabled();await close.evaluate((button:HTMLButtonElement)=>button.click());await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
   await expect(dialog.getByLabel('Tipo de registro',{exact:true})).toBeDisabled()
   const retry=dialog.getByRole('button',{name:'Reintentar la misma acción',exact:true});await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1})
   await page.screenshot({path:info.outputPath('portfolio-invalid-'+kind+'-'+mode+'-'+width+'.png')});await retry.click()
   await expect(dialog).toHaveCount(0);expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);expect(effects.size).toBe(1)
   await expect(page.locator('article[data-portfolio-id="'+created+'"]')).toBeVisible()
  }
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({kind,mode,width,commands,synthetic_effect_ids:[...effects],errors},null,2));await page.close();await fixture.close()}
})
