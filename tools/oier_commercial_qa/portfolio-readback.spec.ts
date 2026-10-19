import {expect,test} from '@playwright/test'
import {startCommercialResourceFixture} from '../../tests/e2e-preview/fixtures/commercial-resource-server.cjs'

const id='60000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001'
const record={id,version:1,status:'draft',source:'manual',customer_id:customer,operator_id:'20000000-0000-4000-8000-000000000001',plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}
let fixture:Awaited<ReturnType<typeof startCommercialResourceFixture>>
test.beforeAll(async()=>{fixture=await startCommercialResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['stale','wrong_status','wrong_source','confirmed','newer'] as const)test(`portfolio confirmed command requires coherent ${mode} readback`,async({page},info)=>{
 const commands:{operation:string;input:{command_id:string}}[]=[],errors:string[]=[]
 let applied=false,corrected=false,readbacks=0
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const body=route.request().postDataJSON(),{operation,input}=body
  if(route.request().url().endsWith('/commands')){
   commands.push(body);applied=true
   await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation,command_id:input.command_id,id,version:2,status:'active',source:'manual'}}});return
  }
  if(operation==='portfolio.get'){
   if(applied)readbacks++
   const current=!applied||!corrected&&mode==='stale'?record:{...record,version:mode==='newer'?3:2,status:!corrected&&mode==='wrong_status'?'draft':mode==='newer'?'cancelled':'active',source:!corrected&&mode==='wrong_source'?'integration':'manual'}
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record:current}}});return
  }
  if(operation==='customer.list'){
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[{id:customer,version:1,display_name:'Synthetic linked customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return
  }
  if(['contract.list','service.list','line.list','assignee.list'].includes(operation)){
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return
  }
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 try{
  await page.goto(fixture.url+'/?kind=portfolio&portfolio_reference='+id)
  const drawer=page.getByRole('dialog',{name:'Contrato: Contrato',exact:true})
  await expect(drawer).toBeVisible()
  await drawer.getByRole('button',{name:'Activar contrato',exact:true}).click()
  const confirm=page.getByRole('dialog',{name:'Confirmar cambio de cartera',exact:true})
  await confirm.getByRole('button',{name:'Confirmar',exact:true}).click()
  await expect.poll(()=>readbacks).toBe(1)
  if(['stale','wrong_status','wrong_source'].includes(mode)){
   // Observe both outcomes without waiting for a drawer that baseline wrongly closes.
   await expect.poll(async()=>await drawer.count()===0||await drawer.getByRole('button',{name:'Consultar el cambio registrado',exact:true}).count()>0).toBe(true)
   await info.attach('readback-observation',{body:JSON.stringify({mode,commands,readbacks,drawerCount:await drawer.count()}),contentType:'application/json'})
   await expect(drawer).toBeVisible()
   await expect(confirm).toHaveCount(0)
   await expect(drawer.getByRole('status').filter({hasText:'El cambio está registrado. Consulta el activo para confirmar sus datos actuales.'})).toBeVisible()
   await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).click()
   await expect(drawer).toBeVisible()
   const notice=drawer.getByRole('status').filter({hasText:'El cambio está registrado. Consulta el activo para confirmar sus datos actuales.'})
   await notice.scrollIntoViewIfNeeded()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
   await page.screenshot({path:info.outputPath(`portfolio-${mode}-registered.png`)})
   corrected=true
   await drawer.getByRole('button',{name:'Consultar el cambio registrado',exact:true}).click()
   await expect.poll(()=>readbacks).toBe(2)
  }
  await expect(drawer).toHaveCount(0)
  const card=page.locator(`article[data-portfolio-id="${id}"]`)
  await expect(card.getByText(mode==='newer'?'Cancelado':'Activo',{exact:true})).toBeVisible()
  expect(commands.map(c=>c.operation)).toEqual(['contract.activate']);expect(errors).toEqual([])
  await page.screenshot({path:info.outputPath(`portfolio-${mode}.png`)})
 }finally{await page.unrouteAll({behavior:'wait'})}
})
