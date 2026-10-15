import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const uuid=(kind:number,n=1)=>`${kind}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const customer=uuid(1),operatorA=uuid(2),operatorB=uuid(2,2)
const contract=(n:number)=>({id:uuid(3,n),version:1,customer_id:customer,operator_id:n%2?operatorA:operatorB,plan_version_id:null,assigned_user_id:null,status:'active',source:'manual',start_date:'2026-10-01',end_date:null})
for(const mode of ['labels','page','operator_denied','contracts_denied','customer_mismatch','retired'] as const)for(const width of [390,768,1440])test(`case contract selection ${mode} at ${width}`,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:string[]=[],errors:string[]=[]
 let failed=false,held=false,release:()=>void=()=>{}
 const gate=new Promise<void>(resolve=>{release=resolve})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(!q.operation.endsWith('.list')&&!q.operation.endsWith('.get')){commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
  if(q.operation==='contract.list'){
   if(mode==='retired'&&!held){held=true;await gate}
   if(mode==='contracts_denied'&&!failed){failed=true;await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   const n=Number(String(q.input.after_id??uuid(3,0)).slice(-12))+1
   const items=q.input.limit===1?[contract(n)]:q.input.after_id?[contract(21)]:Array.from({length:20},(_,i)=>contract(i+1))
   if(mode==='customer_mismatch'&&!failed){failed=true;items[0]={...items[0],customer_id:uuid(1,2)}}
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items,next_id:q.input.limit===20&&!q.input.after_id?uuid(3,20):null}}});return
  }
  if(q.operation==='operator.get'){
   if(mode==='operator_denied'&&q.input.id===operatorB){await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,record:{id:q.input.id,version:1,code:q.input.id===operatorA?'synthetic_a':'synthetic_b',display_name:q.input.id===operatorA?'Operador sintético Norte':'Operador sintético Sur',status:'active',source:'manual'}}}});return
  }
  if(q.operation==='case.list'){await route.fulfill({json:{ok:true,data:{contract_version:'case.v1',operation:q.operation,items:[],next_id:null}}});return}
  if(q.operation==='assignee.list'||q.operation==='service.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=case-create')
  await page.getByRole('button',{name:'Nueva incidencia',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Nueva incidencia',exact:true}),select=dialog.getByRole('combobox',{name:'Contrato de la incidencia',exact:true})
  if(mode==='retired'){
   await expect.poll(()=>held).toBe(true);await dialog.getByRole('button',{name:'Cerrar panel',exact:true}).click();await expect(dialog).toHaveCount(0)
   const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='contract.list');release();await (await response).finished();await page.waitForLoadState('networkidle')
   expect(reads.filter(q=>q.operation==='operator.get')).toHaveLength(0);expect(commands).toEqual([]);expect(errors).toEqual([]);return
  }
  if(mode==='contracts_denied'||mode==='customer_mismatch'){
   await expect(dialog.getByRole('alert')).toHaveText(mode==='contracts_denied'?'No tienes permiso para esta acción.':'No se pudo completar la acción.');await expect(select).toBeDisabled()
   expect(reads.filter(q=>q.operation==='operator.get')).toHaveLength(0)
   await dialog.getByRole('button',{name:'Actualizar relaciones de contrato',exact:true}).click()
  }
  await expect(select.locator('option')).toHaveCount(21)
  await expect(select.locator(`option[value="${uuid(3,1)}"]`)).toHaveText('Contrato \u00b7 Operador sint\u00e9tico Norte \u00b7 01 oct 2026 \u00b7 Activo')
  await expect(select.locator(`option[value="${uuid(3,2)}"]`)).toContainText(mode==='operator_denied'?'Operador no disponible':'Operador sintético Sur')
  expect(reads.filter(q=>q.operation==='operator.get')).toHaveLength(2)
  await select.selectOption(uuid(3,2));await expect(select).toHaveValue(uuid(3,2))
  await expect.poll(()=>reads.filter(q=>q.operation==='service.list').at(-1)?.input.contract_id).toBe(uuid(3,2))
  if(mode==='page'){
   await dialog.getByRole('button',{name:'Más relaciones de contrato',exact:true}).click()
   await expect(select.locator('option')).toHaveCount(3)
   await expect(select.locator(`option[value="${uuid(3,2)}"]`)).toContainText('Operador sintético Sur')
   await expect(select.locator(`option[value="${uuid(3,2)}"]`)).toBeEnabled()
   await expect(select.locator(`option[value="${uuid(3,21)}"]`)).toContainText('Operador sintético Norte')
  }
  const list=reads.filter(q=>q.operation==='contract.list');expect(list[0].input).toEqual({customer_id:customer,limit:20,sort:'id_asc'})
  expect(list.some(q=>q.input.limit===1&&q.input.after_id===uuid(3,1)&&q.input.customer_id===customer)).toBe(true)
  if(mode==='page')expect(list.some(q=>q.input.limit===20&&q.input.after_id===uuid(3,20))).toBe(true)
  expect(commands).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await select.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`case-contract-${mode}-${width}.png`)})
 }finally{release();await page.unrouteAll({behavior:'wait'});await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,reads,commands,errors},null,2));await page.close();await fixture.close()}
})
