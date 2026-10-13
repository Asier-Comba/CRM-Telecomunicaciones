import {expect,test,type Route} from '@playwright/test'
import {startPipelineCurrentFixture} from './fixtures/pipeline-current-server.cjs'
// Actual UI, repository and parsers with synthetic transport. No Auth/DB claim.
const opportunity='30000000-0000-4000-8000-000000000001',stage='20000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001'
const catalog=(label:string)=>({contract_version:'product.v1',items:[{id:stage,code:'new',display_name:label,position:0,outcome:null,status:'active'}],next_id:null})
const record={contract_version:'product.v1',kind:'opportunity',record:{id:opportunity,version:1,title:'Oportunidad sintética vigente',status:'open',customer_id:customer,stage_id:stage,owner_user_id:null,amount_minor:null,currency:null,next_follow_up_at:null,expected_close_date:null,next_action:null,source:'manual',links:[],history:[],history_partial:false}}
for(const width of [390,768,1440])test(`pipeline recovers failed stage catalogue without losing search or scope at ${width}`,async({page},info)=>{
 const fixture=await startPipelineCurrentFixture(),errors:string[]=[],commands:string[]=[]
 let calls=0,holdRetry=false
 const held:Route[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/product/v1/**',async route=>{
  const {operation}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'denied'}});return}
  if(operation==='opportunity.stages'){
   calls++
   if(calls===1){await route.fulfill({status:500,json:{ok:false,error:'internal_safe'}});return}
   if(holdRetry&&calls===2){held.push(route);return}
   await route.fulfill({json:{ok:true,data:catalog(calls===2?'Nueva vigente':'Etapa del contexto actual')}});return
  }
  if(operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'opportunity',id:opportunity,customer_id:customer,label:'Oportunidad sintética vigente',status:'open'}]}}});return}
  if(operation==='work.get'){await route.fulfill({json:{ok:true,data:record}});return}
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button',{name:'Nueva oportunidad',exact:true})).toBeDisabled()
  await page.getByRole('textbox',{name:'Consultar pipeline local'}).fill('Sintética')
  await page.getByRole('button',{name:'Consultar pipeline',exact:true}).click()
  await expect(page.locator(`[data-opportunity-id="${opportunity}"]`)).toBeVisible()
  await expect(page.getByRole('alert')).toBeVisible()
  const retry=page.getByRole('button',{name:'Reintentar etapas',exact:true})
  await retry.focus();await page.keyboard.press('Enter')
  await expect(page.getByRole('button',{name:'Nueva oportunidad',exact:true})).toBeEnabled()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('heading',{name:/Nueva vigente/})).toBeVisible()
  await expect(page.locator(`[data-opportunity-id="${opportunity}"]`)).toBeVisible()
  const capture=info.outputPath(`pipeline-catalog-recovered-${width}.png`)
  await page.screenshot({path:capture});await info.attach(`catalog-recovered-${width}`,{path:capture,contentType:'image/png'})
  // A late retry from the old context must not replace the new catalogue.
  calls=0;holdRetry=true
  await page.getByRole('button',{name:'Cambiar empresa sintética',exact:true}).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button',{name:'Reintentar etapas',exact:true}).click()
  await expect.poll(()=>held.length).toBe(1)
  await expect(page.getByRole('button',{name:'Reintentar etapas',exact:true})).toBeDisabled()
  expect(calls).toBe(2)
  await page.getByRole('button',{name:'Cambiar actor sintético',exact:true}).click()
  await expect(page.getByRole('button',{name:'Nueva oportunidad',exact:true})).toBeEnabled()
  const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='opportunity.stages'&&r.request().postDataJSON()?.input!==undefined)
  await held.shift()!.fulfill({json:{ok:true,data:catalog('Etapa obsoleta')}})
  await (await response).finished()
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  await page.getByRole('textbox',{name:'Consultar pipeline local'}).fill('Sintética')
  await page.getByRole('button',{name:'Consultar pipeline',exact:true}).click()
  await expect(page.getByRole('heading',{name:/Etapa del contexto actual/})).toBeVisible()
  await expect(page.getByText('Etapa obsoleta',{exact:true})).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  expect(errors).toEqual([]);expect(commands).toEqual([])
 }finally{for(const route of held)await route.abort().catch(()=>{});await page.unrouteAll({behavior:'wait'});await fixture.close()}
})
