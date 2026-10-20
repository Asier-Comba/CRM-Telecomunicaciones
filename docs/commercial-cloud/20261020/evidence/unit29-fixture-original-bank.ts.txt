import {expect,test} from '@playwright/test'
import {startPipelineCurrentFixture} from '../../tests/e2e-preview/fixtures/pipeline-current-server.cjs'
const customer='10000000-0000-4000-8000-000000000001',stage='20000000-0000-4000-8000-000000000001',id='30000000-0000-4000-8000-000000000001'
const title='Oportunidad sintética con archivo revisado'
let fixture:Awaited<ReturnType<typeof startPipelineCurrentFixture>>
test.beforeAll(async()=>{fixture=await startPipelineCurrentFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['transport','malformed','wrong_receipt','read_failure','denied','success'] as const)test(`opportunity archive confirmation keeps ${mode} intent`,async({page},info)=>{
 const commands:{operation:string;input:Record<string,unknown>}[]=[],effects=new Set<string>(),errors:string[]=[]
 let applied=false,readsAfter=0
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  if(route.request().url().endsWith('/commands')){
   commands.push(q)
   if(q.operation!=='opportunity.archive'||mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   applied=true;effects.add(q.input.command_id)
   if(commands.length===1&&mode==='transport'){await route.abort('failed');return}
   if(commands.length===1&&mode==='malformed'){await route.fulfill({contentType:'application/json',body:'{'});return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'product.v1',operation:q.operation,command_id:commands.length===1&&mode==='wrong_receipt'?'70000000-0000-4000-8000-000000000009':q.input.command_id,id,version:2,status:'cancelled'}}});return
  }
  if(q.operation==='opportunity.stages')data={contract_version:'product.v1',items:[{id:stage,code:'new',display_name:'Nueva sintética',position:0,outcome:null,status:'active'}],next_id:null}
  else if(q.operation==='global.search')data={contract_version:'product.v1',items:[{kind:'customer',id:customer,customer_id:customer,label:'Empresa sintética de archivo',status:'active'},{kind:'opportunity',id,customer_id:customer,label:title,status:'open'}]}
  else if(q.operation==='assignee.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}
  else if(q.operation==='work.get'){
   if(applied)readsAfter++
   if(applied&&mode==='read_failure'&&readsAfter===1){await route.fulfill({status:500,json:{ok:false,error:'internal_safe'}});return}
   data={contract_version:'product.v1',kind:'opportunity',record:{id,version:applied?2:1,title,status:applied?'cancelled':'open',customer_id:customer,stage_id:stage,owner_user_id:null,amount_minor:10000,currency:'EUR',next_follow_up_at:null,expected_close_date:null,next_action:null,source:'manual',links:[],history:[],history_partial:false}}
  }else{await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.goto(fixture.url)
  await page.getByRole('textbox',{name:'Consultar pipeline local',exact:true}).fill('Archivo sintético')
  await page.getByRole('button',{name:'Consultar pipeline',exact:true}).click()
  await page.locator(`[data-opportunity-id="${id}"]`).click()
  const editor=page.getByRole('dialog',{name:'Detalle de oportunidad',exact:true}),confirm=page.getByRole('dialog',{name:'Archivar oportunidad',exact:true})
  await editor.getByRole('button',{name:'Archivar oportunidad',exact:true}).click()
  await confirm.getByRole('button',{name:'Confirmar',exact:true}).click()
  await expect.poll(()=>commands.length).toBe(1)
  if(['transport','malformed','wrong_receipt'].includes(mode)){
   await expect(confirm.getByRole('alert')).toBeVisible()
   const cancel=confirm.getByRole('button',{name:'Cancelar',exact:true}),close=confirm.getByRole('button',{name:'Cerrar',exact:true})
   // Start with a different native closing surface at each width; keep all assertions.
   const width=page.viewportSize()!.width
   if(width===390)await cancel.click({force:true})
   else if(width===768)await close.click({force:true})
   else await page.keyboard.press('Escape')
   await expect(confirm).toBeVisible()
   await cancel.click({force:true});await expect(confirm).toBeVisible()
   await close.click({force:true});await expect(confirm).toBeVisible()
   await page.keyboard.press('Escape');await expect(confirm).toBeVisible()
   await expect(cancel).toBeDisabled();await expect(close).toBeDisabled()
   await page.screenshot({path:info.outputPath(`opportunity-archive-${mode}-pending.png`)})
   const retry=confirm.getByRole('button',{name:/^(Confirmar|Reintentar el mismo archivo)$/})
   await retry.click();await expect.poll(()=>commands.length).toBe(2);expect(commands[1]).toEqual(commands[0])
  }else if(mode==='read_failure'){
   await expect(confirm).toHaveCount(0);await expect(editor.getByRole('alert')).toBeVisible()
   await editor.getByRole('button',{name:'Cerrar panel',exact:true}).click({force:true});await expect(editor).toBeVisible()
   await page.keyboard.press('Escape');await expect(editor).toBeVisible()
   await editor.getByRole('button',{name:'Consultar la oportunidad guardada',exact:true}).click()
   await expect.poll(()=>readsAfter).toBe(2);expect(commands).toHaveLength(1)
  }else if(mode==='denied'){
   await expect(confirm.getByRole('alert')).toBeVisible();await expect(confirm.getByRole('button',{name:'Cancelar',exact:true})).toBeEnabled()
   await confirm.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(confirm).toHaveCount(0)
   await expect(editor.getByRole('textbox',{name:'Título comercial',exact:true})).toBeEnabled()
   await editor.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(editor).toHaveCount(0);expect(effects.size).toBe(0)
  }
  if(mode!=='denied'){
   await expect(editor).toHaveCount(0);await expect(confirm).toHaveCount(0)
   await expect(page.locator(`[data-opportunity-id="${id}"]`)).toContainText('Cancelado')
   await expect(page.getByRole('combobox',{name:'Mover etapa de '+title,exact:true})).toHaveCount(0);expect(effects.size).toBe(1)
  }
  expect(commands.every(q=>q.operation==='opportunity.archive')).toBe(true)
  expect(commands[0].input).toMatchObject({id,expected_version:1})
  expect(Object.keys(commands[0].input).sort()).toEqual(['command_id','expected_version','id'])
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath(`opportunity-archive-${mode}-result.png`)})
 }finally{await page.close()}
})
