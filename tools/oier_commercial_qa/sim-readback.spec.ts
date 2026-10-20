import {expect,test} from '@playwright/test'
import {startTelecomResourceFixture} from '../../tests/e2e-preview/fixtures/telecom-resource-server.cjs'
const id='40000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',operator='20000000-0000-4000-8000-000000000001'
const title='SIM sintética preparada sin identificadores'
let fixture:Awaited<ReturnType<typeof startTelecomResourceFixture>>
test.beforeAll(async()=>{fixture=await startTelecomResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['stale','wrong_status','wrong_source','exact','newer'] as const)test(`SIM cancellation receipt keeps coherent ${mode} readback`,async({page},info)=>{
 const commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let applied=false,corrected=false,readbacks=0
 const initial={id,version:1,customer_id:customer,operator_id:operator,kind:'physical',display_label:title,status:'prepared',source:'manual',masked_iccid:null,masked_eid:null,assigned_line_id:null,activated_at:null,replaced_at:null,deactivated_at:null,cancelled_at:null,created_at:'2026-10-11T12:00:00Z',updated_at:'2026-10-11T12:00:00Z'}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();let data:unknown
  if(q.operation==='sim.cancel'){
   commands.push(q);applied=true
   data={contract_version:'sim.v1',operation:q.operation,command_id:q.input.command_id,id,version:2,status:'cancelled',source:'manual',association_id:null,replacement_id:null,replacement_version:null,replacement_status:null,replacement_association_id:null}
  }else if(q.operation==='sim.get'){
   if(applied)readbacks++
   const old=!applied||!corrected&&mode==='stale',cancelled=corrected||mode!=='wrong_status'
   const record=old?initial:{...initial,version:mode==='newer'?3:2,status:cancelled?'cancelled':'prepared',source:!corrected&&mode==='wrong_source'?'integration':'manual',cancelled_at:cancelled?'2026-10-20T06:00:00Z':null,updated_at:'2026-10-20T06:00:00Z'}
   data={contract_version:'sim.v1',operation:q.operation,record}
  }else if(q.operation==='customer.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[{id:customer,version:1,display_name:'Cliente sintético de SIM',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}
  else if(q.operation==='operator.get')data={contract_version:'telecom.collections.v1',operation:q.operation,record:{id:operator,version:1,code:'oier_synthetic',display_name:'Operador sintético',status:'active',source:'manual'}}
  else if(q.operation==='line.list')data={contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}
  else{await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  await route.fulfill({json:{ok:true,data}})
 })
 try{
  await page.goto(fixture.url+'/?kind=sim')
  const review=page.getByRole('button',{name:'Revisar cancelación de SIM/eSIM',exact:true})
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(review).toBeEnabled()
  await review.click()
  const confirm=page.getByRole('dialog',{name:'Confirmar cambio de SIM/eSIM',exact:true})
  await confirm.getByRole('button',{name:'Confirmar cambio',exact:true}).click()
  await expect.poll(()=>readbacks>0).toBe(true)
  if(['stale','wrong_status','wrong_source'].includes(mode)){
   const retry=page.getByRole('button',{name:'Actualizar lectura',exact:true})
   await info.attach('confirmed-readback-observation',{body:JSON.stringify({mode,commands,readbacks,reviewCount:await review.count(),retryCount:await retry.count()}),contentType:'application/json'})
   await expect(retry).toBeEnabled();await expect(review).toBeDisabled();await expect(confirm).toHaveCount(0)
   await expect(page.getByRole('status').filter({hasText:'Cambio registrado. Reintentar solo actualiza la lectura.'})).toBeVisible()
   await retry.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`sim-${mode}-registered.png`)})
   corrected=true;await retry.click()
  }
  await expect(page.getByText('Cancelado',{exact:true})).toBeVisible()
  await expect(review).toHaveCount(0)
  expect(commands).toHaveLength(1);expect(commands[0].operation).toBe('sim.cancel')
  expect(Object.keys(commands[0].input).sort()).toEqual(['command_id','expected_version','id'])
  expect(commands[0].input).toMatchObject({id,expected_version:1})
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.locator('#main-content').evaluate(el=>{el.scrollTop=0})
  await page.screenshot({path:info.outputPath(`sim-${mode}-coherent.png`)})
 }finally{await page.close()}
})
