import {expect,test} from '@playwright/test'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const id=(n:number)=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`,customer='10000000-0000-4000-8000-000000000001'
const record=(n:number)=>({id:id(n),version:1,status:'draft',source:'manual',customer_id:customer,operator_id:'20000000-0000-4000-8000-000000000001',
 plan_version_id:null,start_date:'2026-10-01',signed_date:`2026-10-0${n}`,end_date:null,assigned_user_id:null})
// Real component/repository/DTOs in Chromium, synthetic transport. A confirmed
// close/rerender defect is independent of the full Supabase failure's unknown RCA.
for(const width of [390,768,1440])test(`a closed portfolio reference stays closed across an unchanged parent context at ${width}`,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),reads=new Map<number,number>(),commands:string[]=[],errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const {operation,input}=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(operation==='portfolio.get'){
   const n=Number(input.id.slice(-12));reads.set(n,(reads.get(n)??0)+1)
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:'contract',record:record(n)}}});return
  }
  if(operation==='customer.list'){
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[{id:customer,version:1,display_name:'Synthetic linked customer',account_kind:'legal_entity',lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}],next_id:null}}});return
  }
  if(['contract.list','service.list','line.list','assignee.list'].includes(operation)){
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation,items:[],next_id:null}}});return
  }
  await route.fulfill({status:400,json:{ok:false,error:'validation'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portfolio&portfolio_reference='+id(1))
  const dialog=page.getByRole('dialog',{name:'Contrato: Contrato',exact:true})
  await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Fecha de firma',{exact:true})).toHaveValue('2026-10-01')
  await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)
  await page.getByRole('button',{name:'Actualizar contexto sintético',exact:true}).click()
  await expect(page.getByLabel('Versión de contexto sintético',{exact:true})).toHaveText('1')
  await expect(dialog).toHaveCount(0);expect(reads.get(1)).toBe(1)
  await expect(page.locator(`article[data-portfolio-id="${id(1)}"]`)).toBeVisible()
  await page.getByRole('button',{name:'Cambiar referencia sintética',exact:true}).click()
  await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Fecha de firma',{exact:true})).toHaveValue('2026-10-02')
  expect(reads.get(2)).toBe(1);expect(commands).toEqual([]);expect(errors).toEqual([])
  await page.screenshot({path:info.outputPath('portfolio-reference-current-'+width+'.png')})
 }finally{await page.close();await fixture.close()}
})
