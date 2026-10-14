import {expect,test} from '@playwright/test'
import {startPipelineCurrentFixture} from './fixtures/pipeline-current-server.cjs'
const id='30000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001'
const open='20000000-0000-4000-8000-000000000001',won='20000000-0000-4000-8000-000000000002',lost='20000000-0000-4000-8000-000000000003'
for(const state of ['won','lost'] as const)for(const mode of ['invalid','transport','confirmed_read_failed','denied'] as const)for(const width of [390,768,1440])test(`opportunity reopen ${state} ${mode} recovery at ${width}`,async({page},info)=>{
 const fixture=await startPipelineCurrentFixture(),commands:{operation:string;input:{command_id:string;expected_version:number}}[]=[],applied=new Set<string>(),errors:string[]=[]
 let effects=0,readFailed=false
 let record={id,version:1,title:'Synthetic closed opportunity',status:state as string,customer_id:customer,stage_id:state==='won'?won:lost,owner_user_id:null,amount_minor:null,currency:null,next_follow_up_at:null,expected_close_date:null,next_action:null,source:'manual',links:[],history:[],history_partial:false}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='opportunity.stages'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{id:open,code:'open',display_name:'Open stage',position:0,outcome:null,status:'active'},{id:won,code:'won',display_name:'Won stage',position:1,outcome:'won',status:'active'},{id:lost,code:'lost',display_name:'Lost stage',position:2,outcome:'lost',status:'active'}],next_id:null}}});return}
  if(route.request().url().endsWith('/commands')){
   commands.push(q);expect(q.operation).toBe('opportunity.reopen')
   if(mode==='denied'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);effects++;record={...record,status:'open',stage_id:open,version:2}}
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
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/#edit=true')
  const dialog=page.getByRole('dialog',{name:'Detalle de oportunidad',exact:true})
  await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Guardar oportunidad',exact:true})).toBeDisabled()
  await dialog.getByRole('combobox',{name:'Etapa comercial',exact:true}).selectOption(open)
  await dialog.getByRole('button',{name:'Aplicar etapa',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible()
  if(mode==='denied'){
   await expect(dialog.getByRole('alert')).toHaveText('No tienes permiso para esta acción.')
   await expect(dialog.getByRole('button',{name:'Guardar oportunidad',exact:true})).toBeDisabled()
   await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)
   expect(commands).toHaveLength(1);expect(effects).toBe(0);return
  }
  const retry=dialog.getByRole('button',{name:mode==='confirmed_read_failed'?'Consultar la oportunidad guardada':'Reintentar la misma acción',exact:true})
  await expect(retry).toBeEnabled();await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1})
  await expect(dialog.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled()
  await expect(dialog.getByRole('combobox',{name:'Etapa comercial',exact:true})).toBeDisabled()
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible()
  await page.screenshot({path:info.outputPath(`opportunity-reopen-${state}-${mode}-${width}.png`)})
  await retry.click();await expect(dialog).toHaveCount(0)
  expect(commands).toHaveLength(mode==='confirmed_read_failed'?1:2);if(commands.length===2)expect(commands[1]).toEqual(commands[0])
  expect(commands[0].input.expected_version).toBe(1);expect(effects).toBe(1)
  await expect(page.getByRole('combobox',{name:'Mover etapa de Synthetic closed opportunity',exact:true})).toHaveValue(open)
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
