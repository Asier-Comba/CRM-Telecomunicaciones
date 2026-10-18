import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const customer='10000000-0000-4000-8000-000000000001',operatorId='20000000-0000-4000-8000-000000000001',id='70000000-0000-4000-8000-000000000001'
for(const mode of ['uncertain','read_failed','review','denied'] as const)for(const width of [390,768,1440])test('contract recovery close '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),commands:{operation:string;input:Record<string,unknown>}[]=[],calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[],applied=new Set<string>()
 let effects=0,reject=mode==='denied',readFailed=false,effectsAfterDenied:number|undefined,controls:unknown
 const row={id,version:1,status:'draft',source:'manual',customer_id:customer,operator_id:operatorId,plan_version_id:null,start_date:'2026-10-18',signed_date:null,end_date:null,assigned_user_id:null},operator={id:operatorId,version:1,code:'synthetic_operator',display_name:'Synthetic contract operator',status:'active',source:'manual'}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='contract.create_manual'){
   commands.push(q);if(reject){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(!applied.has(String(q.input.command_id))){applied.add(String(q.input.command_id));effects++}
   if(mode==='uncertain'&&commands.length===1){await route.abort('failed');return}
   await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation:q.operation,command_id:q.input.command_id,id,version:1,status:'draft',source:'manual'}}});return
  }
  if(q.operation==='portfolio.get'){if(mode==='read_failed'&&effects&&!readFailed){readFailed=true;await route.fulfill({status:503,json:{ok:false,error:'internal_safe'}});return};await reply({contract_version:'portfolio.v1',kind:'contract',record:row});return}
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id:customer,version:1,account_kind:'legal_entity',legal_name:'Synthetic contract customer',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(q.operation==='customer.list'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:customer,version:1,display_name:'Synthetic contract customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  if(q.operation==='operator.list'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[operator],next_id:null});return}
  if(q.operation==='operator.get'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,record:operator});return}
  if(q.operation==='contract.list'){const {signed_date,...item}=row;expect(signed_date).toBeNull();await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:effects?[item]:[],next_id:null});return}
  if(['contact.list','assignee.list','plan.list'].includes(q.operation)){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='customer360.summary'){await reply({contract_version:'telecom.reads.v1',operation:q.operation,as_of:'2026-10-18',record:{customer_id:customer,contacts:1,contracts:1,services:1,lines:1,renewals:1,permanences:1,opportunities:1,tasks:1,meetings:1,cases:1,documents:null,billing:null,activity:1,portabilities:1,sims:1}});return}
  if(q.operation==='telecom.attention'){const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date());await reply({contract_version:'telecom.attention.v1',operation:q.operation,as_of:day,fallback_on:day,items:[],next_cursor:null});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 const form=page.locator('dialog:not([aria-describedby])'),modal=page.locator('dialog[aria-describedby]')
 async function review(){await page.getByRole('button',{name:'Registrar contrato manual',exact:true}).click();await form.getByRole('combobox',{name:'Operador del nuevo contrato',exact:true}).selectOption(operatorId);await form.getByLabel('Fecha de inicio del contrato',{exact:true}).fill('2026-10-18');await form.getByRole('button',{name:'Revisar contrato manual',exact:true}).click()}
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/');await page.getByRole('tab',{name:'Contratos',exact:true}).click();await review()
  const close=form.getByRole('button',{name:'Cerrar panel',exact:true}),cancel=modal.getByRole('button',{name:'Cancelar',exact:true})
  if(mode==='review'){await expect(cancel).toBeEnabled();await cancel.click();await expect(modal).toHaveCount(0);await expect(close).toBeEnabled();await close.click();await expect(form).toHaveCount(0);expect(commands).toHaveLength(0);expect(effects).toBe(0)}
  else{
   await modal.getByRole('button',{name:'Confirmar cambio',exact:true}).click()
   if(mode==='read_failed'){await expect(form.getByRole('status')).toHaveText('Cambio registrado. Reintentar solo actualiza la lectura.');await expect(form.getByRole('alert')).toBeVisible();controls={closeDisabled:await close.isDisabled()};await expect(close).toBeDisabled();await close.evaluate((b:HTMLButtonElement)=>b.click());await page.keyboard.press('Escape');await expect(form).toBeVisible();const retry=form.getByRole('button',{name:'Actualizar lectura',exact:true});await retry.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('contract-recovery-'+mode+'-'+width+'.png')});await retry.click()}
   else{
    await expect(modal.getByRole('alert')).toBeVisible();controls={closeDisabled:await close.isDisabled(),cancelDisabled:await cancel.isDisabled()}
    if(mode==='denied'){effectsAfterDenied=effects;expect(effectsAfterDenied).toBe(0);expect(commands).toHaveLength(1);await expect(cancel).toBeEnabled();await cancel.click();await expect(modal).toHaveCount(0);await expect(close).toBeEnabled();await close.click();await expect(form).toHaveCount(0);reject=false;await review();await modal.getByRole('button',{name:'Confirmar cambio',exact:true}).click()}
    else{await expect(cancel).toBeDisabled();await expect(close).toBeDisabled();await close.evaluate((b:HTMLButtonElement)=>b.click());await page.keyboard.press('Escape');await expect(modal).toBeVisible();const retry=modal.getByRole('button',{name:'Reintentar misma operación',exact:true});await retry.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('contract-recovery-'+mode+'-'+width+'.png')});await retry.click()}
   }
   await expect(form).toHaveCount(0);await expect(page.getByRole('link',{name:'Ver contrato creado',exact:true})).toHaveAttribute('href','/portfolio?kind=contract&id='+id);expect(effects).toBe(1);expect(commands).toHaveLength(mode==='read_failed'?1:2)
   if(mode==='uncertain')expect(commands[1]).toEqual(commands[0]);if(mode==='denied'){expect(commands[1].input.command_id).not.toBe(commands[0].input.command_id);const {command_id:first,...input1}=commands[0].input,{command_id:second,...input2}=commands[1].input;expect(first).toBeTruthy();expect(second).toBeTruthy();expect(input2).toEqual(input1)}
   expect(commands.every(q=>q.operation==='contract.create_manual'&&q.input.customer_id===customer&&q.input.operator_id===operatorId&&q.input.start_date==='2026-10-18'&&q.input.plan_version_id===null&&q.input.assigned_user_id===null)).toBe(true)
   const reads=calls.filter(q=>q.operation==='portfolio.get');expect(reads).toHaveLength(mode==='read_failed'?2:1);expect(reads.every(q=>q.input.kind==='contract'&&q.input.id===id)).toBe(true)
  }
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);if(mode==='review'||mode==='denied')await page.screenshot({path:info.outputPath('contract-recovery-'+mode+'-'+width+'.png')})
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,controls,effectsAfterDenied,effects,commands,calls,errors},null,2));await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
