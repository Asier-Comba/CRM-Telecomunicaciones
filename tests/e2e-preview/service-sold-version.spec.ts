import {expect,test} from '@playwright/test'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const versionId='70000000-0000-4000-8000-000000000001',operatorId='20000000-0000-4000-8000-000000000001',planId='80000000-0000-4000-8000-000000000001'
const header={id:versionId,plan_id:planId,operator_id:operatorId,service_kind:'mobile',version_number:1,valid_from:'2026-10-01',valid_until:null,currency:'EUR',recurring_amount_minor:'3000',plan_status:'active'}
const terms={id:versionId,plan_id:planId,version_number:1,terms_status:'published',currency:'EUR',recurring_period:'month',valid_from:'2026-10-01',valid_until:null,recurring_amount_minor:'3000',one_time_amount_minor:'500',is_bundle:false,components:[{position:1,component_kind:'base',service_kind:'mobile',addon_code:null,quantity:1}],entitlements:[]}
let fixture:Awaited<ReturnType<typeof startCommercialResourceFixture>>
test.beforeAll(async()=>{fixture=await startCommercialResourceFixture()});test.afterAll(async()=>{await fixture.close()})
for(const width of [390,768,1440])test(`service explicitly retains the sold version and frozen retry at ${width}`,async({page},info)=>{
 const commands:Record<string,unknown>[]=[],errors:string[]=[];let attempts=0
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(operation==='plan_version.get'){expect(input).toEqual({id:versionId});return route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,record:header}}})}
  if(operation==='plan_version.terms_get'){expect(input).toEqual({id:versionId});return route.fulfill({json:{ok:true,data:{contract_version:'catalog.v1',operation,record:terms}}})}
  if(operation==='service.create_manual'){
   commands.push(input);attempts++
   if(attempts===1)return route.abort('failed')
   return route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation,command_id:input.command_id,id:'90000000-0000-4000-8000-000000000001',version:1,status:'pending',source:'manual'}}})
  }
  return route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=service-create')
 const choice=page.getByRole('checkbox',{name:'Asignar al servicio la versión vendida del contrato',exact:true})
 await expect(choice).toBeEnabled();await expect(choice).not.toBeChecked()
 await expect(page.getByText('Cuota mensual: 30,00 EUR',{exact:true})).toBeVisible()
 await expect(page.getByText('Alta: 5,00 EUR',{exact:true})).toBeVisible()
 expect(commands).toEqual([])
 await page.getByLabel('Nombre del nuevo activo',{exact:true}).fill('Servicio sintético vendido');await choice.check()
 await page.screenshot({path:info.outputPath('sold-version-review-'+width+'.png')})
 await page.getByRole('button',{name:'Guardar activo manual',exact:true}).click()
 await expect(page.getByRole('button',{name:'Reintentar la misma acción',exact:true})).toBeEnabled()
 await expect(choice).toBeDisabled();await expect(choice).toBeChecked()
 await page.getByRole('button',{name:'Reintentar la misma acción',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('Servicio confirmado por el consumidor sintético')
 expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0])
 expect(commands[0]).toMatchObject({contract_id:'60000000-0000-4000-8000-000000000001',service_kind:'mobile',display_name:'Servicio sintético vendido',plan_version_id:versionId})
 expect(Object.keys(commands[0]).sort()).toEqual(['command_id','contract_id','display_name','plan_version_id','service_kind'])
 expect(errors).toEqual([]);await page.screenshot({path:info.outputPath('sold-service-'+width+'.png')})
})
for(const mode of ['unselected','without_version','family','viewer','denied_terms','unrecorded','mismatch','bundle','command_denied'] as const)test(`service version boundary: ${mode}`,async({page})=>{
 const commands:Record<string,unknown>[]=[],reads:string[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(operation==='plan_version.get'){reads.push(operation);return route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,record:{...header,...(mode==='mismatch'?{operator_id:'20000000-0000-4000-8000-000000000002'}:{})}}}})}
  if(operation==='plan_version.terms_get'){
   reads.push(operation)
   if(mode==='denied_terms')return route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
   return route.fulfill({json:{ok:true,data:{contract_version:'catalog.v1',operation,record:{...terms,...(mode==='unrecorded'?{terms_status:'unrecorded',recurring_period:null,recurring_amount_minor:null,one_time_amount_minor:null,is_bundle:null,components:[]}:{}),...(mode==='bundle'?{is_bundle:true,components:[terms.components[0],{...terms.components[0],position:2,service_kind:'fiber'}]}:{})}}}})
  }
  if(operation==='service.create_manual'){
   commands.push(input)
   if(mode==='command_denied')return route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
   return route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation,command_id:input.command_id,id:'90000000-0000-4000-8000-000000000001',version:1,status:'pending',source:'manual'}}})
  }
  return route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 await page.goto(fixture.url+'/?kind=service-create'+(mode==='without_version'?'&without_version=1':''))
 const choice=page.getByRole('checkbox',{name:'Asignar al servicio la versión vendida del contrato',exact:true}),save=page.getByRole('button',{name:'Guardar activo manual',exact:true})
 if(mode==='without_version'){await expect(page.getByText('El contrato no tiene una versión vendida.',{exact:false})).toBeVisible();expect(reads).toEqual([])}
 else if(['denied_terms','unrecorded','mismatch','bundle'].includes(mode)){await expect(page.getByRole('alert')).toBeVisible();await expect(choice).toHaveCount(0)}
 else await expect(choice).toBeEnabled()
 if(mode==='family'){
  await choice.check();await page.getByLabel('Familia de servicio',{exact:true}).selectOption('fiber')
  await expect(page.getByRole('alert')).toContainText('no es una tarifa publicada de un único servicio compatible');await expect(choice).toHaveCount(0)
 }
 await page.getByLabel('Nombre del nuevo activo',{exact:true}).fill('Servicio sintético sin inferencia')
 if(mode==='viewer'){
  // Fixture scope control is behind the modal; inject the role change, then test the real form guard.
  await page.getByRole('button',{name:'Cambiar a lector sintético',exact:true}).dispatchEvent('click');await expect(save).toBeDisabled();await expect(choice).toBeDisabled()
  await page.getByRole('dialog').locator('form').dispatchEvent('submit');await expect(page.getByRole('alert')).toHaveText('No tienes permiso para esta acción.');expect(commands).toEqual([])
 }else{
  if(mode==='command_denied')await choice.check()
  await save.click()
  if(mode==='command_denied'){await expect(page.getByRole('alert')).toHaveText('No tienes permiso para esta acción.');await expect(page.getByRole('status').filter({hasText:'Servicio confirmado'})).toHaveCount(0);expect(commands[0].plan_version_id).toBe(versionId)}
  else{await expect(page.getByRole('status')).toContainText('Servicio confirmado por el consumidor sintético');expect(commands).toHaveLength(1);expect(commands[0]).not.toHaveProperty('plan_version_id')}
 }
 expect(errors).toEqual([])
})
