import {expect,test} from '@playwright/test'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'

const id='10000000-0000-4000-8000-000000000001'
const customer={contract_version:'product.v1',id,version:1,account_kind:'legal_entity',legal_name:'Synthetic preparation A',trade_name:null,lifecycle:'customer',status:'active',source:'manual',assigned_user_id:null}
// Actual billing component/repository/parsers, controlled reads. No Auth/DB or writes.
for(const width of [390,768,1440])for(const denied of [false,true])test(`billing preparation ${denied?'denied':'ready'} at ${width}`,async({page},info)=>{
 const fixture=await startBillingFocusFixture(),commands:string[]=[],errors:string[]=[]
 let release!:()=>void,waiting=false,customerReads=0
 const hold=new Promise<void>(resolve=>release=resolve)
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/api/**',async route=>{
  const body=route.request().postDataJSON()
  if(route.request().url().endsWith('/commands')){commands.push(body.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(body.operation==='global.search'){await route.fulfill({json:{ok:true,data:{contract_version:'product.v1',items:[{kind:'customer',id,customer_id:id,label:customer.legal_name,status:'active'}]}}});return}
  if(body.operation==='customer.editor'){
   customerReads++;expect(body.input).toEqual({id});waiting=true;await hold
   if(denied&&customerReads===1)await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
   else await route.fulfill({json:{ok:true,data:customer}})
   return
  }
  await route.continue()
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/#new')
  const drawer=page.getByRole('dialog',{name:'Nueva factura',exact:true})
  await drawer.getByRole('textbox',{name:'Buscar empresa para factura',exact:true}).fill('Synthetic')
  await expect(drawer.getByRole('combobox',{name:'Cliente vinculado',exact:true}).getByRole('option',{name:customer.legal_name,exact:true})).toHaveCount(1)
  await drawer.getByRole('combobox',{name:'Cliente vinculado',exact:true}).selectOption(id)
  await drawer.getByRole('button',{name:'Preparar borrador',exact:true}).click()
  await expect.poll(()=>waiting).toBe(true)
  // Escape must not let a late response reopen a drawer the user has dismissed.
  await page.keyboard.press('Escape')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('button',{name:'Cerrar panel',exact:true})).toBeDisabled()
  await expect(drawer.getByRole('textbox',{name:'Buscar empresa para factura',exact:true})).toBeDisabled()
  await expect(drawer.getByRole('combobox',{name:'Cliente vinculado',exact:true})).toBeDisabled()
  await expect(drawer.getByRole('status')).toHaveText('Consultando el cliente y su configuración…')
  await page.screenshot({path:info.outputPath(`preparation-pending-${width}.png`)})
  release()
  if(denied){
   await expect(drawer.getByRole('alert')).toBeVisible()
   await expect(page.getByRole('combobox',{name:'Cliente de factura',exact:true})).toHaveCount(0)
   await expect(drawer.getByRole('combobox',{name:'Cliente vinculado',exact:true})).toBeEnabled()
   await expect(drawer.getByRole('combobox',{name:'Cliente vinculado',exact:true})).toHaveValue(id)
   await expect(drawer.getByRole('button',{name:'Cerrar panel',exact:true})).toBeEnabled()
   await drawer.getByRole('button',{name:'Preparar borrador',exact:true}).click()
  }
  await expect(drawer).toHaveCount(0)
  await expect(page.getByRole('combobox',{name:'Cliente de factura',exact:true})).toHaveValue(id)
  await expect(page.getByRole('combobox',{name:'Cliente de factura',exact:true}).getByRole('option',{name:customer.legal_name,exact:true})).toHaveCount(1)
  expect(customerReads).toBe(denied?2:1);expect(commands).toEqual([]);expect(errors).toEqual([])
 }finally{release();await page.unrouteAll({behavior:'wait'});await fixture.close()}
})
