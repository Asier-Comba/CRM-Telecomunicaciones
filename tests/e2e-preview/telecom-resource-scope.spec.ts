import {expect,test,type Route} from '@playwright/test'
import {startTelecomResourceFixture} from './fixtures/telecom-resource-server.cjs'
// Real components and DTO validation; synthetic transport is not SQL/Auth/RLS.
const id=(n:number)=>`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const customer=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const title=(n:number)=>`Synthetic resource ${['A','B','C','D'][n-1]}`
const row=(kind:string,n:number)=>kind==='case'?{id:id(n),version:1,customer_id:customer(n),contract_id:null,service_id:null,line_id:null,case_type:'technical',title:title(n),priority:'normal',due_on:null,assigned_user_id:null,status:'open',source:'manual',resolved_at:null,closed_at:null,resolution_code:null,cancellation_code:null,internal_note_count:0,created_at:'2026-10-11T12:00:00Z',updated_at:'2026-10-11T12:00:00Z',overdue:false}:{id:id(n),version:1,customer_id:customer(n),operator_id:'20000000-0000-4000-8000-000000000001',kind:'physical',display_label:title(n),status:'prepared',source:'manual',masked_iccid:null,masked_eid:null,assigned_line_id:null,activated_at:null,replaced_at:null,deactivated_at:null,cancelled_at:null,created_at:'2026-10-11T12:00:00Z',updated_at:'2026-10-11T12:00:00Z'}
const reply=(route:Route,kind:string,n:number)=>route.fulfill({json:{ok:true,data:{contract_version:kind+'.v1',operation:kind+'.get',record:row(kind,n)}}})
for(const kind of ['case','sim'])for(const width of [390,768,1440])test(`telecom ${kind} discards old resource and equal-version editor at ${width}`,async({page},info)=>{
 const fixture=await startTelecomResourceFixture(),commands:string[]=[],errors:string[]=[],held:Route[]=[],late:Route[]=[]
 let holdB=true,delayA=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation===kind+'.get'){
   const n=Number(input.id.slice(-12))
   if(n===4){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   if(n===2&&holdB){held.push(route);return}
   if(n===1&&delayA){late.push(route);return}
   await reply(route,kind,n);return
  }
  if(operation==='customer.list'){const n=Number(input.after_id.slice(-12))+1;await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[{id:customer(n),version:1,display_name:`Synthetic customer ${n}`,account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return}
  if(operation==='operator.get'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,record:{id:input.id,version:1,code:'synthetic_2',display_name:'Synthetic operator 2',status:'active',source:'manual'}}}});return}
  if(['operator.list','assignee.list','line.list'].includes(operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return}
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind='+kind)
  await expect(page.getByRole('heading',{name:title(1),exact:true})).toBeVisible()
  if(kind==='case'){
   await page.getByLabel('Título de incidencia',{exact:true}).fill('Draft of resource A')
   await page.getByRole('button',{name:'Seleccionar recurso A',exact:true}).dispatchEvent('click')
   await expect(page.getByLabel('Título de incidencia',{exact:true})).toHaveValue('Draft of resource A')
  }else{
   await page.getByRole('button',{name:'Revisar cancelación de SIM/eSIM',exact:true}).click()
   await expect(page.getByRole('dialog')).toBeVisible()
  }
  await page.getByRole('button',{name:'Seleccionar recurso B',exact:true}).dispatchEvent('click');await expect.poll(()=>held.length).toBe(1)
  await expect(page.getByRole('heading',{name:title(1),exact:true})).toHaveCount(0);await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('Título de incidencia',{exact:true})).toHaveCount(0)
  holdB=false;await reply(held[0],kind,2)
  await expect(page.getByRole('heading',{name:title(2),exact:true})).toBeVisible()
  if(kind==='case')await expect(page.getByLabel('Título de incidencia',{exact:true})).toHaveValue(title(2))
  // A repeated parent reference preserves current state; a new reference must
  // remove it even if the two unrelated records share version 1.
  delayA=true;await page.getByRole('button',{name:'Seleccionar recurso A',exact:true}).dispatchEvent('click');await expect.poll(()=>late.length).toBe(1)
  await page.getByRole('button',{name:'Seleccionar recurso C',exact:true}).dispatchEvent('click')
  await expect(page.getByRole('heading',{name:title(3),exact:true})).toBeVisible()
  if(kind==='case')await expect(page.getByLabel('Título de incidencia',{exact:true})).toHaveValue(title(3))
  const response=page.waitForResponse(r=>r.url()===late[0].request().url()&&r.request().postData()===late[0].request().postData());await reply(late[0],kind,1);await response
  await expect(page.getByRole('heading',{name:title(3),exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:title(1),exact:true})).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  if(kind==='sim')await expect(page.locator('header').filter({has:page.getByRole('heading',{name:title(3),exact:true})})).toContainText('Synthetic operator 2')
  await page.screenshot({path:info.outputPath(`telecom-current-${kind}-${width}.png`)})
  await page.getByRole('button',{name:'Seleccionar recurso D',exact:true}).dispatchEvent('click')
  await expect(page.getByRole('alert').first()).toBeVisible();await expect(page.getByRole('heading',{name:title(3),exact:true})).toHaveCount(0)
  expect(commands).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }finally{await page.close();await fixture.close()}
})
