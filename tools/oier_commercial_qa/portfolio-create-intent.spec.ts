import {expect,test} from '@playwright/test'
import {startCommercialResourceFixture} from '../../tests/e2e-preview/fixtures/commercial-resource-server.cjs'
const contract='60000000-0000-4000-8000-000000000001',service='40000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001'
const parent={id:contract,version:1,status:'active',source:'manual',customer_id:customer,operator_id:'20000000-0000-4000-8000-000000000001',plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}
const child={id:service,version:1,status:'pending',source:'manual',customer_id:customer,contract_id:contract,operator_id:parent.operator_id,plan_version_id:null,service_kind:'mobile',display_name:'Reviewed manual service',activated_on:null,ended_on:null,status_effective_on:null}
let fixture:Awaited<ReturnType<typeof startCommercialResourceFixture>>
test.beforeAll(async()=>{fixture=await startCommercialResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['transport','malformed','wrong_receipt','read_failure','success'] as const)test(`manual service creation preserves intent and receipt after ${mode}`,async({page},info)=>{
 const commands:{operation:string;input:{command_id:string}}[]=[],errors:string[]=[]
 let reads=0,permitRead=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){
   commands.push(q)
   if(commands.length===1){
    if(mode==='transport'){await route.abort('failed');return}
    if(mode==='malformed'){await route.fulfill({status:200,contentType:'application/json',body:'{'});return}
   }
   await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation:q.operation,command_id:commands.length===1&&mode==='wrong_receipt'?'70000000-0000-4000-8000-000000000009':q.input.command_id,id:service,version:1,status:'pending',source:'manual'}}});return
  }
  if(q.operation==='portfolio.get'){
   if(q.input.kind==='service'){
    reads++
    if(mode==='read_failure'&&!permitRead){await route.fulfill({status:503,json:{ok:false,error:'unavailable'}});return}
    await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'service',record:child}}});return
   }
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record:parent}}});return
  }
  if(q.operation==='customer.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:customer,version:1,display_name:'Synthetic service customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  if(['contract.list','service.list','line.list','assignee.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.goto(fixture.url+'/?kind=portfolio&portfolio_reference='+contract)
  await page.getByRole('dialog',{name:'Contrato: Contrato',exact:true}).getByRole('button',{name:'Cerrar panel',exact:true}).click()
  await page.locator(`article[data-portfolio-id="${contract}"]`).getByRole('button',{name:'Añadir servicio o plazo',exact:true}).click()
  const drawer=page.getByRole('dialog',{name:'Registrar activo manual',exact:true}),name=drawer.getByLabel('Nombre del nuevo activo',{exact:true})
  await name.fill(child.display_name)
  await drawer.getByRole('button',{name:'Guardar activo manual',exact:true}).click()
  await expect.poll(()=>commands.length).toBe(1)
  if(mode!=='success'){
   await expect(drawer.getByRole('alert')).toBeVisible()
   if(mode==='read_failure')await expect(drawer.getByRole('button',{name:'Consultar el alta registrada',exact:true})).toBeVisible()
   await info.attach('creation-observation',{body:JSON.stringify({mode,commands,reads}),contentType:'application/json'})
   await expect(name).toBeDisabled()
   await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).click({force:true});await expect(drawer).toBeVisible()
   await page.keyboard.press('Escape');await expect(drawer).toBeVisible()
   await drawer.getByRole('alert').scrollIntoViewIfNeeded()
   await page.screenshot({path:info.outputPath(`service-create-${mode}-pending.png`)})
   permitRead=true
   await drawer.getByRole('button',{name:mode==='read_failure'?'Consultar el alta registrada':'Reintentar la misma acción',exact:true}).click()
   if(mode==='read_failure')await expect.poll(()=>reads).toBe(2)
   else{await expect.poll(()=>commands.length).toBe(2);expect(commands[1]).toEqual(commands[0])}
  }
  await expect(drawer).toHaveCount(0)
  const card=page.locator(`article[data-portfolio-id="${service}"]`)
  await expect(card.getByRole('heading',{name:child.display_name,exact:true})).toBeVisible()
  expect(commands.map(c=>c.operation)).toEqual(Array(mode==='success'||mode==='read_failure'?1:2).fill('service.create_manual'))
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await card.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`service-create-${mode}-current.png`)})
 }finally{await page.close()}
})
