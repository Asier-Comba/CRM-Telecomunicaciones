import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCustomerResourceFixture} from './fixtures/customer-resource-server.cjs'
const customer='10000000-0000-4000-8000-000000000001',service='30000000-0000-4000-8000-000000000001',contract='20000000-0000-4000-8000-000000000001',operator='40000000-0000-4000-8000-000000000001',foreign='10000000-0000-4000-8000-000000000002'
const serviceRecord={id:service,version:1,customer_id:customer,contract_id:contract,operator_id:operator,plan_version_id:null,service_kind:'mobile',display_name:'Servicio sintético autorizado',status:'active',source:'manual',activated_on:'2026-10-01',ended_on:null,status_effective_on:'2026-10-01'}
const contractRecord={id:contract,version:1,customer_id:customer,operator_id:operator,plan_version_id:null,start_date:'2026-10-01',signed_date:null,end_date:null,assigned_user_id:null,status:'active',source:'manual'}
const line='50000000-0000-4000-8000-000000000001',lineRecord={id:line,version:1,service_id:service,display_name:'Línea sintética preparada',status:'pending',source:'manual',activated_on:null,ended_on:null,status_effective_on:null}
for(const mode of ['retired_company','retired_actor','retired_reader','retired_inventory','current','service_denied','contract_denied','service_foreign','contract_foreign','saved_line_retired','saved_service_retired','saved_current'] as const)for(const width of [390,768,1440])test('line parent read '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCustomerResourceFixture(),reads:{operation:string;input:Record<string,unknown>}[]=[],commands:string[]=[],errors:string[]=[]
 let held=false,failed=false,serviceGets=0,release:()=>void=()=>{}
 const gate=new Promise<void>(resolve=>{release=resolve})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON();reads.push(q)
  if(q.operation==='line.create_manual'){
   commands.push(q.operation)
   expect(q.input.service_id).toBe(service);expect(q.input.display_name).toBe(lineRecord.display_name)
   await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation:q.operation,command_id:q.input.command_id,id:line,version:1,status:'pending',source:'manual'}}});return
  }
  if(q.operation==='portfolio.get'){
   const kind=q.input.kind
   if(kind==='service')serviceGets++
   if(kind==='service'&&mode.startsWith('retired')&&!held){held=true;await gate}
   if(!held&&(mode==='saved_line_retired'&&kind==='line'||mode==='saved_service_retired'&&kind==='service'&&serviceGets===2)){held=true;await gate}
   if((mode==='service_denied'&&kind==='service'||mode==='contract_denied'&&kind==='contract')&&!failed){failed=true;await route.fulfill({status:403,json:{ok:false,error:'access_denied'}});return}
   let record=kind==='line'?lineRecord:kind==='service'?serviceRecord:contractRecord
   if((mode==='service_foreign'&&kind==='service'||mode==='contract_foreign'&&kind==='contract')&&!failed){failed=true;record={...record,customer_id:foreign}}
   await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind,record}}});return
  }
  if(q.operation==='service.list'){
   const {status_effective_on,...row}=serviceRecord;void status_effective_on
   await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[row],next_id:null}}});return
  }
  if(q.operation==='line.list'){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  commands.push(q.operation);await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=line-parent-lifetime')
  await page.getByRole('button',{name:'Nueva línea manual',exact:true}).click()
  const dialog=page.getByRole('dialog',{name:'Nueva línea del cliente',exact:true}),select=dialog.getByRole('combobox',{name:'Servicio de la nueva línea',exact:true})
  await expect(select).toBeEnabled();await select.selectOption(service)
  await dialog.getByRole('button',{name:'Continuar con el servicio',exact:true}).click()
  if(mode.startsWith('retired')){
   await expect.poll(()=>held).toBe(true)
   const name=mode==='retired_company'?'Cambiar empresa sintética':mode==='retired_actor'?'Cambiar actor sintético':mode==='retired_reader'?'Cambiar a lector sintético':'Cerrar inventario sintético'
   // Synthetic scope controls sit behind the modal; exercise the scope event, not a background pointer gesture.
   await page.getByRole('button',{name,exact:true}).dispatchEvent('click');await expect(dialog).toHaveCount(0)
   const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='portfolio.get'&&r.request().postDataJSON()?.input.kind==='service')
   release();await (await response).finished();await page.waitForLoadState('networkidle')
   expect(reads.filter(q=>q.operation==='portfolio.get'&&q.input.kind==='contract')).toHaveLength(0)
   await expect(page.getByRole('dialog',{name:'Registrar activo manual',exact:true})).toHaveCount(0)
  }else{
   if(mode!=='current'&&!mode.startsWith('saved_')){
    await expect(dialog.getByRole('alert')).toHaveText(mode.endsWith('denied')?'No tienes permiso para esta acción.':'El registro ya no está disponible.')
    if(mode==='service_denied'||mode==='service_foreign')expect(reads.filter(q=>q.operation==='portfolio.get'&&q.input.kind==='contract')).toHaveLength(0)
    await dialog.getByRole('button',{name:'Continuar con el servicio',exact:true}).click()
   }
   const prepared=page.getByRole('dialog',{name:'Registrar activo manual',exact:true})
   await expect(prepared).toBeVisible();await expect(prepared.getByLabel('Nombre del nuevo activo')).toBeEnabled()
   await expect(prepared).toContainText('Servicio sintético autorizado')
   expect(reads.filter(q=>q.operation==='portfolio.get').every(q=>q.input.kind==='service'?q.input.id===service:q.input.kind==='contract'&&q.input.id===contract)).toBe(true)
   if(mode.startsWith('saved_')){
    await prepared.getByLabel('Nombre del nuevo activo').fill(lineRecord.display_name)
    await prepared.getByRole('button',{name:'Guardar activo manual',exact:true}).click()
    if(mode==='saved_current'){
     await expect(page.getByRole('status')).toContainText('Línea manual registrada: '+lineRecord.display_name)
     await expect(page.getByRole('link',{name:'Ver línea registrada',exact:true})).toHaveAttribute('href','/portfolio?kind=line&id='+line)
     expect(serviceGets).toBe(2);expect(reads.filter(q=>q.operation==='portfolio.get'&&q.input.kind==='contract')).toHaveLength(2)
    }else{
     await expect.poll(()=>held).toBe(true)
     await page.getByRole('button',{name:'Cambiar empresa sintética',exact:true}).dispatchEvent('click')
     await expect(prepared).toHaveCount(0)
     const kind=mode==='saved_line_retired'?'line':'service',response=page.waitForResponse(r=>r.request().postDataJSON()?.operation==='portfolio.get'&&r.request().postDataJSON()?.input.kind===kind)
     release();await (await response).finished();await page.waitForLoadState('networkidle')
     expect(serviceGets).toBe(mode==='saved_line_retired'?1:2)
     expect(reads.filter(q=>q.operation==='portfolio.get'&&q.input.kind==='contract')).toHaveLength(1)
     await expect(page.getByText('Línea manual registrada:',{exact:false})).toHaveCount(0)
    }
   }
  }
  expect(commands).toEqual(mode.startsWith('saved_')?['line.create_manual']:[]);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:info.outputPath('line-parent-'+mode+'-'+width+'.png')})
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({mode,width,held,reads,commands,errors},null,2));await page.unrouteAll({behavior:'wait'});await page.close();await fixture.close()}
})
