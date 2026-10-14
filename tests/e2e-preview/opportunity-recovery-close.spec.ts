import {expect,test} from '@playwright/test'
import {startPipelineCurrentFixture} from './fixtures/pipeline-current-server.cjs'
const id='30000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',stage='20000000-0000-4000-8000-000000000001'
for(const width of [390,768,1440])for(const mode of ['create_uncertain','create_confirmed_read_failed','update_uncertain','update_confirmed_read_failed','archive_uncertain'] as const)test(`opportunity ${mode} retains recovery at ${width}`,async({page},info)=>{
 const fixture=await startPipelineCurrentFixture(),commands:unknown[]=[],applied=new Set<string>(),errors:string[]=[];let mutations=0,failedRead=false
 const create=mode.startsWith('create'),archive=mode.startsWith('archive'),confirmed=mode.includes('confirmed'),operation=archive?'opportunity.archive':create?'opportunity.create':'opportunity.update'
 let record={id,version:1,title:'Synthetic recovery opportunity',status:'open',customer_id:customer,stage_id:stage,owner_user_id:null,amount_minor:null,currency:null,next_follow_up_at:null,expected_close_date:null,next_action:null,source:'manual',links:[],history:[],history_partial:false}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation==='opportunity.stages'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{id:stage,code:'new',display_name:'Synthetic stage',position:0,outcome:null,status:'active'}],next_id:null}}});return}
  if(q.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id:customer,customer_id:customer,label:'Synthetic recovery customer',status:'active'}]}}});return}
  if(route.request().url().endsWith('/commands')){
   commands.push(q);expect(q.operation).toBe(operation)
   if(!applied.has(q.input.command_id)){applied.add(q.input.command_id);mutations++;record={...record,version:create?1:2,title:q.input.title??record.title,status:archive?'cancelled':'open'}}
   if(!confirmed&&commands.length===1){await route.abort('failed');return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'product.v1',command_id:q.input.command_id,operation,id,version:record.version,status:record.status}}});return
  }
  if(q.operation==='work.get'){
   if(confirmed&&mutations&&!failedRead){failedRead=true;await route.fulfill({status:503,json:{ok:false,error:'internal_safe'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',kind:'opportunity',record}}});return
  }
  if(q.operation==='customer.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:customer,version:1,display_name:'Synthetic recovery customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  if(['assignee.list','contract.list','service.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+(create?'/#create=true':'/#edit=true'))
  const dialog=page.getByRole('dialog',{name:create?'Nueva oportunidad':'Detalle de oportunidad',exact:true});await expect(dialog).toBeVisible()
  if(create){await dialog.getByLabel('Buscar empresa para agenda',{exact:true}).fill('Synthetic recovery');await expect(dialog.getByLabel('Cliente vinculado',{exact:true}).locator(`option[value="${customer}"]`)).toHaveCount(1);await dialog.getByLabel('Cliente vinculado',{exact:true}).selectOption(customer)}
  if(archive){await dialog.getByRole('button',{name:'Archivar oportunidad',exact:true}).click();await page.getByRole('dialog',{name:'Archivar oportunidad',exact:true}).getByRole('button',{name:'Confirmar',exact:true}).click()}
  else{await dialog.getByLabel('Título comercial',{exact:true}).fill('Synthetic recovery changed');await dialog.getByRole('button',{name:'Guardar oportunidad',exact:true}).click()}
  const active=archive?page.getByRole('dialog',{name:'Archivar oportunidad',exact:true}):dialog
  await expect(active.getByRole('alert')).toBeVisible()
  if(archive){await active.getByRole('button',{name:'Cancelar',exact:true}).evaluate((b:HTMLButtonElement)=>b.click());await expect(active).toBeVisible();await expect(active.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled()}
  const close=dialog.getByRole('button',{name:'Cerrar panel',exact:true});await close.evaluate((b:HTMLButtonElement)=>b.click());await expect(dialog).toBeVisible();await expect(close).toBeDisabled()
  await page.keyboard.press('Escape');await expect(active).toBeVisible();await expect(dialog.getByLabel('Título comercial',{exact:true})).toBeDisabled()
  const retry=active.getByRole('button',{name:confirmed?'Consultar la oportunidad guardada':'Reintentar la misma acción',exact:true});await retry.scrollIntoViewIfNeeded();await expect(retry).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath(`opportunity-${mode}-${width}.png`)});await retry.click()
  await expect(dialog).toHaveCount(0);expect(commands).toHaveLength(confirmed?1:2);if(!confirmed)expect(commands[1]).toEqual(commands[0]);expect(mutations).toBe(1)
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
