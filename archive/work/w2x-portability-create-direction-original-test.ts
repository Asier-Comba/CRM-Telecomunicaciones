import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const id=(prefix:number,n:number)=>prefix+'0000000-0000-4000-8000-'+String(n).padStart(12,'0'),mask=(n:number)=>'••••'+(100+n)
for(const direction of ['inbound','outbound'] as const)for(const width of [390,768,1440])test('portability create direction '+direction+' at '+width,async({page},info)=>{
 const outbound=direction==='outbound',fixture=await startCommercialResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 const contract=(n:number)=>({id:id(6,n),version:1,status:'active',source:'manual',customer_id:id(1,n),operator_id:id(2,1),plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null})
 const service=(n:number)=>({id:id(4,n),version:1,status:'active',source:'manual',customer_id:id(1,n),contract_id:id(6,n),operator_id:id(2,1),plan_version_id:null,service_kind:'mobile',display_name:'Synthetic service '+n,activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'})
 const line=(n:number)=>({id:id(5,n),version:1,service_id:id(4,n),customer_id:id(1,n),contract_id:id(6,n),operator_id:id(2,1),plan_version_id:null,display_name:'Synthetic line '+n,status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null,service_kind:'mobile',masked_msisdn:mask(n),sim_id:null,sim_kind:null,sim_status:null,masked_iccid:null,masked_eid:null,portability_id:null,portability_status:null,open_commitment_count:0,next_commitment_ends_on:null})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON(),{operation,input}=q;reads.push(q)
  const reply=(data:unknown)=>route.fulfill({json:{ok:true,data}})
  if(operation==='portability.create'){commands.push(q);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='portability.list'){await reply({contract_version:'portability.v1',operation,items:[],next_id:null});return}
  if(operation==='portfolio.get'){await reply({contract_version:'portfolio.v1',kind:input.kind,record:input.kind==='service'?service(1):contract(1)});return}
  if(operation==='line.list'){await reply({contract_version:'telecom.collections.v1',operation,items:[line(1)],next_id:null});return}
  if(operation==='identifier.list'){await reply({contract_version:'identifiers.v1',operation,items:[{id:id(7,1),entity_kind:'line',entity_id:id(5,1),identifier_kind:'msisdn',masked_display:mask(1),status:'active',source:'manual',valid_from:'2026-10-01T12:00:00Z',valid_until:null,version:1}],next_id:null});return}
  if(operation==='customer.list'){await reply({contract_version:'telecom.collections.v1',operation,items:[{id:id(1,1),version:1,display_name:'Synthetic customer 1',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null});return}
  const operator=(prefix:number)=>({id:id(prefix,1),version:1,code:'synthetic_'+prefix,display_name:'Synthetic operator '+prefix,status:'active',source:'manual'})
  if(operation==='operator.get'){await reply({contract_version:'telecom.collections.v1',operation,record:operator(Number(String(input.id)[0]))});return}
  if(operation==='operator.list'){const operators=[2,3,8].map(operator);await reply({contract_version:'telecom.collections.v1',operation,items:input.limit===1?operators.filter(o=>o.id>String(input.after_id)).slice(0,1):operators,next_id:null});return}
  if(['assignee.list','contact.list'].includes(operation)){await reply({contract_version:'telecom.collections.v1',operation,items:[],next_id:null});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portability-create&reset_scope=1');await page.getByRole('button',{name:'Nueva portabilidad',exact:true}).click()
  const form=page.getByRole('dialog',{name:'Nueva portabilidad',exact:true}),origin=form.getByRole('combobox',{name:'Operador origen de portabilidad',exact:true}),target=form.getByRole('combobox',{name:'Operador destino de portabilidad',exact:true}),fixed=outbound?origin:target,mutable=outbound?target:origin,review=form.getByRole('button',{name:'Revisar alta de portabilidad',exact:true})
  await form.getByRole('combobox',{name:'Línea de portabilidad',exact:true}).selectOption(id(5,1));await form.getByRole('combobox',{name:'Número de portabilidad',exact:true}).selectOption(id(7,1));await form.getByRole('combobox',{name:'Dirección de portabilidad',exact:true}).selectOption(direction)
  await expect(fixed).toHaveValue(id(2,1));await expect(fixed).toBeDisabled();await expect(mutable).toBeEnabled()
  await mutable.selectOption('');await expect(review).toBeDisabled();await mutable.selectOption(id(2,1));await expect(review).toBeDisabled()
  await mutable.selectOption(id(8,1));await form.getByLabel('Fecha de solicitud de portabilidad',{exact:true}).fill('2026-10-15');await expect(review).toBeEnabled();await expect(fixed).toHaveValue(id(2,1))
  await expect(form.getByText(outbound?'El operador de origen lo determina la línea vinculada.':'El operador de destino lo determina la línea vinculada.',{exact:true})).toBeVisible()
  await target.scrollIntoViewIfNeeded();await expect(origin).toBeInViewport({ratio:1});await expect(target).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath('portability-create-'+direction+'-'+width+'.png')})
  await review.click();const confirmation=page.getByRole('dialog',{name:'Registrar portabilidad',exact:true});await confirmation.getByRole('button',{name:'Confirmar cambio',exact:true}).click();await expect(confirmation.getByRole('alert')).toHaveText('No tienes permiso para esta acción.')
  expect(commands).toHaveLength(1);expect(commands[0].operation).toBe('portability.create');expect(commands[0].input).toMatchObject({line_id:id(5,1),number_identifier_id:id(7,1),direction,donor_operator_id:id(outbound?2:8,1),target_operator_id:id(outbound?8:2,1),requested_on:'2026-10-15',owner_user_id:null});expect(commands[0].input.command_id).toMatch(/^[0-9a-f-]{36}$/)
  await confirmation.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(confirmation).toHaveCount(0);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 }finally{await writeFile(info.outputPath('observations.json'),JSON.stringify({direction,width,reads,commands,errors},null,2));await page.close();await fixture.close()}
})
