import {expect,test} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {startCommercialResourceFixture} from './fixtures/commercial-resource-server.cjs'
const widths=[390,768,1440],modes=['company','actor','reader','reference','current'] as const
for(const flow of ['create','activate'] as const)for(const mode of modes)for(const width of widths)test('portfolio command read '+flow+' '+mode+' at '+width,async({page},info)=>{
 const fixture=await startCommercialResourceFixture(),parent='60000000-0000-4000-8000-000000000001',created='70000000-0000-4000-8000-000000000001',customer='10000000-0000-4000-8000-000000000001',operator='20000000-0000-4000-8000-000000000001'
 const reads:{operation:string;input:Record<string,unknown>}[]=[],commands:{operation:string;input:Record<string,unknown>}[]=[],errors:string[]=[]
 let held=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve})
 const target=flow==='create'?created:parent,operation=flow==='create'?'service.create_manual':'contract.activate'
 const contract={id:parent,version:1,status:'draft',source:'manual',customer_id:customer,operator_id:operator,plan_version_id:null,start_date:'2026-10-01',signed_date:'2026-10-01',end_date:null,assigned_user_id:null}
 const service={id:created,version:1,status:'pending',source:'manual',customer_id:customer,contract_id:parent,operator_id:operator,plan_version_id:null,service_kind:'mobile',display_name:'Servicio sintético vigente',activated_on:null,ended_on:null,status_effective_on:null}
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const q=route.request().postDataJSON()
  if(q.operation===operation){commands.push(q);held=true;await gate;await route.fulfill({json:{ok:true,receipt:{contract_version:'portfolio.v1',operation,command_id:q.input.command_id,id:target,version:flow==='create'?1:2,status:flow==='create'?'pending':'active',source:'manual'}}});return}
  if(q.operation==='portfolio.get'){reads.push(q);await route.fulfill({json:{ok:true,data:{contract_version:'portfolio.v1',kind:q.input.kind,record:q.input.id===created?service:{...contract,id:q.input.id,...(commands.length&&mode==='current'?{version:2,status:'active'}:{})}}}});return}
  if(['customer.list','contract.list','service.list','line.list','assignee.list'].includes(q.operation)){await route.fulfill({json:{ok:true,data:{contract_version:'telecom.collections.v1',operation:q.operation,items:[],next_id:null}}});return}
  await route.fulfill({status:403,json:{ok:false,error:'access_denied'}})
 })
 let before=0,after=0
 try{
  await page.setViewportSize({width,height:960});await page.goto(fixture.url+'/?kind=portfolio&reset_scope=1&portfolio_reference='+parent+'&portfolio_kind=contract')
  const drawer=page.getByRole('dialog',{name:'Contrato: Contrato',exact:true});await expect(drawer).toBeVisible()
  if(flow==='create'){await drawer.getByRole('button',{name:'Cerrar panel',exact:true}).click();await page.locator('article[data-portfolio-id="'+parent+'"]').getByRole('button',{name:'Añadir servicio o plazo',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Registrar activo manual',exact:true});await dialog.getByLabel('Nombre del nuevo activo',{exact:true}).fill(service.display_name);await dialog.getByRole('button',{name:'Guardar activo manual',exact:true}).click()}
  else{await drawer.getByRole('button',{name:'Activar contrato',exact:true}).click();await page.getByRole('dialog',{name:'Confirmar cambio de cartera',exact:true}).getByRole('button',{name:'Confirmar',exact:true}).click()}
  await expect.poll(()=>held).toBe(true)
  if(mode!=='current'){
   const label=mode==='company'?'Cambiar empresa sintética':mode==='actor'?'Cambiar actor sintético':mode==='reader'?'Cambiar a lector sintético':'Cambiar referencia sintética'
   await page.getByRole('button',{name:label,exact:true}).dispatchEvent('click');await expect(page.getByRole('dialog',{name:'Confirmar cambio de cartera',exact:true})).toHaveCount(0);await expect(page.getByRole('dialog',{name:'Registrar activo manual',exact:true})).toHaveCount(0);await expect(drawer).toBeVisible()
  }
  before=reads.filter(q=>q.input.id===target).length
  const response=page.waitForResponse(r=>r.request().postDataJSON()?.operation===operation);release();await (await response).finished();await page.waitForLoadState('networkidle')
  after=reads.filter(q=>q.input.id===target).length
  expect(after-before).toBe(mode==='current'?1:0);expect(commands).toHaveLength(1);expect(commands[0].operation).toBe(operation)
  if(flow==='create'){expect(commands[0].input.contract_id).toBe(parent);expect(commands[0].input.display_name).toBe(service.display_name)}
  else{expect(commands[0].input.id).toBe(parent);expect(commands[0].input.expected_version).toBe(1)}
  if(mode==='current'){await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('article[data-portfolio-id="'+target+'"]')).toBeVisible()}
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath('portfolio-command-'+flow+'-'+mode+'-'+width+'.png')})
 }finally{release();await writeFile(info.outputPath('observations.json'),JSON.stringify({flow,mode,width,reads,commands,before,after,errors},null,2));await page.close();await fixture.close()}
})
