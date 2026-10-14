import {expect,test} from '@playwright/test'
import {startPipelineCurrentFixture} from './fixtures/pipeline-current-server.cjs'

const id='30000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001'
const first='20000000-0000-4000-8000-000000000001',second='20000000-0000-4000-8000-000000000002'
for(const mode of ['invalid','transport','denied','confirmed_read_failed'] as const)for(const width of [390,768,1440])test(`pipeline stage ${mode} recovery at ${width}`,async({page},info)=>{
 const fixture=await startPipelineCurrentFixture(),commands:{operation:string;input:{command_id:string;expected_version:number;stage_id:string}}[]=[],applied=new Set<string>(),errors:string[]=[]
 let effects=0,readFailed=false
 let record={id,version:1,title:'Synthetic stage recovery',status:'open',customer_id:customer,stage_id:first,owner_user_id:null,amount_minor:null,currency:null,next_follow_up_at:null,expected_close_date:null,next_action:null,source:'manual',links:[],history:[],history_partial:false}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='opportunity.stages'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{id:first,code:'first',display_name:'Initial stage',position:0,outcome:null,status:'active'},{id:second,code:'second',display_name:'Next stage',position:1,outcome:null,status:'active'}],next_id:null}}});return}
  if(q.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:customer,customer_id:customer,label:'Synthetic stage customer',status:'active'},{kind:'opportunity',id,customer_id:customer,label:record.title,status:'open'}]}}});return}
  if(route.request().url().endsWith('/commands')){
   commands.push(q);expect(q.operation).toBe('opportunity.change_stage')
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);effects++;record={...record,stage_id:second,version:2}}
   const receipt={contract_version:'product.v1',command_id:q.input.command_id,operation:q.operation,id,version:2,status:'open'}
   if(commands.length===1&&mode==='transport'){await route.abort('failed');return}
   if(commands.length===1&&mode==='invalid'){await route.fulfill(width===390?{status:200,contentType:'application/json',body:'{'}:width===768?{json:{ok:true,receipt:{...receipt,command_id:'70000000-0000-4000-8000-000000000009'}}}:{json:{ok:true,receipt,extra:'invalid-envelope'}});return}
   await route.fulfill({json:{ok:true,receipt}});return
  }
  if(q.operation==='work.get'){
   if(mode==='confirmed_read_failed'&&effects&&!readFailed){readFailed=true;await route.fulfill({status:503,json:{ok:false,error:'internal_safe'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',kind:'opportunity',record}}});return
  }
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  await expect(page.getByRole('button',{name:'Nueva oportunidad',exact:true})).toBeEnabled()
  await page.getByRole('textbox',{name:'Consultar pipeline local',exact:true}).fill('Synthetic stage')
  await page.getByRole('button',{name:'Consultar pipeline',exact:true}).click()
  const select=page.getByRole('combobox',{name:'Mover etapa de Synthetic stage recovery',exact:true})
  await expect(select).toHaveValue(first);await select.selectOption(second)
  await expect(page.getByRole('alert')).toBeVisible()
  const retry=page.getByRole('button',{name:'Comprobar el mismo movimiento',exact:true})
  if(mode==='denied'){
   await expect(page.getByRole('alert')).toHaveText('No tienes permiso para esta acción.')
   await expect(retry).toHaveCount(0);await expect(select).toHaveValue(first)
   await page.getByRole('button',{name:'Recargar versión actual',exact:true}).click();await expect(select).toHaveValue(first)
   expect(commands).toHaveLength(1);expect(effects).toBe(0);return
  }
  await expect(retry).toBeVisible();await expect(select).toHaveCount(0)
  const card=page.locator(`[data-opportunity-id="${id}"]`);await expect(card).toHaveAttribute('draggable','false')
  await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1})
  await page.screenshot({path:info.outputPath(`pipeline-stage-${mode}-${width}.png`)})
  await retry.click();await expect(page.getByText('Etapa guardada y comprobada.',{exact:true})).toBeVisible()
  await expect(select).toHaveValue(second);await expect(retry).toHaveCount(0)
  expect(commands).toHaveLength(mode==='confirmed_read_failed'?1:2)
  if(commands.length===2)expect(commands[1]).toEqual(commands[0])
  expect(commands[0].input.expected_version).toBe(1);expect(effects).toBe(1)
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
