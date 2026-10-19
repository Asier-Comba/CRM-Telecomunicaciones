import {expect,test} from '@playwright/test'
import {startBillingFocusFixture} from './fixtures/billing-focus-server.cjs'
const uuid=(kind:number,n=1)=>`${kind}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const customer=uuid(1,2),operatorA=uuid(2),operatorB=uuid(2,2)
const contract=(n:number)=>({id:uuid(3,n),version:1,customer_id:customer,operator_id:n%2?operatorA:operatorB,plan_version_id:null,assigned_user_id:null,status:'active',source:'manual',start_date:'2026-10-01',end_date:null})
for(const mode of ['labels','page','operator_denied','contracts_denied'] as const)for(const width of [390,768,1440])test(`invoice contract selection ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startBillingFocusFixture({preparationCustomer:true,loadedPreparation:true}),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:string[]=[],errors:string[]=[]
 let failed=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().includes('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='contract.list'){
   if(mode==='contracts_denied'&&!failed){failed=true;await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   const next=Number(String(q.input.after_id??uuid(3,0)).slice(-12))+1
   const items=q.input.limit===1?[contract(next)]:q.input.after_id?[contract(21)]:Array.from({length:20},(_,i)=>contract(i+1))
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items,next_id:q.input.limit===20&&!q.input.after_id?uuid(3,20):null}}});return
  }
  if(q.operation==='operator.get'){
   if(mode==='operator_denied'&&q.input.id===operatorB){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,record:{id:q.input.id,version:1,code:q.input.id===operatorA?'synthetic_a':'synthetic_b',display_name:q.input.id===operatorA?'Operador sintético Norte':'Operador sintético Sur',status:'active',source:'manual'}}}});return
  }
  await route.continue()
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/#create-customer')
  const preparation=page.getByRole('dialog',{name:'Nueva factura',exact:true})
  await preparation.getByLabel('Buscar empresa para factura').fill('Synthetic')
  await expect(preparation.getByLabel('Cliente vinculado').locator(`option[value="${customer}"]`)).toHaveCount(1)
  await preparation.getByLabel('Cliente vinculado').selectOption(customer);await preparation.getByRole('button',{name:'Preparar borrador',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'Revisar borrador local',exact:true}),select=editor.getByRole('combobox',{name:'Contrato de factura',exact:true})
  await expect(editor).toBeVisible()
  if(mode==='contracts_denied'){
   await expect(editor.getByRole('alert')).toHaveText('No tienes permiso para esta acción.');await expect(select).toBeDisabled()
   expect(reads.filter(q=>q.operation==='operator.get')).toHaveLength(0)
   await editor.getByRole('button',{name:'Actualizar vínculos de contrato',exact:true}).click()
  }
  await expect(select.locator('option')).toHaveCount(21)
  await info.attach('loaded-contract-options',{body:JSON.stringify(await select.locator('option').allTextContents()),contentType:'application/json'})
  await expect(select.locator(`option[value="${uuid(3,1)}"]`)).toContainText('Operador sintético Norte')
  await expect(select.locator(`option[value="${uuid(3,2)}"]`)).toHaveText(mode==='operator_denied'?/^Contrato · Operador no disponible · /:/^Contrato · Operador sintético Sur · /)
  expect(reads.filter(q=>q.operation==='operator.get')).toHaveLength(2)
  let selected=uuid(3,2)
  if(mode==='page'){
   await editor.getByRole('button',{name:'Más vínculos de contrato',exact:true}).click();await expect(select.locator('option')).toHaveCount(2);selected=uuid(3,21)
   await expect(select.locator(`option[value="${selected}"]`)).toContainText('Operador sintético Norte')
  }
  await select.selectOption(selected);await expect(select).toHaveValue(selected)
  const current=editor.locator('[data-invoice-relation-current="contractId"]')
  await expect(current).toContainText(mode==='operator_denied'?'Operador no disponible':mode==='page'?'Operador sintético Norte':'Operador sintético Sur')
  const contractReads=reads.filter(q=>q.operation==='contract.list')
  expect(contractReads[0].input).toEqual({customer_id:customer,limit:20,sort:'id_asc'})
  expect(contractReads.at(-1)?.input).toEqual({customer_id:customer,limit:1,sort:'id_asc',after_id:uuid(3,mode==='page'?20:1)})
  if(mode==='page')expect(contractReads.some(q=>q.input.limit===20&&q.input.after_id===uuid(3,20))).toBe(true)
  await expect.poll(()=>reads.filter(q=>q.operation==='service.list').at(-1)?.input.contract_id).toBe(selected)
  expect(reads.filter(q=>q.operation==='service.list').at(-1)?.input.customer_id).toBe(customer)
  await current.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`invoice-contract-${mode}-${width}.png`)})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(commands).toEqual([]);expect(errors).toEqual([])
 }finally{await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
