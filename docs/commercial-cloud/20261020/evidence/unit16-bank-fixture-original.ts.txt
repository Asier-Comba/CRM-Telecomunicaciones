import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from '../../tests/e2e-preview/fixtures/customer-resource-server.cjs'
const id='10000000-0000-4000-8000-000000000001'
const customer={id,version:1,account_kind:'legal_entity',display_name:'Synthetic case customer',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}
const original={id,version:1,customer_id:id,contract_id:null,service_id:null,line_id:null,case_type:'technical',title:'Synthetic resolution recovery',priority:'normal',due_on:null,assigned_user_id:null,status:'open',source:'manual',resolved_at:null,closed_at:null,resolution_code:null,cancellation_code:null,internal_note_count:0,created_at:'2026-10-01T10:00:00.000Z',updated_at:'2026-10-01T10:00:00.000Z',overdue:false}
let fixture:Awaited<ReturnType<typeof startCustomerResourceFixture>>
test.beforeAll(async()=>{fixture=await startCustomerResourceFixture()})
test.afterAll(async()=>{await fixture?.close()})
for(const mode of ['stale','wrong_status','wrong_source','wrong_resolution','confirmed','newer'] as const)test(`case resolution requires coherent ${mode} readback`,async({page},info)=>{
 const commands:string[]=[],errors:string[]=[]
 let applied=false,corrected=false,readbacks=0
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){
   commands.push(operation);applied=true
   await route.fulfill({json:{ok:true,receipt:{contract_version:'case.v1',operation,command_id:input.command_id,id,version:2,status:'resolved',source:'manual',resolution_code:'issue_fixed',cancellation_code:null,note_id:null,note_seq:null}}});return
  }
  if(operation==='case.get'){
   if(applied)readbacks++
   const row=!applied||!corrected&&mode==='stale'?original:{...original,version:mode==='newer'?3:2,status:!corrected&&mode==='wrong_status'?'open':mode==='newer'?'closed':'resolved',source:!corrected&&mode==='wrong_source'?'import':'manual',resolution_code:!corrected&&mode==='wrong_status'?null:!corrected&&mode==='wrong_resolution'?'request_fulfilled':'issue_fixed',resolved_at:!corrected&&mode==='wrong_status'?null:'2026-10-02T10:00:00.000Z',closed_at:mode==='newer'?'2026-10-03T10:00:00.000Z':null,updated_at:'2026-10-03T10:00:00.000Z'}
   await route.fulfill({json:{ok:true,data:{contract_version:'case.v1',operation,record:row}}});return
  }
  if(operation==='customer.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[customer],next_id:null}}});return}
  if(operation==='assignee.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.goto(fixture.url+'/?kind=case')
  await page.getByRole('button',{name:'Revisar resolución',exact:true}).click()
  const confirm=page.getByRole('dialog',{name:'Confirmar cambio de incidencia',exact:true})
  await confirm.getByRole('button',{name:'Confirmar cambio',exact:true}).click()
  await expect.poll(()=>readbacks).toBe(1)
  if(!['confirmed','newer'].includes(mode)){
   await info.attach('case-readback-observation',{body:JSON.stringify({mode,commands,readbacks}),contentType:'application/json'})
   await expect(confirm).toBeVisible()
   await expect(confirm.getByRole('alert')).toBeVisible()
   await confirm.getByRole('button',{name:'Cancelar',exact:true}).click()
   const notice=page.getByRole('status').filter({hasText:'Cambio registrado. Reintentar solo actualiza la lectura.'})
   await expect(notice).toBeVisible();await notice.scrollIntoViewIfNeeded()
   await page.screenshot({path:info.outputPath(`case-${mode}-pending.png`)})
   corrected=true
   await page.getByRole('button',{name:'Actualizar incidencia confirmada',exact:true}).click()
   await expect.poll(()=>readbacks).toBe(2)
  }
  await expect(confirm).toHaveCount(0)
  await expect(page.locator('header').getByText('Resolución: Problema corregido',{exact:true})).toBeVisible()
  if(mode==='newer')await expect(page.getByRole('button',{name:'Revisar reapertura',exact:true})).toHaveCount(0)
  else await expect(page.getByRole('button',{name:'Revisar reapertura',exact:true})).toBeVisible()
  expect(commands).toEqual(['case.resolve']);expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath(`case-${mode}-current.png`)})
 }finally{await page.unrouteAll({behavior:'wait'})}
})
