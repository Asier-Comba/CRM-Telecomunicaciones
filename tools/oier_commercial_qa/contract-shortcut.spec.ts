import {expect,test} from '@playwright/test'
import {startCommercialResourceFixture} from '../../tests/e2e-preview/fixtures/commercial-resource-server.cjs'
const parentId='60000000-0000-4000-8000-000000000001',createdId='70000000-0000-4000-8000-000000000002',customer='10000000-0000-4000-8000-000000000001'
const parent={id:parentId,version:1,status:'active',source:'manual',customer_id:customer,operator_id:'20000000-0000-4000-8000-000000000001',plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}
const created={...parent,id:createdId,status:'draft',start_date:'2026-10-20',signed_date:null}
let fixture:Awaited<ReturnType<typeof startCommercialResourceFixture>>
test.beforeAll(async()=>{fixture=await startCommercialResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['shortcut','manual_selection'] as const)test(`new manual contract follows the ${mode} intent`,async({page},info)=>{
 const commands:{operation:string;input:{command_id:string;customer_id:string;operator_id:string;start_date:string}}[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){
   commands.push(q)
   await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation:q.operation,command_id:q.input.command_id,id:createdId,version:1,status:'draft',source:'manual'}}});return
  }
  if(q.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:customer,customer_id:customer,label:'Synthetic new contract customer',status:'active'},{kind:'contract',id:parentId,customer_id:customer,label:'Synthetic parent contract',status:'active'}]}}});return}
  if(q.operation==='portfolio.get'){await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record:q.input.id===createdId?created:parent}}});return}
  if(['contract.list','service.list','line.list','assignee.list','customer.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.goto(fixture.url+'/?kind=portfolio')
  await page.getByRole('textbox',{name:'Consultar cartera local',exact:true}).fill('Synthetic')
  await page.getByRole('button',{name:'Consultar cartera',exact:true}).click()
  const shortcut=page.getByRole('button',{name:'Nuevo contrato manual',exact:true})
  await expect(shortcut).toBeVisible()
  if(mode==='shortcut')await shortcut.click()
  else await page.locator(`article[data-portfolio-id="${parentId}"]`).getByRole('button',{name:'Añadir servicio o plazo',exact:true}).click()
  const drawer=page.getByRole('dialog'),kind=drawer.getByRole('combobox',{name:'Tipo de registro',exact:true})
  await expect(drawer).toHaveCount(1)
  if(mode==='manual_selection')await kind.selectOption('contract')
  await info.attach('creation-kind-observation',{body:JSON.stringify({mode,selectedKind:await kind.inputValue(),commands}),contentType:'application/json'})
  await expect(kind).toHaveValue('contract')
  await expect(drawer.getByRole('combobox',{name:'Cliente del contrato',exact:true})).toHaveValue(customer)
  await expect(drawer.getByLabel('Nombre del nuevo activo',{exact:true})).toHaveCount(0)
  await drawer.getByLabel('Fecha de inicio',{exact:true}).fill(created.start_date)
  await drawer.getByRole('button',{name:/^Guardar (activo|contrato) manual$/}).click()
  await expect(drawer).toHaveCount(0)
  await expect(page.locator(`article[data-portfolio-id="${createdId}"]`)).toBeVisible()
  expect(commands).toHaveLength(1);expect(commands[0].operation).toBe('contract.create_manual')
  expect(commands[0].input).toEqual({command_id:expect.any(String),customer_id:customer,operator_id:parent.operator_id,start_date:created.start_date})
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.locator(`article[data-portfolio-id="${createdId}"]`).scrollIntoViewIfNeeded()
  await page.screenshot({path:info.outputPath(`contract-${mode}-registered.png`)})
 }finally{await page.close()}
})
