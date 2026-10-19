import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startTelecomResourceFixture} from './fixtures/telecom-resource-server.cjs'
const customer='10000000-0000-4000-8000-000000000001',id='40000000-0000-4000-8000-000000000001'
for(const mode of ['create_uncertain','create_read_failed','update_uncertain','update_read_failed','create_review','create_denied','update_denied'] as const)for(const width of [390,768,1440])test('case recovery close '+mode+' at '+width,async({page},info)=>{
 const fixture=await startTelecomResourceFixture(),create=mode.startsWith('create'),confirmed=mode.endsWith('read_failed'),denied=mode.endsWith('denied'),review=mode==='create_review',commands:{operation:string;input:Record<string,unknown>}[]=[],calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[],applied=new Set<string>()
 let effects=0,readFailed=false,controls:unknown
 let row={id,version:1,customer_id:customer,contract_id:null,service_id:null,line_id:null,case_type:'technical',title:'Synthetic recovery case',priority:'normal',due_on:null,assigned_user_id:null,status:'open',source:'manual',resolved_at:null,closed_at:null,resolution_code:null,cancellation_code:null,internal_note_count:0,created_at:'2026-10-18T12:00:00Z',updated_at:'2026-10-18T12:00:00Z',overdue:false}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='case.create'||q.operation==='case.update'){
   commands.push(q);expect(q.operation).toBe(create?'case.create':'case.update')
   if(denied){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(!applied.has(String(q.input.command_id))){applied.add(String(q.input.command_id));effects++;row={...row,title:q.input.title,version:create?1:2}}
   if(!confirmed&&commands.length===1){await route.abort('failed');return}
   await reply({contract_version:'case.v1',operation:q.operation,command_id:q.input.command_id,id,version:row.version,status:'open',source:'manual',resolution_code:null,cancellation_code:null,note_id:null,note_seq:null});return
  }
  if(q.operation==='case.get'){
   if(confirmed&&effects&&!readFailed){readFailed=true;await route.fulfill({status:503,json:{ok:false,error:'internal_safe'}});return}
   await reply({contract_version:'case.v1',operation:q.operation,record:row});return
  }
  if(q.operation==='case.list'){await reply({contract_version:'case.v1',operation:q.operation,items:effects?[row]:[],next_id:null});return}
  if(q.operation==='customer.list'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:customer,version:1,display_name:'Synthetic case customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  if(['contract.list','assignee.list'].includes(q.operation)){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind='+(create?'case-create':'case')+'&reset_scope=1')
  if(create)await page.getByRole('button',{name:'Nueva incidencia',exact:true}).click()
  const form=create?page.getByRole('dialog',{name:'Nueva incidencia',exact:true}):page.locator('form').filter({has:page.getByLabel('Título de incidencia',{exact:true})})
  await form.getByLabel('Título de incidencia',{exact:true}).fill('Synthetic reviewed case');await form.getByRole('button',{name:create?'Revisar incidencia':'Revisar datos de incidencia',exact:true}).click()
  const modal=page.getByRole('dialog',{name:create?'Registrar incidencia':'Confirmar cambio de incidencia',exact:true}),cancel=modal.getByRole('button',{name:'Cancelar',exact:true})
  if(review){await expect(cancel).toBeEnabled();await cancel.click();await expect(modal).toHaveCount(0);const close=form.getByRole('button',{name:'Cerrar panel',exact:true});await expect(close).toBeEnabled();await close.click();await expect(form).toHaveCount(0);expect(commands).toHaveLength(0)}
  else{
   await modal.getByRole('button',{name:create?'Registrar incidencia':'Confirmar cambio',exact:true}).click()
   if(confirmed&&create){await expect(form.getByRole('status')).toContainText('Incidencia guardada.');await expect(form.getByRole('alert')).toBeVisible();const close=form.getByRole('button',{name:'Cerrar panel',exact:true});controls={drawerCloseDisabled:await close.isDisabled()};await expect(close).toBeDisabled();await close.evaluate((b:HTMLButtonElement)=>b.click());await page.keyboard.press('Escape');await expect(form).toBeVisible();const retry=form.getByRole('button',{name:'Consultar incidencia registrada',exact:true});await retry.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('case-recovery-'+mode+'-'+width+'.png')});await retry.click()}
   else{
    await expect(modal.getByRole('alert')).toBeVisible();controls={cancelDisabled:await cancel.isDisabled(),modalCloseDisabled:await modal.getByRole('button',{name:'Cerrar',exact:true}).isDisabled(),...(create?{drawerCloseDisabled:await form.getByRole('button',{name:'Cerrar panel',exact:true}).isDisabled()}: {})}
    if(denied||confirmed){await expect(cancel).toBeEnabled();await cancel.click();await expect(modal).toHaveCount(0);if(create){const close=form.getByRole('button',{name:'Cerrar panel',exact:true});await expect(close).toBeEnabled();await close.click();await expect(form).toHaveCount(0)}else if(confirmed)await page.getByRole('button',{name:'Actualizar incidencia confirmada',exact:true}).click()}
    else{await expect(cancel).toBeDisabled();await expect(modal.getByRole('button',{name:'Cerrar',exact:true})).toBeDisabled();await cancel.evaluate((b:HTMLButtonElement)=>b.click());await page.keyboard.press('Escape');await expect(modal).toBeVisible();if(create)await expect(form.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled();const retry=modal.getByRole('button',{name:create?'Reintentar incidencia':'Reintentar misma incidencia',exact:true});await retry.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('case-recovery-'+mode+'-'+width+'.png')});await retry.click()}
   }
   if(!denied){if(create){await expect(form).toHaveCount(0);await expect(page.getByRole('link',{name:'Ver incidencia registrada',exact:true})).toHaveAttribute('href','/cases/'+id)}else await expect(page.getByRole('heading',{name:'Synthetic reviewed case',level:1,exact:true})).toBeVisible();expect(effects).toBe(1);expect(commands).toHaveLength(confirmed?1:2);if(!confirmed)expect(commands[1]).toEqual(commands[0])}else{expect(effects).toBe(0);expect(commands).toHaveLength(1)}
  }
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  if(review||denied||confirmed&&!create)await page.screenshot({path:info.outputPath('case-recovery-'+mode+'-'+width+'.png')})
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,controls,effects,commands,calls,errors},null,2));await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
