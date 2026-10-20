import {expect,test} from '@playwright/test'
import {startTelecomResourceFixture} from '../../tests/e2e-preview/fixtures/telecom-resource-server.cjs'
const id='40000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',donor='20000000-0000-4000-8000-000000000001',operator='20000000-0000-4000-8000-000000000002'
const line='50000000-0000-4000-8000-000000000001',contract='60000000-0000-4000-8000-000000000001',service='70000000-0000-4000-8000-000000000001',number='80000000-0000-4000-8000-000000000001'
let fixture:Awaited<ReturnType<typeof startTelecomResourceFixture>>
test.beforeAll(async()=>{fixture=await startTelecomResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['stale','wrong_status','wrong_source','exact','newer'] as const)test(`portability cancellation keeps coherent ${mode} readback`,async({page},info)=>{
 const commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let applied=false,corrected=false,readbacks=0
 const initial={id,version:1,customer_id:customer,contract_id:contract,service_id:service,line_id:line,number_identifier_id:number,masked_display:'••••123',direction:'inbound',donor_operator_id:donor,target_operator_id:operator,requested_on:'2026-10-11',submitted_on:null,scheduled_on:null,started_on:null,completed_on:null,closed_on:null,status:'draft',reason_code:null,owner_user_id:null,source:'manual',created_at:'2026-10-11T12:00:00Z',updated_at:'2026-10-11T12:00:00Z'}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  if(['portability.create','portability.update_draft','portability.assign','portability.transition','portability.complete'].includes(q.operation)){
   commands.push(q)
   if(q.operation!=='portability.transition'){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   applied=true;data={contract_version:'portability.v1',operation:q.operation,command_id:q.input.command_id,id,version:2,status:'cancelled',source:'manual',line_effect:null}
  }else if(q.operation==='portability.get'){
   if(applied)readbacks++
   const old=!applied||!corrected&&mode==='stale',cancelled=corrected||mode!=='wrong_status'
   data={contract_version:'portability.v1',operation:q.operation,record:old?initial:{...initial,version:mode==='newer'?3:2,status:cancelled?'cancelled':'draft',source:!corrected&&mode==='wrong_source'?'integration':'manual',closed_on:cancelled?'2026-10-20':null,reason_code:cancelled?'customer_withdrew':null,updated_at:'2026-10-20T06:00:00Z'}}
  }else if(q.operation==='customer.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:customer,version:1,display_name:'Cliente sintético de portabilidad',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}
  else if(q.operation==='operator.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[donor,operator].map((key,i)=>({id:key,version:1,code:'oier_'+i,display_name:i?'Operador destino sintético':'Operador origen sintético',status:'active',source:'manual'})),next_id:null}
  else if(q.operation==='operator.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:{id:q.input.id,version:1,code:q.input.id===donor?'oier_0':'oier_1',display_name:q.input.id===donor?'Operador origen sintético':'Operador destino sintético',status:'active',source:'manual'}}
  else if(q.operation==='assignee.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}
  else if(q.operation==='line.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:line,version:1,service_id:service,customer_id:customer,contract_id:contract,operator_id:operator,plan_version_id:null,display_name:'Línea sintética sin cambio de estado',status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null,service_kind:'mobile',masked_msisdn:'••••123',sim_id:null,sim_kind:null,sim_status:null,masked_iccid:null,masked_eid:null,portability_id:id,portability_status:applied?'cancelled':'draft',open_commitment_count:0,next_commitment_ends_on:null}],next_id:null}
  else if(q.operation==='portfolio.get'){
   const base={id:q.input.id,version:1,status:'active',source:'manual',customer_id:customer,operator_id:operator,plan_version_id:null}
   data={contract_version:'portfolio.v1',kind:q.input.kind,record:q.input.kind==='contract'?{...base,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}:{...base,contract_id:contract,service_kind:'mobile',display_name:'Servicio sintético',activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'}}
  }else{await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.goto(fixture.url+'/?kind=portability')
  const review=page.getByRole('button',{name:'Revisar seguimiento de portabilidad',exact:true})
  await expect(review).toBeVisible()
  await page.getByRole('combobox',{name:'Nuevo estado de portabilidad',exact:true}).selectOption('cancelled')
  await page.getByLabel('Fecha efectiva de portabilidad',{exact:true}).fill('2026-10-20')
  await page.getByRole('combobox',{name:'Motivo de cierre de portabilidad',exact:true}).selectOption('customer_withdrew')
  await review.click()
  const confirm=page.getByRole('dialog',{name:'Confirmar cambio de portabilidad',exact:true})
  await confirm.getByRole('button',{name:'Confirmar cambio',exact:true}).click()
  await expect.poll(()=>readbacks>0).toBe(true)
  if(['stale','wrong_status','wrong_source'].includes(mode)){
   const retry=page.getByRole('button',{name:'Actualizar lectura',exact:true})
   await info.attach('confirmed-readback-observation',{body:JSON.stringify({mode,commands,readbacks,reviewCount:await review.count(),retryCount:await retry.count()}),contentType:'application/json'})
   await expect(retry).toBeEnabled();await expect(review).toBeDisabled();await expect(confirm).toHaveCount(0)
   await expect(page.getByRole('status').filter({hasText:'Cambio registrado. Reintentar solo actualiza la lectura.'})).toBeVisible()
   await page.locator('#main-content').evaluate(el=>{el.scrollTop=0})
   await page.screenshot({path:info.outputPath(`portability-${mode}-registered-context.png`)})
   await retry.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`portability-${mode}-registered.png`)})
   corrected=true;await retry.click()
  }
  await expect(page.getByText('Cancelado',{exact:true})).toBeVisible();await expect(review).toHaveCount(0)
  expect(commands).toHaveLength(1);expect(commands[0].operation).toBe('portability.transition')
  expect(commands[0].input).toMatchObject({id,expected_version:1,status:'cancelled',effective_on:'2026-10-20',reason_code:'customer_withdrew',evidence_source:'manual'})
  expect(commands[0].input).not.toHaveProperty('line_action');expect(commands[0].input).not.toHaveProperty('expected_line_version')
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.locator('#main-content').evaluate(el=>{el.scrollTop=0})
  await page.screenshot({path:info.outputPath(`portability-${mode}-coherent.png`)})
 }finally{await page.close()}
})
