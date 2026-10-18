import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startTelecomResourceFixture} from './fixtures/telecom-resource-server.cjs'
const customer='10000000-0000-4000-8000-000000000001',operatorId='20000000-0000-4000-8000-000000000001',id='70000000-0000-4000-8000-000000000001'
for(const mode of ['reference','company','actor','viewer','current'] as const)for(const width of [390,768,1440])test('contract create read retirement '+mode+' at '+width,async({page},info)=>{
 const fixture=await startTelecomResourceFixture(),commands:{operation:string;input:Record<string,unknown>}[]=[],calls:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let held=false,effects=0,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>release=resolve)
 const row={id,version:1,status:'draft',source:'manual',customer_id:customer,operator_id:operatorId,plan_version_id:null,start_date:'2026-10-18',signed_date:null,end_date:null,assigned_user_id:null},operator={id:operatorId,version:1,code:'synthetic_operator',display_name:'Synthetic retirement operator',status:'active',source:'manual'}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();calls.push(q);const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(q.operation==='contract.create_manual'){commands.push(q);held=true;await gate;effects++;await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation:q.operation,command_id:q.input.command_id,id,version:1,status:'draft',source:'manual'}}});return}
  if(q.operation==='portfolio.get'){await reply({contract_version:'portfolio.v1',kind:'contract',record:row});return}
  if(q.operation==='customer.list'){const n=q.input.after_id?Number(String(q.input.after_id).slice(-12))+1:1;await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:'10000000-0000-4000-8000-'+String(n).padStart(12,'0'),version:1,display_name:'Synthetic retirement customer '+n,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  if(q.operation==='operator.list'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[operator],next_id:null});return}
  if(q.operation==='operator.get'){await reply({contract_version:'telecom.collections.v1',operation:q.operation,record:operator});return}
  if(['contract.list','assignee.list','plan.list'].includes(q.operation)){await reply({contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 let before=0,after=0
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=contract-create&reset_scope=1');await page.getByRole('button',{name:'Registrar contrato manual',exact:true}).click();const form=page.locator('dialog:not([aria-describedby])');await form.getByRole('combobox',{name:'Operador del nuevo contrato',exact:true}).selectOption(operatorId);await form.getByLabel('Fecha de inicio del contrato',{exact:true}).fill('2026-10-18');await form.getByRole('button',{name:'Revisar contrato manual',exact:true}).click();await page.locator('dialog[aria-describedby]').getByRole('button',{name:'Confirmar cambio',exact:true}).click();await expect.poll(()=>held).toBe(true)
  if(mode!=='current'){await page.getByRole('button',{name:mode==='reference'?'Seleccionar recurso B':mode==='company'?'Cambiar empresa sintética':mode==='actor'?'Cambiar actor sintético':'Cambiar a lector sintético',exact:true}).dispatchEvent('click');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('No hay registros de contratos en esta página.',{exact:true})).toBeVisible()}
  before=calls.filter(q=>q.operation==='portfolio.get'&&q.input.id===id).length;expect(before).toBe(0)
  const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='contract.create_manual');release();await (await response).finished();await page.waitForLoadState('networkidle');after=calls.filter(q=>q.operation==='portfolio.get'&&q.input.id===id).length;expect(after-before).toBe(mode==='current'?1:0)
  if(mode==='current'){await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('link',{name:'Ver contrato creado',exact:true})).toHaveAttribute('href','/portfolio?kind=contract&id='+id)}else await expect(page.getByRole('link',{name:'Ver contrato creado',exact:true})).toHaveCount(0)
  expect(commands).toHaveLength(1);expect(effects).toBe(1);expect(commands[0].input).toMatchObject({customer_id:customer,operator_id:operatorId,start_date:'2026-10-18',plan_version_id:null,assigned_user_id:null});expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath('contract-retirement-'+mode+'-'+width+'.png')})
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,before,after,effects,commands,calls,errors,scope:'Onlycontrolledclientrequests/effects;notAuthDB/nativequiescence/restart/handler/full23'},null,2));await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
