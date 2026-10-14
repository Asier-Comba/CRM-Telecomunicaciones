import {expect,test} from '@playwright/test'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
for(const width of [390,768,1440])test(`billing verified receipt read failure retries only current invoice at ${width}`,async({page})=>{
 const fixture=await startBillingFocusFixture(),commands:unknown[]=[]
 let committed=false,refused=false
 let invoice={...fixture.invoice,status:'draft',number:null as typeof fixture.invoice.number|null,issued_at:null as string|null}
 await page.route('**/api/billing/v1**',async route=>{
  const q=route.request().postDataJSON()
  if(route.request().url().includes('/commands')){
   commands.push(q);expect(q.operation).toBe('invoice.issue');committed=true
   invoice={...fixture.invoice,status:'issued',version:4}
   return route.fulfill({json:{ok:true,receipt:{contract_version:'billing.v1',command_id:q.input.command_id,operation:q.operation,id:invoice.id,version:4,status:'issued',number:invoice.number}}})
  }
  if(q.operation==='invoice.get'){
   if(committed&&!refused){refused=true;return route.fulfill(width===390?{status:200,contentType:'application/json',body:'{'}:width===768?{json:{ok:true,data:{contract_version:'billing.v1',operation:q.operation,invoice:{...invoice,id:'70000000-0000-4000-8000-000000000009'}}}}:{status:503,json:{ok:false,error:'internal_safe'}})}
   return route.fulfill({json:{ok:true,data:{contract_version:'billing.v1',operation:q.operation,invoice}}})
  }
  return route.continue()
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url)
  await page.getByRole('button',{name:'Emitir factura',exact:true}).click()
  await page.getByRole('dialog',{name:'Emitir factura',exact:true}).getByRole('button',{name:'Confirmar',exact:true}).click()
  await expect(page.getByText('El cambio está registrado. Consulta la factura para confirmar sus datos actuales.',{exact:true})).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Reintentar la misma acción',exact:true})).toHaveCount(0)
  await expect(page.getByRole('combobox',{name:'Periodo',exact:true})).toBeDisabled()
  expect(commands).toHaveLength(1);expect(refused).toBe(true)
  await page.getByRole('button',{name:'Consultar factura registrada',exact:true}).click()
  await expect(page.locator('section[data-invoice-detail-id]')).toHaveAttribute('data-invoice-detail-version','4')
  await expect(page.getByRole('button',{name:'Marcar como cobrada',exact:true})).toBeVisible()
  expect(commands).toHaveLength(1)
 }finally{await page.close();await fixture.close()}
})
