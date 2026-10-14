import {expect,test} from '@playwright/test'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const uuid=(kind:number,n=1)=>`${kind}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const customer=uuid(1),operatorA=uuid(2),operatorB=uuid(2,2),contract=(n:number)=>({id:uuid(3,n),version:1,customer_id:customer,operator_id:n%2?operatorA:operatorB,plan_version_id:null,assigned_user_id:null,status:'active',source:'manual',start_date:'2026-10-01',end_date:null})
for(const mode of ['labels','page','operator_denied','contracts_denied'] as const)for(const width of [390,768,1440])test(`customer document contracts ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[],commands:string[]=[]
 let failed=false
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(route.request().url().endsWith('/commands')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='document.list'){await route.fulfill({json:{ok:true,data:{contract_version:'document.v1',operation:q.operation,items:[],next_id:null}}});return}
  if(q.operation==='contract.list'){
   if(mode==='contracts_denied'&&!failed){failed=true;await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:q.input.after_id?[contract(21)]:Array.from({length:20},(_,i)=>contract(i+1)),next_id:q.input.after_id?null:uuid(3,20)}}});return
  }
  if(q.operation==='operator.get'){
   if(mode==='operator_denied'&&q.input.id===operatorB){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,record:{id:q.input.id,version:1,code:q.input.id===operatorA?'synthetic_a':'synthetic_b',display_name:q.input.id===operatorA?'Operador sintético Norte':'Operador sintético Sur',status:'active',source:'manual'}}}});return
  }
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=customer-document-targets')
  await page.getByRole('combobox',{name:'Destino de documentos del cliente',exact:true}).selectOption('contract')
  const select=page.getByRole('combobox',{name:'Registro para documentos del cliente',exact:true})
  if(mode==='contracts_denied'){
   await expect(page.getByRole('alert')).toHaveText('No tienes permiso para esta acción.');await expect(select).toBeDisabled();expect(reads.filter(q=>q.operation==='operator.get')).toHaveLength(0)
   await page.getByRole('button',{name:'Reintentar destinos',exact:true}).click()
  }
  await expect(select.locator('option')).toHaveCount(21)
  await info.attach('contract-options-before-selection',{body:JSON.stringify(await select.locator('option').allTextContents()),contentType:'application/json'})
  await expect(select.locator('option').filter({hasText:'Operador sintético Norte'})).toHaveCount(10)
  await expect(select.locator(`option[value="${uuid(3,2)}"]`)).toContainText(mode==='operator_denied'?'Operador no disponible':'Operador sintético Sur')
  await expect(select.locator(`option[value="${uuid(3,2)}"]`)).toHaveText(mode==='operator_denied'?/^Contrato · Operador no disponible · /:/^Contrato · Operador sintético Sur · /)
  expect(reads.filter(q=>q.operation==='operator.get')).toHaveLength(2)
  let selected=uuid(3,2)
  if(mode==='page'){
   await page.getByRole('button',{name:'Más destinos',exact:true}).click();await expect(select.locator('option')).toHaveCount(2)
   selected=uuid(3,21);await expect(select.locator(`option[value="${selected}"]`)).toContainText('Operador sintético Norte')
  }
  await select.selectOption(selected)
  await expect(page.getByRole('heading',{level:2}).filter({hasText:mode==='operator_denied'?'Operador no disponible':mode==='page'?'Operador sintético Norte':'Operador sintético Sur'})).toBeVisible()
  await expect.poll(()=>reads.filter(q=>q.operation==='document.list'&&q.input.target_kind==='contract').at(-1)?.input.target_id).toBe(selected)
  const pages=reads.filter(q=>q.operation==='contract.list');expect(pages[0].input).toEqual({customer_id:customer,limit:20})
  if(mode==='page')expect(pages.at(-1)?.input).toEqual({customer_id:customer,limit:20,after_id:uuid(3,20)})
  await expect(select).toBeEnabled();await select.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`document-contract-${mode}-${width}.png`)})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(commands).toEqual([]);expect(errors).toEqual([])
 }finally{await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
