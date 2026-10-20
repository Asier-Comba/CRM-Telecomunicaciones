import {expect,test} from '@playwright/test'
import {startPipelineCurrentFixture} from '../../tests/e2e-preview/fixtures/pipeline-current-server.cjs'
const customer='10000000-0000-4000-8000-000000000001',stage='20000000-0000-4000-8000-000000000001',id='30000000-0000-4000-8000-000000000001'
const title='Instalación sintética con revisión comercial',company='Empresa sintética de oportunidad'
let fixture:Awaited<ReturnType<typeof startPipelineCurrentFixture>>
test.beforeAll(async()=>{fixture=await startPipelineCurrentFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['transport','malformed','wrong_receipt','read_failure','denied','success'] as const)test(`opportunity create retains frozen intent after ${mode}`,async({page},info)=>{
 const commands:{operation:string;input:Record<string,unknown>}[]=[],effects=new Set<string>(),errors:string[]=[]
 let reads=0
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  if(route.request().url().endsWith('/commands')){
   commands.push(q)
   if(q.operation!=='opportunity.create'||mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   effects.add(q.input.command_id)
   if(commands.length===1&&mode==='transport'){await route.abort('failed');return}
   if(commands.length===1&&mode==='malformed'){await route.fulfill({contentType:'application/json',body:'{'});return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'product.v1',operation:q.operation,command_id:commands.length===1&&mode==='wrong_receipt'?'70000000-0000-4000-8000-000000000009':q.input.command_id,id,version:1,status:'open'}}});return
  }
  if(q.operation==='opportunity.stages')data={contract_version:'product.v1',items:[{id:stage,code:'new',display_name:'Nueva sintética',position:0,outcome:null,status:'active'}],next_id:null}
  else if(q.operation==='global.search')data={contract_version:'product.v1',items:[{kind:'customer',id:customer,customer_id:customer,label:company,status:'active'}]}
  else if(q.operation==='work.get'){
   reads++
   if(mode==='read_failure'&&reads===1){await route.fulfill({status:500,json:{ok:false,error:'internal_safe'}});return}
   const input=commands[0]?.input
   data={contract_version:'product.v1',kind:'opportunity',record:{id,version:1,title:input?.title,status:'open',customer_id:customer,stage_id:stage,owner_user_id:null,amount_minor:input?.amount_minor,currency:input?.currency,next_follow_up_at:null,expected_close_date:input?.expected_close_date,next_action:input?.next_action,source:'manual',links:[],history:[],history_partial:false}}
  }else{await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.goto(fixture.url)
  await page.getByRole('button',{name:'Nueva oportunidad',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Nueva oportunidad',exact:true}),field=dialog.getByRole('textbox',{name:'Título comercial',exact:true})
  await field.fill(title)
  await dialog.getByRole('textbox',{name:'Buscar empresa para agenda',exact:true}).fill('Empresa')
  const client=dialog.getByRole('combobox',{name:'Cliente vinculado',exact:true})
  await expect(client.locator('option',{hasText:company})).toHaveCount(1);await client.selectOption(customer)
  await dialog.getByRole('textbox',{name:'Importe',exact:true}).fill('1250,50')
  await dialog.getByLabel('Cierre previsto',{exact:true}).fill('2026-11-20')
  await dialog.getByRole('textbox',{name:'Próxima acción',exact:true}).fill('Revisar propuesta sintética')
  await dialog.getByRole('button',{name:'Guardar oportunidad',exact:true}).click()
  await expect.poll(()=>commands.length).toBe(1)
  if(!['success','denied'].includes(mode)){
   await expect(dialog.getByRole('alert')).toBeVisible()
   await expect(field).toBeDisabled();await expect(field).toHaveValue(title);await expect(client).toHaveValue(customer)
   await expect(dialog.getByRole('textbox',{name:'Importe',exact:true})).toHaveValue('1250.50')
   await expect(dialog.getByLabel('Cierre previsto',{exact:true})).toHaveValue('2026-11-20')
   await expect(dialog.getByRole('textbox',{name:'Próxima acción',exact:true})).toHaveValue('Revisar propuesta sintética')
   await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click({force:true});await expect(dialog).toBeVisible()
   await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
   await expect(dialog.getByRole('combobox',{name:'Etapa comercial',exact:true})).toBeDisabled()
   await page.screenshot({path:info.outputPath(`opportunity-${mode}-pending.png`)})
   const retry=dialog.getByRole('button',{name:mode==='read_failure'?'Consultar la oportunidad guardada':'Reintentar la misma acción',exact:true})
   await retry.click()
   if(mode==='read_failure'){await expect.poll(()=>reads).toBe(2);expect(commands).toHaveLength(1)}
   else{await expect.poll(()=>commands.length).toBe(2);expect(commands[1]).toEqual(commands[0])}
  }else if(mode==='denied'){
   await expect(dialog.getByRole('alert')).toBeVisible();await expect(field).toBeEnabled()
   expect(effects.size).toBe(0);await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)
  }
  if(mode!=='denied'){
   await expect(dialog).toHaveCount(0)
   await expect(page.locator(`[data-opportunity-id="${id}"]`)).toContainText(title)
   expect(effects.size).toBe(1)
  }
  expect(commands.every(q=>q.operation==='opportunity.create')).toBe(true)
  expect(commands[0].input).toMatchObject({title,customer_id:customer,stage_id:stage,amount_minor:125050,currency:'EUR',expected_close_date:'2026-11-20',next_action:'Revisar propuesta sintética'})
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath(`opportunity-${mode}-result.png`)})
 }finally{await page.close()}
})
