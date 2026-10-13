import {expect,test,type Route} from '@playwright/test'
import {startPipelineCurrentFixture} from './fixtures/pipeline-current-server.cjs'
// Actual component/repository/parsers with controlled responses. No Auth/DB claim.
const customer='10000000-0000-4000-8000-000000000001',stage='20000000-0000-4000-8000-000000000001'
const ids={Alpha:'30000000-0000-4000-8000-000000000001',Beta:'30000000-0000-4000-8000-000000000002',Gamma:'30000000-0000-4000-8000-000000000003'}
type Name=keyof typeof ids
function search(name:Name){return {contract_version:'product.v1',items:[{kind:'customer',id:customer,customer_id:customer,label:`Synthetic ${name} customer`,status:'active'},{kind:'opportunity',id:ids[name],customer_id:customer,label:`Synthetic ${name} opportunity`,status:'open'}]}}
function work(name:Name){return {contract_version:'product.v1',kind:'opportunity',record:{id:ids[name],version:1,title:`Synthetic ${name} opportunity`,status:'open',customer_id:customer,stage_id:stage,owner_user_id:null,amount_minor:10000,currency:'EUR',next_follow_up_at:null,expected_close_date:null,next_action:null,source:'manual',links:[],history:[],history_partial:false}}}
async function reply(route:Route,data:unknown){await route.fulfill({json:{ok:true,data}})}
for(const width of [390,768,1440])test(`pipeline occupied stage is reachable before eleven empty stages at ${width}`,async({page},info)=>{
 const fixture=await startPipelineCurrentFixture(),errors:string[]=[],commands:string[]=[]
 let catalogMissingOccupied=false
 page.on('pageerror',e=>errors.push(e.message))
 const emptyStages=Array.from({length:11},(_,i)=>({id:`20000000-0000-4000-8000-${String(i+10).padStart(12,'0')}`,code:`empty_${i}`,display_name:`Etapa vacía ${i+1}`,position:i,outcome:null,status:'active'}))
 await page.route('**/api/product/v1/**',async route=>{
  const {operation}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'denied'}});return}
  if(operation==='opportunity.stages'){await reply(route,{contract_version:'product.v1',items:[...emptyStages,...(catalogMissingOccupied?[]:[{id:stage,code:'new',display_name:'Nueva',position:11,outcome:null,status:'active'}])].sort((a,b)=>a.id.localeCompare(b.id)),next_id:null});return}
  if(operation==='global.search'){await reply(route,search('Alpha'));return}
  if(operation==='work.get'){await reply(route,work('Alpha'));return}
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  await expect(page.getByRole('button',{name:'Nueva oportunidad',exact:true})).toBeEnabled()
  await page.getByRole('textbox',{name:'Consultar pipeline local'}).fill('Alpha');await page.getByRole('button',{name:'Consultar pipeline',exact:true}).click()
  const card=page.locator(`[data-opportunity-id="${ids.Alpha}"]`);await expect(card).toBeVisible()
  const visibleFraction=await card.evaluate(el=>{const r=el.getBoundingClientRect();return Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,64))/r.height})
  await page.screenshot({path:info.outputPath(`pipeline-occupied-first-${width}.png`)})
  expect(visibleFraction).toBeGreaterThanOrEqual(.6)
  if(width<768){
   const summary=page.getByRole('button',{name:'Mostrar resumen del pipeline',exact:true});await expect(summary).toHaveAttribute('aria-expanded','false')
   await expect(page.getByText('Etapas publicadas',{exact:true})).toBeHidden();await summary.focus();await page.keyboard.press('Enter')
   await expect(page.getByText('Etapas publicadas',{exact:true})).toBeVisible();const hide=page.getByRole('button',{name:'Ocultar resumen del pipeline',exact:true});await expect(hide).toBeFocused();await page.keyboard.press('Space');await expect(summary).toBeFocused()
  }else await expect(page.getByText('Etapas publicadas',{exact:true})).toBeVisible()
  await expect(page.locator('[data-stage-id]')).toHaveCount(1)
  const toggle=page.getByRole('button',{name:'Mostrar etapas vacías (11)',exact:true});await expect(toggle).toHaveAttribute('aria-expanded','false')
  await expect(page.getByRole('combobox',{name:'Mover etapa de Synthetic Alpha opportunity'}).locator('option')).toHaveCount(12)
  await toggle.focus();await page.keyboard.press('Enter');await expect(page.locator('[data-stage-id]')).toHaveCount(12)
  const collapse=page.getByRole('button',{name:'Ocultar etapas vacías (11)',exact:true});await expect(collapse).toBeFocused();await expect(collapse).toHaveAttribute('aria-expanded','true')
  await page.keyboard.press('Space');await expect(page.locator('[data-stage-id]')).toHaveCount(1);await expect(toggle).toBeFocused()
  await page.getByRole('textbox',{name:'Buscar oportunidades'}).fill('Sin coincidencias');await expect(page.locator('[data-stage-id]')).toHaveCount(0)
  await expect(page.getByText('No hay resultados con estos filtros.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Mostrar etapas vacías (12)',exact:true})).toBeVisible()
  await page.getByRole('textbox',{name:'Buscar oportunidades'}).fill('');await expect(card).toBeVisible();await expect(page.locator('[data-stage-id]')).toHaveCount(1)
  catalogMissingOccupied=true;await page.getByRole('button',{name:'Cambiar empresa sintética',exact:true}).click()
  await page.getByRole('textbox',{name:'Consultar pipeline local'}).fill('Alpha');await page.getByRole('button',{name:'Consultar pipeline',exact:true}).click()
  await expect(card).toBeVisible();await expect(page.getByRole('heading',{name:/Etapa no disponible/})).toBeVisible();await expect(page.locator('[data-stage-id]')).toHaveCount(1)
  const summaryMissing=page.getByRole('button',{name:'Mostrar resumen del pipeline',exact:true});if(width<768)await summaryMissing.click()
  await expect(page.getByText('Etapas publicadas',{exact:true}).locator('..')).toContainText('11')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  expect(errors).toEqual([]);expect(commands).toEqual([])
 }finally{await fixture.close()}
})
for(const width of [390,768,1440])test(`pipeline keeps only the current query after delayed search/detail/error at ${width}`,async({page},info)=>{
 const fixture=await startPipelineCurrentFixture(),errors:string[]=[],commands:string[]=[],held:Route[]=[]
 let holdSearch=false,holdWork=false,holdLatest=false,holdSelection=false
 let staleDetail:Route|null=null
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/product/v1/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'denied'}});return}
  if(operation==='opportunity.stages'){await reply(route,{contract_version:'product.v1',items:[{id:stage,code:'new',display_name:'Nueva',position:0,outcome:null,status:'active'}],next_id:null});return}
  if(operation==='global.search'){if(holdSearch&&input.query==='Alpha'||holdLatest&&input.query==='Beta'){held.push(route);return}await reply(route,search(input.query as Name));return}
  if(operation==='work.get'){const name=(Object.keys(ids) as Name[]).find(n=>ids[n]===input.id)!;if(holdWork&&name==='Alpha'||holdSelection&&name==='Gamma'){held.push(route);return}await reply(route,work(name));return}
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  await expect(page.getByRole('button',{name:'Nueva oportunidad',exact:true})).toBeEnabled()
  await expect(page.getByRole('status').filter({hasText:'Escribe una empresa'})).toBeVisible()
  await expect(page.getByText('No hay resultados con estos filtros.',{exact:true})).toHaveCount(0)
  const input=page.getByRole('textbox',{name:'Consultar pipeline local'}),submit=page.getByRole('button',{name:'Consultar pipeline',exact:true})
  holdSearch=true;await input.fill('Alpha');await submit.click();await expect.poll(()=>held.length).toBe(1)
  await input.fill('Beta');await reply(held.shift()!,search('Alpha'))
  // Wait for the actual old response and any follow-up, then assert the visible state.
  await expect(page.getByRole('status').filter({hasText:'Consulta pendiente'})).toBeVisible()
  await expect(page.locator('[data-opportunity-id]')).toHaveCount(0)
  await expect(submit).toBeEnabled();await submit.click()
  await expect(page.locator(`[data-opportunity-id="${ids.Beta}"]`)).toBeVisible()
  await expect(page.getByText('Synthetic Beta customer',{exact:true})).toBeVisible()
  holdSearch=false;holdWork=true;await input.fill('Alpha');await submit.click();await expect.poll(()=>held.length).toBe(1)
  staleDetail=held.shift()!
  expect(staleDetail.request().postDataJSON().operation).toBe('work.get')
  expect(staleDetail.request().postDataJSON().input.id).toBe(ids.Alpha)
  await input.fill('Gamma');await submit.click();await expect(page.locator(`[data-opportunity-id="${ids.Gamma}"]`)).toBeVisible()
  // The retained work DTO belongs to the previous query. Scope controls must
  // await their own search request, not count/pop that earlier detail as theirs.
  holdWork=false;holdSearch=true
  for(const button of ['Cambiar actor sintético','Cambiar a lector sintético']){
   await input.fill('Alpha');await submit.click();await expect.poll(()=>held.length).toBe(1)
   const staleSearch=held.shift()!
   expect(staleSearch.request().postDataJSON().operation).toBe('global.search')
   expect(staleSearch.request().postDataJSON().input.query).toBe('Alpha')
   const response=page.waitForResponse(r=>r.request()===staleSearch.request())
   await page.getByRole('button',{name:button,exact:true}).click();await reply(staleSearch,search('Alpha'));await (await response).finished()
   await expect(page.getByRole('status').filter({hasText:'Escribe una empresa'})).toBeVisible()
   await expect(input).toHaveValue('');await expect(page.locator('[data-opportunity-id]')).toHaveCount(0)
  }
  holdSearch=false
  await input.fill('Gamma');await submit.click();await expect(page.locator(`[data-opportunity-id="${ids.Gamma}"]`)).toBeVisible()
  await expect(page.getByRole('button',{name:'Nueva oportunidad',exact:true})).toBeDisabled()
  await expect(page.getByRole('combobox',{name:'Mover etapa de Synthetic Gamma opportunity',exact:true})).toHaveCount(0)
  const oldDetail=page.waitForResponse(r=>r.request()===staleDetail!.request())
  await reply(staleDetail,work('Alpha'));await (await oldDetail).finished();staleDetail=null
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  await expect(page.locator(`[data-opportunity-id="${ids.Gamma}"]`)).toBeVisible();await expect(page.locator(`[data-opportunity-id="${ids.Alpha}"]`)).toHaveCount(0)
  await expect(page.getByText('Synthetic Gamma customer',{exact:true})).toBeVisible()
  holdWork=false;holdSearch=true;await input.fill('Alpha');await submit.click();await expect.poll(()=>held.length).toBe(1)
  holdLatest=true;await input.fill('Beta');await submit.click();await expect.poll(()=>held.length).toBe(2)
  const oldFailure=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='global.search'&&r.request().postDataJSON()?.input.query==='Alpha')
  await held.shift()!.fulfill({status:403,json:{ok:false,error:'denied'}});await (await oldFailure).finished()
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  await expect(submit).toBeDisabled();await expect(page.getByRole('status').filter({hasText:'Consultando oportunidades'})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0)
  await reply(held.shift()!,search('Beta'))
  await expect(page.locator(`[data-opportunity-id="${ids.Beta}"]`)).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0)
  holdLatest=false;await input.fill('Alpha');await submit.click();await expect.poll(()=>held.length).toBe(1)
  await page.getByRole('button',{name:'Cambiar empresa sintética',exact:true}).click()
  await reply(held.shift()!,search('Alpha'))
  await expect(page.getByRole('status').filter({hasText:'Escribe una empresa'})).toBeVisible()
  await expect(input).toHaveValue('');await expect(page.locator('[data-opportunity-id]')).toHaveCount(0)
  await input.fill('Gamma');await submit.click();await expect(page.locator(`[data-opportunity-id="${ids.Gamma}"]`)).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(errors).toEqual([]);expect(commands).toEqual([])
  const capture=info.outputPath(`pipeline-current-query-${width}.png`);await page.screenshot({path:capture,fullPage:false});await info.attach(`pipeline-current-query-${width}`,{path:capture,contentType:'image/png'})
  holdSelection=true;await page.locator(`[data-opportunity-id="${ids.Gamma}"]`).click();await expect.poll(()=>held.length).toBe(1)
  await input.fill('Beta')
  const selection=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='work.get'&&r.request().postDataJSON()?.input.id===ids.Gamma)
  await reply(held.shift()!,work('Gamma'));await (await selection).finished()
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('status').filter({hasText:'Consulta pendiente'})).toBeVisible()
 }finally{for(const route of [...held,...(staleDetail?[staleDetail]:[])])await route.abort().catch(()=>{});await page.unrouteAll({behavior:'wait'});await fixture.close()}
})
