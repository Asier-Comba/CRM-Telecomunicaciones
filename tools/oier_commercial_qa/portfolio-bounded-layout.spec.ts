import {expect,test,type Route} from '@playwright/test'
import {startCommercialResourceFixture} from '../../tests/e2e-preview/fixtures/commercial-resource-server.cjs'
import {portfolioBoundedLayout} from '../../scripts/security/supabase-local/product-portfolio-bounded-layout.mjs'

const id=(n:number)=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const customer='10000000-0000-4000-8000-000000000001',operator='20000000-0000-4000-8000-000000000001'
const record=(n:number)=>({id:id(n),version:1,status:'draft',source:'manual',customer_id:customer,operator_id:operator,plan_version_id:null,start_date:'2026-01-01',signed_date:null,end_date:null,assigned_user_id:null})
let fixture:Awaited<ReturnType<typeof startCommercialResourceFixture>>
test.beforeAll(async()=>{fixture=await startCommercialResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})

// Actual portfolio components/repository/parsers; controlled HTTP, not Auth/DB.
// No claim that these deliberately held responses occurred in the original CI.
for(const mode of ['dense_inventory','held_labels','delayed_search','denied_search','invalid_search'] as const){
 test(`original bounded actions separate transport and render: ${mode}`,async({page},info)=>{
  const report:Record<string,unknown>={},heldLabels:Route[]=[],heldSearch:Route[]=[],operations:string[]=[]
  const commands:string[]=[],errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.name))
  await page.route('**/api/**',async route=>{
   const {operation}=route.request().postDataJSON();operations.push(operation)
   if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   let data:unknown
   if(operation==='global.search'){
    if(mode==='delayed_search'){heldSearch.push(route);return}
    if(mode==='denied_search'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
    data=mode==='invalid_search'?{contract_version:'product.v1',items:'INVALID'}:{contract_version:'product.v1',items:[{kind:'contract',id:id(1),customer_id:customer,label:'W2 UI Synthetic Contract',status:'draft'}]}
   }else if(operation==='portfolio.get')data={contract_version:'portfolio.v1',kind:'contract',record:record(1)}
   else if(operation==='contract.list')data={contract_version:'telecom.collections.v1',operation,items:Array.from({length:20},(_,n)=>{const {signed_date,...row}=record(n+1);void signed_date;return row}),next_id:null}
   else if(operation==='customer.list'){
    if(mode==='held_labels'){heldLabels.push(route);return}
    data={contract_version:'telecom.collections.v1',operation,items:[{id:customer,version:1,display_name:'W2 UI Synthetic Customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}
   }else if(operation==='operator.get'){
    if(mode==='held_labels'){heldLabels.push(route);return}
    data={contract_version:'telecom.collections.v1',operation,record:{id:operator,version:1,display_name:'Synthetic operator',code:'synthetic_operator',status:'active',source:'manual'}}
   }else if(operation==='import.list')data={contract_version:'import.v1',operation,items:[],next_id:null}
   else{await route.fulfill({status:400,json:{ok:false,error:'validation'}});return}
   await route.fulfill({json:{ok:true,data}})
  })
  try{
   await page.goto(fixture.url+'/?kind=portfolio')
   await expect(page.getByRole('heading',{name:'Cartera Telecom',exact:true})).toBeVisible()
   await expect(page.locator('article[data-domain-id]')).toHaveCount(20)
   if(mode==='held_labels')await expect.poll(()=>heldLabels.length).toBeGreaterThan(0)
   // The existing passive observer requires the exact native /portfolio URL.
   await page.evaluate(()=>history.replaceState({},'', '/portfolio'))
   const pending=portfolioBoundedLayout({page,expect,origin:fixture.url,width:info.project.use.viewport!.width,expectedContractId:id(1),report})
   if(mode==='delayed_search'){
    await expect.poll(()=>heldSearch.length).toBe(1)
    await expect(page.getByRole('button',{name:'Consultar cartera',exact:true})).toBeDisabled()
    await heldSearch[0].fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'contract',id:id(1),customer_id:customer,label:'W2 UI Synthetic Contract',status:'draft'}]}}})
   }
   await pending
   const observations=report.w2_portfolio_bounded_layout_observations as {completed:boolean;phase:string;transport:{rows:{kind:string;status:string;dto:string}[]};render_acceptance:string}[]
   expect(observations).toHaveLength(1);expect(observations[0].completed).toBe(true)
   expect(observations[0].phase).toBe('button_enabled')
   expect(observations[0].render_acceptance).toBe('NOT_MEASURED_BUTTON_ENABLED_IS_NOT_RESULT_READBACK')
   if(mode==='denied_search'||mode==='invalid_search'){
    await expect(page.getByRole('alert').filter({hasText:mode==='denied_search'?'No tienes permiso':'No se pudo completar'})).toBeVisible()
    await expect(page.locator('article[data-portfolio-id]')).toHaveCount(0)
   }else{
    await expect(page.locator(`article[data-portfolio-id="${id(1)}"]`)).toBeVisible()
    await expect(page.locator(`article[data-portfolio-id="${id(1)}"]`)).toContainText('W2 UI Synthetic Contract')
   }
   expect(operations.filter(op=>op==='global.search')).toHaveLength(1)
   expect(commands).toEqual([]);expect(errors).toEqual([])
   const serialized=JSON.stringify(report)
   for(const value of [customer,operator,id(1),'W2 UI',fixture.url,'cookie','Authorization'])expect(serialized).not.toContain(value)
   await info.attach('bounded-phases.safe.json',{body:JSON.stringify(report,null,2),contentType:'application/json'})
   if(mode==='dense_inventory')await page.screenshot({path:info.outputPath('loaded-bounded-search.png')})
  }finally{
   for(const route of heldLabels)await route.abort().catch(()=>{})
  }
 })
}
