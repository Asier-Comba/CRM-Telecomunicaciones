import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
import {parsePortfolioGetV1} from '../../src/lib/server/portfolio-runtime-v1'
const customer='10000000-0000-4000-8000-000000000001',operatorId='20000000-0000-4000-8000-000000000001',other='60000000-0000-4000-8000-000000000001',id='70000000-0000-4000-8000-000000000001'
for(const mode of ['operator','date','plan','source','assignee','receipt','exact','newer_owner'] as const)for(const width of [390,768,1440])test('created contract read binding '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),commands:{operation:string;input:Record<string,unknown>}[]=[],calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[],parserChecks:boolean[]=[],applied=new Set<string>(),positive=mode==='exact'||mode==='newer_owner'
 let effects=0,corrected=false
 const base={id,version:mode==='newer_owner'?2:1,status:'draft',source:'manual',customer_id:customer,operator_id:operatorId,plan_version_id:null,start_date:'2026-10-18',signed_date:null,end_date:null,assigned_user_id:mode==='newer_owner'?other:null},operator={id:operatorId,version:1,code:'synthetic_operator',display_name:'Synthetic binding operator',status:'active',source:'manual'}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='contract.create_manual'){commands.push(q);if(!applied.has(String(q.input.command_id))){applied.add(String(q.input.command_id));effects++};await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation:q.operation,command_id:q.input.command_id,id,version:mode==='receipt'&&commands.length===1?2:1,status:'draft',source:'manual'}}});return}
  if(q.operation==='portfolio.get'){
   const record=corrected?base:mode==='operator'?{...base,operator_id:other}:mode==='date'?{...base,start_date:'2026-10-19'}:mode==='plan'?{...base,plan_version_id:other}:mode==='source'?{...base,source:'integration'}:mode==='assignee'?{...base,assigned_user_id:other}:base
   const data={contract_version:'portfolio.v1',kind:'contract',record};parserChecks.push(parsePortfolioGetV1({kind:'contract',id},data)!==null);await reply(data);return
  }
  if(q.operation==='customer.editor'){await reply({contract_version:'product.v1',id:customer,version:1,account_kind:'legal_entity',legal_name:'Synthetic binding customer',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null});return}
  if(q.operation==='customer.list'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:customer,version:1,display_name:'Synthetic binding customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  if(q.operation==='operator.list'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[operator],next_id:null});return}
  if(q.operation==='operator.get'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,record:operator});return}
  if(['contact.list','contract.list','assignee.list','plan.list'].includes(q.operation)){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  if(q.operation==='customer360.summary'){await reply({contract_version:'telecom.reads.v1',operation:q.operation,as_of:'2026-10-18',record:{customer_id:customer,contacts:1,contracts:1,services:1,lines:1,renewals:1,permanences:1,opportunities:1,tasks:1,meetings:1,cases:1,documents:null,billing:null,activity:1,portabilities:1,sims:1}});return}
  if(q.operation==='telecom.attention'){const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date());await reply({contract_version:'telecom.attention.v1',operation:q.operation,as_of:day,fallback_on:day,items:[],next_cursor:null});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 const form=page.locator('dialog:not([aria-describedby])'),modal=page.locator('dialog[aria-describedby]')
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/');await page.getByRole('tab',{name:'Contratos',exact:true}).click();await page.getByRole('button',{name:'Registrar contrato manual',exact:true}).click();await form.getByRole('combobox',{name:'Operador del nuevo contrato',exact:true}).selectOption(operatorId);await form.getByLabel('Fecha de inicio del contrato',{exact:true}).fill('2026-10-18');await form.getByRole('button',{name:'Revisar contrato manual',exact:true}).click();await modal.getByRole('button',{name:'Confirmar cambio',exact:true}).click()
  if(mode==='receipt'){await expect(modal.getByRole('alert')).toHaveText('No se pudo completar la acción.');expect(parserChecks).toEqual([]);expect(calls.filter(q=>q.operation==='portfolio.get')).toHaveLength(0);expect(commands).toHaveLength(1);await expect(modal.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled();const retry=modal.getByRole('button',{name:'Reintentar misma operación',exact:true});await retry.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('contract-binding-receipt-'+width+'.png')});await retry.click()}
  await expect.poll(()=>parserChecks.length).toBe(1);expect(parserChecks[0]).toBe(true)
  if(!positive&&mode!=='receipt'){
   await expect(form).toHaveCount(1);await expect(form.getByRole('alert')).toHaveText('No se pudo completar la acción.');await expect(form.getByRole('status')).toHaveText('Cambio registrado. Reintentar solo actualiza la lectura.');await expect(page.getByRole('link',{name:'Ver contrato creado',exact:true})).toHaveCount(0);await expect(form.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled();expect(commands).toHaveLength(1)
   const retry=form.getByRole('button',{name:'Actualizar lectura',exact:true});await retry.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('contract-binding-'+mode+'-'+width+'.png')});corrected=true;await retry.click()
  }
  await expect(form).toHaveCount(0);await expect(page.getByRole('link',{name:'Ver contrato creado',exact:true})).toHaveAttribute('href','/portfolio?kind=contract&id='+id);expect(commands).toHaveLength(mode==='receipt'?2:1);if(mode==='receipt')expect(commands[1]).toEqual(commands[0]);expect(effects).toBe(1);expect(commands[0].input).toMatchObject({customer_id:customer,operator_id:operatorId,start_date:'2026-10-18',plan_version_id:null,assigned_user_id:null});expect(parserChecks).toEqual(positive||mode==='receipt'?[true]:[true,true]);const reads=calls.filter(q=>q.operation==='portfolio.get');expect(reads).toHaveLength(positive||mode==='receipt'?1:2);expect(reads.every(q=>q.input.kind==='contract'&&q.input.id===id)).toBe(true);expect(errors).toEqual([])
  if(positive)await page.screenshot({path:info.outputPath('contract-binding-'+mode+'-'+width+'.png')})
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,parserChecks,corrected,effects,commands,calls,errors,scope:'Controlled DTO andeffect;notSQL/JWT/RLS/liveprovider'},null,2));await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
