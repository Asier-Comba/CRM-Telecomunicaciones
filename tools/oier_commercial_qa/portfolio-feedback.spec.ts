import {expect,test,type Route} from '@playwright/test'
import {startCommercialResourceFixture} from '../../tests/e2e-preview/fixtures/commercial-resource-server.cjs'

const id='60000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001'
const search={contract_version:'product.v1',items:[{kind:'contract',id,customer_id:customer,label:'Synthetic search result',status:'draft'}]}
const record={id,version:1,status:'draft',source:'manual',customer_id:customer,operator_id:'20000000-0000-4000-8000-000000000001',plan_version_id:null,start_date:'2026-01-01',signed_date:null,end_date:null,assigned_user_id:null}
let fixture:Awaited<ReturnType<typeof startCommercialResourceFixture>>
test.beforeAll(async()=>{fixture=await startCommercialResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})

for(const mode of ['pending_to_success','pending_to_denial','retry_after_denial'] as const)test(`portfolio search announces ${mode} without claiming saved data`,async({page},info)=>{
 const held:Route[]=[],commands:string[]=[]
 await page.route('**/api/**',async route=>{
  const {operation}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='global.search'){held.push(route);return}
  let data:unknown
  if(operation==='portfolio.get')data={contract_version:'portfolio.v1',kind:'contract',record}
  else if(operation==='contract.list')data={contract_version:'telecom.collections.v1',operation,items:[],next_id:null}
  else{await route.fulfill({status:400,json:{ok:false,error:'validation'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.goto(fixture.url+'/?kind=portfolio')
  const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Consulta rápida y edición de activos',exact:true})})
  await section.getByLabel('Consultar cartera local',{exact:true}).fill('Synthetic')
  await section.getByRole('button',{name:'Consultar cartera',exact:true}).click()
  await expect.poll(()=>held.length).toBe(1)
  await expect(section.getByRole('status').filter({hasText:'Consultando la cartera…'})).toBeVisible()
  await expect(section.getByRole('region',{name:'Resultados de la consulta de cartera',exact:true})).toHaveAttribute('aria-busy','true')
  await expect(section.getByRole('button',{name:'Consultar cartera',exact:true})).toBeDisabled()
  await expect(section.getByText('Consulta un cliente o activo para ver sus resultados.',{exact:true})).toHaveCount(0)
  if(mode==='pending_to_success'){
   await held[0].fulfill({json:{ok:true,data:search}})
   await expect(section.locator(`article[data-portfolio-id="${id}"]`)).toContainText('Synthetic search result')
  }else{
   await held[0].fulfill({status:403,json:{ok:false,error:'access_denied'}})
   await expect(section.getByRole('alert')).toHaveText('No tienes permiso para esta acción.')
   await expect(section.getByRole('region',{name:'Resultados de la consulta de cartera',exact:true})).toHaveAttribute('aria-busy','false')
   await expect(section.getByRole('status').filter({hasText:'Consultando la cartera…'})).toHaveCount(0)
   if(mode==='retry_after_denial'){
    await section.getByRole('button',{name:'Consultar cartera',exact:true}).click()
    await expect.poll(()=>held.length).toBe(2)
    await expect(section.getByRole('status').filter({hasText:'Consultando la cartera…'})).toBeVisible()
    await expect(section.getByRole('alert')).toHaveCount(0)
    await held[1].fulfill({json:{ok:true,data:search}})
    await expect(section.locator(`article[data-portfolio-id="${id}"]`)).toContainText('Synthetic search result')
   }
  }
  await expect(section.getByRole('region',{name:'Resultados de la consulta de cartera',exact:true})).toHaveAttribute('aria-busy','false')
  await expect(section.getByRole('status').filter({hasText:'Consultando la cartera…'})).toHaveCount(0)
  await expect(section.getByRole('button',{name:'Consultar cartera',exact:true})).toBeEnabled()
  await expect(section.getByLabel('Consultar cartera local',{exact:true})).toHaveValue('Synthetic')
  expect(held).toHaveLength(mode==='retry_after_denial'?2:1);expect(commands).toEqual([])
  await section.scrollIntoViewIfNeeded()
  await page.screenshot({path:info.outputPath('settled-search.png')})
 }finally{for(const route of held)await route.abort().catch(()=>{})}
})
